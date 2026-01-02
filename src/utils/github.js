/**
 * GitHub API Utilities
 * Handles OAuth and repository operations
 */

const GITHUB_API_BASE = 'https://api.github.com';

// GitHub OAuth configuration
// Users need to create their own OAuth App at https://github.com/settings/developers
const CLIENT_ID = 'YOUR_GITHUB_CLIENT_ID';

/**
 * Initiate GitHub OAuth flow
 * @returns {Promise<string>} - Access token
 */
export const initiateGitHubOAuth = () => {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.identity) {
      // Use Chrome Identity API for OAuth
      const redirectUrl = chrome.identity.getRedirectURL();
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=repo`;
      
      chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive: true },
        (responseUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (responseUrl) {
            // Extract code from response URL
            const url = new URL(responseUrl);
            const code = url.searchParams.get('code');
            
            if (code) {
              // Exchange code for token via background script
              chrome.runtime.sendMessage(
                { type: 'EXCHANGE_CODE', code },
                (response) => {
                  if (response && response.token) {
                    resolve(response.token);
                  } else {
                    reject(new Error('Failed to exchange code for token'));
                  }
                }
              );
            } else {
              reject(new Error('No authorization code received'));
            }
          } else {
            reject(new Error('No response URL received'));
          }
        }
      );
    } else {
      // Development fallback - prompt for personal access token
      const token = prompt('Enter your GitHub Personal Access Token (with repo scope):');
      if (token) {
        resolve(token);
      } else {
        reject(new Error('No token provided'));
      }
    }
  });
};

/**
 * Parse repository URL to extract owner and repo name
 * @param {string} repoUrl - GitHub repository URL
 * @returns {object} - { owner, repo }
 */
export const parseRepoUrl = (repoUrl) => {
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error('Invalid GitHub repository URL');
  }
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, '')
  };
};

/**
 * Validate repository access and setup folder structure
 * @param {string} token - GitHub access token
 * @param {string} repoUrl - Repository URL
 * @returns {Promise<void>}
 */
export const validateAndSetupRepo = async (token, repoUrl) => {
  const { owner, repo } = parseRepoUrl(repoUrl);
  
  // Check if repo exists and we have access
  const repoResponse = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  
  if (!repoResponse.ok) {
    if (repoResponse.status === 404) {
      throw new Error('Repository not found. Please check the URL and ensure you have access.');
    }
    throw new Error('Failed to access repository');
  }
  
  // Setup folder structure (easy, medium, hard)
  const folders = ['easy', 'medium', 'hard'];
  
  for (const folder of folders) {
    await createFolderIfNotExists(token, owner, repo, folder);
  }
};

/**
 * Create a folder in the repository if it doesn't exist
 * @param {string} token - GitHub access token
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} folder - Folder name
 */
const createFolderIfNotExists = async (token, owner, repo, folder) => {
  // Check if folder exists by trying to get its contents
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${folder}`,
    {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );
  
  if (response.status === 404) {
    // Folder doesn't exist, create it with a .gitkeep file
    await createFile(
      token,
      owner,
      repo,
      `${folder}/.gitkeep`,
      '',
      `Initialize ${folder} folder`
    );
  }
};

/**
 * Create or update a file in the repository
 * @param {string} token - GitHub access token
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File path
 * @param {string} content - File content
 * @param {string} message - Commit message
 * @returns {Promise<object>} - API response
 */
export const createFile = async (token, owner, repo, path, content, message) => {
  // Check if file exists to get SHA for update
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
    content: btoa(unescape(encodeURIComponent(content))), // Base64 encode
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
    throw new Error(error.message || 'Failed to create file');
  }
  
  return response.json();
};

/**
 * Push a LeetCode solution to the repository
 * @param {string} token - GitHub access token
 * @param {string} repoUrl - Repository URL
 * @param {object} problem - Problem data
 * @returns {Promise<object>} - API response
 */
export const pushSolution = async (token, repoUrl, problem) => {
  const { owner, repo } = parseRepoUrl(repoUrl);
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
  return createFile(token, owner, repo, filePath, code, commitMessage);
};

/**
 * Convert string to camelCase
 * @param {string} str - Input string
 * @returns {string} - camelCase string
 */
const toCamelCase = (str) => {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^./, (chr) => chr.toLowerCase())
    .replace(/[^a-zA-Z0-9]/g, '');
};
