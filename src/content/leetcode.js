/**
 * GitSync Content Script for LeetCode
 * Detects successful submissions and syncs to GitHub
 */

// Language to file extension mapping
const LANGUAGE_EXTENSIONS = {
  'javascript': 'js',
  'typescript': 'ts',
  'python': 'py',
  'python3': 'py',
  'java': 'java',
  'c++': 'cpp',
  'c': 'c',
  'c#': 'cs',
  'ruby': 'rb',
  'swift': 'swift',
  'go': 'go',
  'golang': 'go',
  'scala': 'scala',
  'kotlin': 'kt',
  'rust': 'rs',
  'php': 'php',
  'dart': 'dart',
  'racket': 'rkt',
  'erlang': 'erl',
  'elixir': 'ex',
  'mysql': 'sql',
  'mssql': 'sql',
  'oracle': 'sql',
  'postgresql': 'sql'
};

// Track if we've already synced this submission
let lastSyncedSubmissionHash = null;
let isProcessing = false; // Prevent concurrent processing
let syncCheckTimeout = null; // Debounce check calls
let pageLoadTime = Date.now(); // Track when page was loaded
let syncedSubmissionsCache = null; // Cache of synced submissions

/**
 * Initialize the content script
 */
async function init() {
  console.log('GitSync: Content script loaded on LeetCode');
  pageLoadTime = Date.now();
  
  // Load synced submissions cache on page load
  await loadSyncedSubmissionsCache();
  
  // Watch for submission results
  observeSubmissions();
  
  // Don't check periodically - only trigger on DOM changes (new submissions)
  // Removed setInterval to prevent syncing when just viewing old problems
}

/**
 * Observe DOM changes for submission results
 */
function observeSubmissions() {
  const observer = new MutationObserver((mutations) => {
    // Only check if mutations suggest a new submission result appeared
    let hasNewSubmissionResult = false;
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if added nodes contain submission result indicators
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) { // Element node
            const text = node.textContent?.toLowerCase() || '';
            if (text.includes('accepted') || 
                node.querySelector('[data-e2e-locator="submission-result"]') ||
                node.querySelector('[class*="submission-result"]')) {
              hasNewSubmissionResult = true;
              // Reset page load time when new submission appears
              pageLoadTime = Date.now();
              break;
            }
          }
        }
        if (hasNewSubmissionResult) break;
      }
    }
    
    // Only check if we detected a new submission result
    if (hasNewSubmissionResult) {
      // Debounce checks to avoid excessive calls
      if (syncCheckTimeout) {
        clearTimeout(syncCheckTimeout);
      }
      syncCheckTimeout = setTimeout(() => {
        checkForAcceptedSubmission();
      }, 2000); // Wait 2 seconds after submission result appears
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * Load synced submissions cache from Chrome storage
 */
async function loadSyncedSubmissionsCache() {
  try {
    const data = await new Promise((resolve) => {
      chrome.storage.local.get(['syncedSubmissions'], (data) => {
        resolve(data.syncedSubmissions || {});
      });
    });
    syncedSubmissionsCache = data;
    console.log('GitSync: Loaded', Object.keys(syncedSubmissionsCache).length, 'synced submissions from cache');
  } catch (e) {
    console.log('GitSync: Could not load synced submissions cache:', e);
    syncedSubmissionsCache = {};
  }
}

/**
 * Check if there's an accepted submission on the page
 * Only triggers for NEW submissions, not when viewing old problems
 */
function checkForAcceptedSubmission() {
  // Don't check if already processing
  if (isProcessing) {
    return;
  }
  
  // Only check for NEW submissions (within 30 seconds of page load or DOM change)
  // This prevents syncing when just viewing an already-solved problem
  const timeSincePageLoad = Date.now() - pageLoadTime;
  if (timeSincePageLoad > 30000) {
    // Page has been loaded for more than 30 seconds - likely just viewing, not submitting
    return;
  }
  
  // Look for "Accepted" result in submission result panel (new submissions)
  // Be very specific to only catch NEW submission results
  const submissionResultSelectors = [
    '[data-e2e-locator="submission-result"]',
    'div[class*="submission-result"]',
    'div[class*="result-container"]'
  ];
  
  let foundNewSubmission = false;
  
  for (const selector of submissionResultSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const text = element.textContent.trim().toLowerCase();
      // Only trigger if it says "accepted" in a submission result context
      if (text.includes('accepted') && text.length < 100) {
        // Check if this is a NEW submission result (has timing info like "Runtime" or "Memory")
        const hasRuntimeInfo = text.includes('runtime') || text.includes('memory') || 
                              element.querySelector('[class*="runtime"]') || 
                              element.querySelector('[class*="memory"]');
        
        if (hasRuntimeInfo) {
          foundNewSubmission = true;
          break;
        }
      }
    }
    if (foundNewSubmission) break;
  }
  
  if (foundNewSubmission) {
    // Debounce: only trigger once per second max
    if (syncCheckTimeout) {
      clearTimeout(syncCheckTimeout);
    }
    syncCheckTimeout = setTimeout(() => {
      if (!isProcessing) {
        handleAcceptedSubmission();
      }
    }, 2000); // Wait 2 seconds to ensure submission result is fully loaded
  }
}

