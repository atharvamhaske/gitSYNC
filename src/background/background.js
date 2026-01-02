/**
 * GitSync Background Service Worker
 * Handles sync operations
 */

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Listen for messages from popup and content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNC_SOLUTION') {
    syncSolution(message.problem)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (message.type === 'GET_PROBLEM_INFO') {
    // Fetch problem info from LeetCode GraphQL API
    fetchProblemInfo(message.slug)
      .then(info => sendResponse({ success: true, info }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

/**
 * Sync a LeetCode solution to GitHub
 * @param {object} problem - Problem data
 * @returns {Promise<object>} - Sync result
 */
async function syncSolution(problem) {
  // Get stored credentials
  const data = await chrome.storage.local.get(['githubToken', 'repoUrl']);
  
  if (!data.githubToken || !data.repoUrl) {
    throw new Error('Not authenticated. Please complete onboarding.');
  }
  
  const { owner, repo } = parseRepoUrl(data.repoUrl);
  const { name, difficulty, language, code, extension } = problem;
  
  // Convert problem name to camelCase
  const fileName = toCamelCase(name) + '.' + extension;
  
  // Determine folder based on difficulty
  const folder = difficulty.toLowerCase();
  
  // Create file path
  const filePath = `${folder}/${fileName}`;
  
  // Create commit message
  const commitMessage = `Add ${name} (${difficulty}) - ${language}`;
  
  // Push to GitHub
  const result = await createOrUpdateFile(
    data.githubToken,
    owner,
    repo,
    filePath,
    code,
    commitMessage
  );
  
  // Store synced problem
  await addSyncedProblem(problem);
  
  // Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'GitSync',
    message: `Synced: ${name} to ${folder}/`
  });
  
  return result;
}

/**
 * Create or update a file in GitHub repository
 */
async function createOrUpdateFile(token, owner, repo, path, content, message) {
  // Always fetch the latest SHA before updating
  let sha = null;
  try {
    const existingResponse = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    if (existingResponse.ok) {
      const existingData = await existingResponse.json();
      // Only get SHA if it's a file (not a directory)
      if (existingData.type === 'file' && existingData.sha) {
        sha = existingData.sha;
        console.log('GitSync: Found existing file, using SHA:', sha.substring(0, 8) + '...');
      }
    }
  } catch (e) {
    console.log('GitSync: Error checking for existing file:', e);
    // Continue without SHA - will create new file
  }
  
  // Create or update file
  const body = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    ...(sha && { sha })
  };
  
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );
  
  if (!response.ok) {
    const errorData = await response.json();
    const errorMessage = errorData.message || 'Failed to push to GitHub';
    
    // Handle SHA mismatch - fetch latest SHA and retry
    if (errorMessage.includes('does not match')) {
      console.log('GitSync: SHA mismatch detected, fetching latest SHA and retrying');
      
      try {
        // Fetch the latest SHA
        const latestResponse = await fetch(
          `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
          {
            headers: {
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        
        let latestSha = null;
        if (latestResponse.ok) {
          const latestData = await latestResponse.json();
          if (latestData.type === 'file' && latestData.sha) {
            latestSha = latestData.sha;
          }
        }
        
        // Retry with latest SHA
        const retryBody = {
          message: message + ' (updated)',
          content: btoa(unescape(encodeURIComponent(content))),
          ...(latestSha && { sha: latestSha })
        };
        
        const retryResponse = await fetch(
          `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(retryBody)
          }
        );
        
        if (!retryResponse.ok) {
          const retryError = await retryResponse.json();
          throw new Error(retryError.message || errorMessage);
        }
        
        console.log('GitSync: Successfully updated file after SHA retry');
        return retryResponse.json();
      } catch (retryError) {
        throw new Error(retryError.message || errorMessage);
      }
    }
    
    throw new Error(errorMessage);
  }
  
  return response.json();
}

/**
 * Fetch problem info from LeetCode GraphQL API
 */
async function fetchProblemInfo(slug) {
  const query = `
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        title
        difficulty
        content
      }
    }
  `;
  
  const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      variables: { titleSlug: slug }
    })
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch problem info');
  }
  
  const data = await response.json();
  return data.data.question;
}

/**
 * Parse repository URL
 */
function parseRepoUrl(repoUrl) {
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error('Invalid GitHub repository URL');
  }
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, '')
  };
}

/**
 * Convert string to camelCase for filename
 * Example: "Two Sum" -> "twoSum", "Longest Palindromic Substring" -> "longestPalindromicSubstring"
 */
function toCamelCase(str) {
  if (!str || typeof str !== 'string') {
    console.error('GitSync: Invalid string for toCamelCase:', str);
    return 'solution';
  }
  
  // Remove any leading/trailing whitespace
  str = str.trim();
  
  // If it's just a number, return a default name
  if (/^\d+$/.test(str)) {
    console.warn('GitSync: Problem name is just a number, using default');
    return 'solution';
  }
  
  // Convert to camelCase
  const camelCase = str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^./, (chr) => chr.toLowerCase())
    .replace(/[^a-zA-Z0-9]/g, '');
  
  // Ensure it's not empty
  if (!camelCase || camelCase.length === 0) {
    console.warn('GitSync: camelCase conversion resulted in empty string');
    return 'solution';
  }
  
  return camelCase;
}

/**
 * Add synced problem to storage
 */
async function addSyncedProblem(problem) {
  const data = await chrome.storage.local.get(['syncedProblems']);
  const problems = data.syncedProblems || [];
  
  const existingIndex = problems.findIndex(p => 
    p.name === problem.name && p.language === problem.language
  );
  
  if (existingIndex >= 0) {
    problems[existingIndex] = { ...problem, syncedAt: Date.now() };
  } else {
    problems.unshift({ ...problem, syncedAt: Date.now() });
  }
  
  await chrome.storage.local.set({ syncedProblems: problems.slice(0, 100) });
}

// Log when service worker starts
console.log('GitSync background service worker started');
