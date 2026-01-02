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
  // Check if file exists
  let sha = null;
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
    sha = existingData.sha;
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
    const error = await response.json();
    throw new Error(error.message || 'Failed to push to GitHub');
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
 * Convert string to camelCase
 */
function toCamelCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^./, (chr) => chr.toLowerCase())
    .replace(/[^a-zA-Z0-9]/g, '');
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
