/**
 * Chrome Storage Utilities
 * Wrapper functions for chrome.storage.local API
 */

/**
 * Get data from Chrome storage
 * @param {string|string[]} keys - Key(s) to retrieve
 * @returns {Promise<object>} - Storage data
 */
export const getStorageData = (keys) => {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    } else {
      // Fallback for development/testing
      const result = {};
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            result[key] = JSON.parse(value);
          } catch {
            result[key] = value;
          }
        }
      });
      resolve(result);
    }
  });
};

/**
 * Set data in Chrome storage
 * @param {object} data - Data to store
 * @returns {Promise<void>}
 */
export const setStorageData = (data) => {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    } else {
      // Fallback for development/testing
      Object.entries(data).forEach(([key, value]) => {
        if (value === null) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(value));
        }
      });
      resolve();
    }
  });
};

/**
 * Remove data from Chrome storage
 * @param {string|string[]} keys - Key(s) to remove
 * @returns {Promise<void>}
 */
export const removeStorageData = (keys) => {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove(keys, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    } else {
      // Fallback for development/testing
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach(key => localStorage.removeItem(key));
      resolve();
    }
  });
};

/**
 * Add a synced problem to storage
 * @param {object} problem - Problem data
 * @returns {Promise<void>}
 */
export const addSyncedProblem = async (problem) => {
  const data = await getStorageData(['syncedProblems']);
  const problems = data.syncedProblems || [];
  
  // Check if problem already exists
  const existingIndex = problems.findIndex(p => 
    p.name === problem.name && p.language === problem.language
  );
  
  if (existingIndex >= 0) {
    // Update existing
    problems[existingIndex] = { ...problem, syncedAt: Date.now() };
  } else {
    // Add new
    problems.unshift({ ...problem, syncedAt: Date.now() });
  }
  
  // Keep only last 100 problems
  const trimmedProblems = problems.slice(0, 100);
  
  await setStorageData({ syncedProblems: trimmedProblems });
};
