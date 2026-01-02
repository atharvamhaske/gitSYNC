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
let lastSyncedSubmission = null;

/**
 * Initialize the content script
 */
function init() {
  console.log('GitSync: Content script loaded on LeetCode');
  
  // Watch for submission results
  observeSubmissions();
  
  // Also check periodically for accepted submissions
  setInterval(checkForAcceptedSubmission, 2000);
}

/**
 * Observe DOM changes for submission results
 */
function observeSubmissions() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        checkForAcceptedSubmission();
      }
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * Check if there's an accepted submission on the page
 */
function checkForAcceptedSubmission() {
  // Look for "Accepted" result
  const acceptedSelectors = [
    '[data-e2e-locator="submission-result"]',
    '[class*="success"]',
    '[class*="accepted"]',
    '.text-green-s',
    'span[class*="text-green"]'
  ];
  
  for (const selector of acceptedSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const text = element.textContent.toLowerCase();
      if (text.includes('accepted')) {
        handleAcceptedSubmission();
        return;
      }
    }
  }
}

/**
 * Handle an accepted submission
 */
async function handleAcceptedSubmission() {
  // Get problem info
  const problemInfo = getProblemInfo();
  
  if (!problemInfo) {
    console.log('GitSync: Could not extract problem info');
    return;
  }
  
  // Create unique submission ID
  const submissionId = `${problemInfo.name}-${problemInfo.language}-${Date.now()}`;
  
  // Check if we've already synced this
  if (lastSyncedSubmission === submissionId) {
    return;
  }
  
  // Check if onboarding is complete
  const isOnboarded = await checkOnboarding();
  if (!isOnboarded) {
    console.log('GitSync: Onboarding not complete, skipping sync');
    return;
  }
  
  console.log('GitSync: Detected accepted submission:', problemInfo);
  
  // Mark as synced
  lastSyncedSubmission = submissionId;
  
  // Send to background script for syncing
  chrome.runtime.sendMessage({
    type: 'SYNC_SOLUTION',
    problem: problemInfo
  }, (response) => {
    if (response && response.success) {
      console.log('GitSync: Successfully synced to GitHub');
      showNotification('Solution synced to GitHub!', 'success');
    } else {
      console.error('GitSync: Failed to sync:', response?.error);
      showNotification('Failed to sync: ' + (response?.error || 'Unknown error'), 'error');
      // Reset so user can try again
      lastSyncedSubmission = null;
    }
  });
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
  // Try to get from title element
  const titleSelectors = [
    '[data-cy="question-title"]',
    'a[href*="/problems/"] span',
    'div[class*="title"]',
    'h4'
  ];
  
  for (const selector of titleSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.textContent.trim();
      // Remove problem number prefix
      const cleaned = text.replace(/^\d+\.\s*/, '');
      if (cleaned && cleaned.length > 0 && cleaned.length < 100) {
        return cleaned;
      }
    }
  }
  
  // Fallback: extract from URL
  const match = window.location.pathname.match(/\/problems\/([^\/]+)/);
  if (match) {
    return match[1]
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
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