/**
 * Handle an accepted submission
 */
async function handleAcceptedSubmission() {
  // Prevent concurrent processing
  if (isProcessing) {
    return;
  }
  
  // Get problem info
  const problemInfo = getProblemInfo();
  
  if (!problemInfo) {
    console.log('GitSync: Could not extract problem info');
    return;
  }
  
  // Validate problem name - if it's just a number or invalid, extract from URL
  if (!problemInfo.name || /^\d+$/.test(problemInfo.name) || problemInfo.name.length < 2) {
    console.warn('GitSync: Problem name is invalid:', problemInfo.name, '- extracting from URL');
    const urlName = extractNameFromUrl();
    if (urlName && urlName.length > 0) {
      problemInfo.name = urlName;
      console.log('GitSync: Updated problem name from URL:', urlName);
    } else {
      console.error('GitSync: Could not extract valid problem name, aborting sync');
      isProcessing = false;
      return;
    }
  }
  
  // Create a proper hash of the entire code to detect duplicates
  // Simple hash function for code content
  let codeHash = 0;
  for (let i = 0; i < problemInfo.code.length; i++) {
    const char = problemInfo.code.charCodeAt(i);
    codeHash = ((codeHash << 5) - codeHash) + char;
    codeHash = codeHash & codeHash; // Convert to 32-bit integer
  }
  const submissionHash = `${problemInfo.name}-${problemInfo.language}-${Math.abs(codeHash)}`;
  
  // Check if we've already synced this exact submission in this session
  if (lastSyncedSubmissionHash === submissionHash) {
    console.log('GitSync: Duplicate submission detected (same session), skipping sync');
    return;
  }
  
  // Check cached synced submissions first (faster)
  if (syncedSubmissionsCache && syncedSubmissionsCache[submissionHash]) {
    console.log('GitSync: Submission already synced (found in cache), skipping');
    lastSyncedSubmissionHash = submissionHash;
    return;
  }
  
  // Also check Chrome storage for previously synced submissions
  try {
    const syncedData = await new Promise((resolve) => {
      chrome.storage.local.get(['syncedSubmissions'], (data) => {
        resolve(data.syncedSubmissions || {});
      });
    });
    
    // Update cache
    syncedSubmissionsCache = syncedData;
    
    if (syncedData[submissionHash]) {
      console.log('GitSync: Submission already synced (found in storage), skipping');
      lastSyncedSubmissionHash = submissionHash;
      return;
    }
  } catch (e) {
    console.log('GitSync: Could not check synced submissions storage:', e);
  }
  
  // CRITICAL: Check if file already exists in GitHub before syncing
  // This prevents syncing when visiting an already-solved problem
  try {
    const onboardingData = await new Promise((resolve) => {
      chrome.storage.local.get(['githubToken', 'repoUrl', 'onboardingComplete'], (data) => {
        resolve(data);
      });
    });
    
    if (onboardingData.onboardingComplete && onboardingData.githubToken && onboardingData.repoUrl) {
      const fileExists = await checkIfFileExistsInGitHub(
        onboardingData.githubToken,
        onboardingData.repoUrl,
        problemInfo
      );
      
      if (fileExists) {
        console.log('GitSync: File already exists in GitHub, skipping sync');
        // Mark as synced in storage to prevent future checks
        lastSyncedSubmissionHash = submissionHash;
        if (!syncedSubmissionsCache) syncedSubmissionsCache = {};
        syncedSubmissionsCache[submissionHash] = Date.now();
        chrome.storage.local.set({ syncedSubmissions: syncedSubmissionsCache });
        return;
      }
    }
  } catch (e) {
    console.log('GitSync: Could not check GitHub for existing file:', e);
    // Continue with sync if check fails (better to sync than miss)
  }
  
  // Check if onboarding is complete
  const isOnboarded = await checkOnboarding();
  if (!isOnboarded) {
    console.log('GitSync: Onboarding not complete, skipping sync');
    return;
  }
  
  console.log('GitSync: Detected accepted submission:', problemInfo);
  
  // Mark as processing IMMEDIATELY to prevent concurrent calls
  isProcessing = true;
  lastSyncedSubmissionHash = submissionHash;
  
  // Store in Chrome storage immediately to prevent duplicates
  try {
    if (!syncedSubmissionsCache) syncedSubmissionsCache = {};
    syncedSubmissionsCache[submissionHash] = Date.now();
    chrome.storage.local.set({ syncedSubmissions: syncedSubmissionsCache });
  } catch (e) {
    console.log('GitSync: Could not store synced submission:', e);
  }
  
  // Send to background script for syncing
  chrome.runtime.sendMessage({
    type: 'SYNC_SOLUTION',
    problem: problemInfo
  }, (response) => {
    // Keep isProcessing true for a bit longer to prevent rapid re-triggers
    setTimeout(() => {
      isProcessing = false;
    }, 3000); // Keep processing flag for 3 seconds after sync
    
    if (response && response.success) {
      console.log('GitSync: Successfully synced to GitHub');
      showNotification('Solution synced to GitHub!', 'success');
    } else {
      console.error('GitSync: Failed to sync:', response?.error);
      // Only show error notification if it's not a SHA mismatch (file already exists)
      if (!response?.error?.includes('does not match')) {
        showNotification('Failed to sync: ' + (response?.error || 'Unknown error'), 'error');
      }
      // Don't reset lastSyncedSubmissionHash on error - submission was already marked as processed
    }
  });
}

