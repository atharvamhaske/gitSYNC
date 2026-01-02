/**
 * GitHub API Utilities
 * Handles OAuth, token validation and repository operations
 */

const GITHUB_API_BASE = 'https://api.github.com';

// OAuth URL for GitHub authorization
export const OAUTH_URL = 'https://gitxsync.vercel.app/api/auth/github';

/**
 * Validate GitHub Personal Access Token
 * @param {string} token - GitHub PAT
 * @returns {Promise<object>} - User data if valid
 */
export const validateGitHubToken = async (token) => {
  const response = await fetch(`${GITHUB_API_BASE}/user`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid token. Please check your Personal Access Token.');
    }
    throw new Error('Failed to validate token. Please try again.');
  }

  const userData = await response.json();
  
  // Check if token has repo scope by trying to list repos
  const repoResponse = await fetch(`${GITHUB_API_BASE}/user/repos?per_page=1`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!repoResponse.ok) {
    throw new Error('Token missing required "repo" scope. Please create a new token with repo access.');
  }

  return userData;
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