/**
 * Check if file already exists in GitHub
 */
async function checkIfFileExistsInGitHub(token, repoUrl, problemInfo) {
  try {
    // Parse repo URL
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) return false;
    
    const owner = match[1];
    const repo = match[2].replace(/\.git$/, '');
    
    // Convert problem name to camelCase for filename
    const toCamelCase = (str) => {
      if (!str || typeof str !== 'string') return 'solution';
      str = str.trim();
      if (/^\d+$/.test(str)) return 'solution';
      return str
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
        .replace(/^./, (chr) => chr.toLowerCase())
        .replace(/[^a-zA-Z0-9]/g, '') || 'solution';
    };
    
    const fileName = toCamelCase(problemInfo.name) + '.' + problemInfo.extension;
    const folder = problemInfo.difficulty.toLowerCase();
    const filePath = `${folder}/${fileName}`;
    
    // Check if file exists via GitHub API
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    return response.ok; // File exists if response is OK
  } catch (e) {
    console.log('GitSync: Error checking GitHub file existence:', e);
    return false; // Assume doesn't exist if check fails
  }
}

/**
 * Extract problem name from URL as fallback
 */
function extractNameFromUrl() {
  const match = window.location.pathname.match(/\/problems\/([^\/]+)/);
  if (match) {
    const slug = match[1];
    // Convert slug like "two-sum" to "Two Sum"
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  return null;
}

/**
 * Check if onboarding is complete
 */
function checkOnboarding() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['onboardingComplete'], (data) => {
      resolve(data.onboardingComplete === true);
    });
  });
}

/**
 * Extract problem information from the page
 */
function getProblemInfo() {
  try {
    // Get problem name from URL or page
    const name = getProblemName();
    
    // Get difficulty
    const difficulty = getDifficulty();
    
    // Get language
    const language = getLanguage();
    
    // Get code
    const code = getCode();
    
    // Get file extension
    const extension = LANGUAGE_EXTENSIONS[language.toLowerCase()] || language.toLowerCase();
    
    if (!name || !code) {
      return null;
    }
    
    return {
      name,
      difficulty,
      language,
      code,
      extension
    };
  } catch (error) {
    console.error('GitSync: Error extracting problem info:', error);
    return null;
  }
}

/**
 * Get problem name from page
 */
function getProblemName() {
  // Try multiple selectors for the problem title
  const titleSelectors = [
    '[data-cy="question-title"]',
    'div[class*="question-title"]',
    'h1[class*="title"]',
    'h2[class*="title"]',
    'h3[class*="title"]',
    'h4[class*="title"]',
    'a[href*="/problems/"]',
    'div[class*="title"]',
    'span[class*="title"]'
  ];
  
  for (const selector of titleSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const text = element.textContent.trim();
      if (!text) continue;
      
      // Skip if it's just a number
      if (/^\d+$/.test(text)) continue;
      
      // Remove problem number prefix (e.g., "1. Two Sum" -> "Two Sum")
      let cleaned = text.replace(/^\d+\.\s*/, '');
      
      // Remove any trailing problem number (e.g., "Two Sum 1" -> "Two Sum")
      cleaned = cleaned.replace(/\s+\d+$/, '');
      
      // Skip if it's still just a number or too short
      if (/^\d+$/.test(cleaned) || cleaned.length < 2) continue;
      
      // Skip if it looks like a URL or path
      if (cleaned.includes('/') || cleaned.includes('http')) continue;
      
      // Valid problem name should have at least one letter
      if (!/[a-zA-Z]/.test(cleaned)) continue;
      
      if (cleaned.length > 0 && cleaned.length < 100) {
        console.log('GitSync: Extracted problem name:', cleaned);
        return cleaned;
      }
    }
  }
  
  // Fallback: extract from URL slug and convert to title case
  const match = window.location.pathname.match(/\/problems\/([^\/]+)/);
  if (match) {
    const slug = match[1];
    // Convert slug like "two-sum" to "Two Sum"
    const name = slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    console.log('GitSync: Extracted problem name from URL:', name);
    return name;
  }
  
  console.error('GitSync: Could not extract problem name');
  return null;
}

/**
 * Get difficulty from page
 */
function getDifficulty() {
  // Look for difficulty badge
  const difficultySelectors = [
    '[class*="difficulty"]',
    '[class*="text-olive"]', // Easy
    '[class*="text-yellow"]', // Medium  
    '[class*="text-pink"]', // Hard
    '[class*="text-green"]', // Easy
    '[class*="text-orange"]' // Medium
  ];
  
  for (const selector of difficultySelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.textContent.toLowerCase();
      if (text.includes('easy')) return 'Easy';
      if (text.includes('medium')) return 'Medium';
      if (text.includes('hard')) return 'Hard';
    }
  }
  
  // Try to find by color classes
  const easyElement = document.querySelector('[class*="text-olive"], [class*="easy"]');
  if (easyElement) return 'Easy';
  
  const mediumElement = document.querySelector('[class*="text-yellow"], [class*="medium"]');
  if (mediumElement) return 'Medium';
  
  const hardElement = document.querySelector('[class*="text-pink"], [class*="hard"]');
  if (hardElement) return 'Hard';
  
  // Default to Medium if can't determine
  return 'Medium';
}

/**
 * Get current language from editor
 */
function getLanguage() {
  // Try language selector button
  const langSelectors = [
    'button[id*="lang"]',
    '[class*="lang-select"]',
    'button[class*="rounded"][class*="flex"]'
  ];
  
  for (const selector of langSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const text = element.textContent.toLowerCase().trim();
      if (LANGUAGE_EXTENSIONS[text]) {
        return text;
      }
    }
  }
  
  // Try to detect from code content
  const code = getCode();
  if (code) {
    if (code.includes('func ') && code.includes('package')) return 'go';
    if (code.includes('def ') && code.includes(':')) return 'python3';
    if (code.includes('public class') || code.includes('class Solution')) return 'java';
    if (code.includes('function') || code.includes('=>')) return 'javascript';
    if (code.includes('fn ') && code.includes('impl')) return 'rust';
    if (code.includes('#include')) return 'c++';
  }
  
  return 'javascript';
}

/**
 * Get code from editor
 */
function getCode() {
  // Monaco editor (new LeetCode UI)
  const monacoEditor = document.querySelector('[class*="monaco-editor"]');
  if (monacoEditor) {
    const lines = monacoEditor.querySelectorAll('.view-line');
    if (lines.length > 0) {
      return Array.from(lines)
        .map(line => line.textContent)
        .join('\n');
    }
  }
  
  // Try to get from view-lines container
  const viewLines = document.querySelectorAll('.view-lines .view-line');
  if (viewLines.length > 0) {
    return Array.from(viewLines)
      .map(line => line.textContent)
      .join('\n');
  }
  
  // CodeMirror (old UI)
  const codeMirror = document.querySelector('.CodeMirror');
  if (codeMirror && codeMirror.CodeMirror) {
    return codeMirror.CodeMirror.getValue();
  }
  
  // Fallback: try textarea
  const textarea = document.querySelector('textarea');
  if (textarea && textarea.value) {
    return textarea.value;
  }
  
  return '';
}

/**
 * Show a notification on the page
 */
function showNotification(message, type = 'info') {
  // Remove existing notification
  const existing = document.getElementById('gitsync-notification');
  if (existing) {
    existing.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'gitsync-notification';
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#000' : '#dc2626'};
    color: #fff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    border-radius: 4px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  
  // Add animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(notification);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
