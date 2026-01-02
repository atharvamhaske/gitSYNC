/**
 * LeetCode Parsing Utilities
 * Extract problem information from LeetCode pages
 */

// Language to file extension mapping
export const LANGUAGE_EXTENSIONS = {
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

/**
 * Get file extension for a language
 * @param {string} language - Programming language
 * @returns {string} - File extension
 */
export const getExtension = (language) => {
  const normalizedLang = language.toLowerCase().trim();
  return LANGUAGE_EXTENSIONS[normalizedLang] || normalizedLang;
};

/**
 * Extract problem name from URL
 * @param {string} url - LeetCode problem URL
 * @returns {string} - Problem name
 */
export const extractProblemNameFromUrl = (url) => {
  const match = url.match(/\/problems\/([^\/]+)/);
  if (match) {
    // Convert slug to title case
    return match[1]
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return 'Unknown Problem';
};

/**
 * Extract problem slug from URL
 * @param {string} url - LeetCode problem URL
 * @returns {string} - Problem slug
 */
export const extractProblemSlug = (url) => {
  const match = url.match(/\/problems\/([^\/]+)/);
  return match ? match[1] : '';
};

/**
 * Parse difficulty from LeetCode page
 * @param {Document} doc - Document object
 * @returns {string} - Difficulty level (Easy, Medium, Hard)
 */
export const parseDifficulty = (doc) => {
  // Try multiple selectors as LeetCode's DOM changes
  const selectors = [
    '[class*="difficulty"]',
    '[data-difficulty]',
    '.css-10o4wqw', // Common LeetCode class
    'div[class*="text-difficulty"]'
  ];
  
  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    if (element) {
      const text = element.textContent.toLowerCase();
      if (text.includes('easy')) return 'Easy';
      if (text.includes('medium')) return 'Medium';
      if (text.includes('hard')) return 'Hard';
    }
  }
  
  // Fallback: check page content
  const bodyText = doc.body.textContent.toLowerCase();
  if (bodyText.includes('difficulty') || bodyText.includes('easy') || bodyText.includes('medium') || bodyText.includes('hard')) {
    // Look for difficulty badge patterns
    const difficultyMatch = bodyText.match(/(easy|medium|hard)/i);
    if (difficultyMatch) {
      const diff = difficultyMatch[1].toLowerCase();
      return diff.charAt(0).toUpperCase() + diff.slice(1);
    }
  }
  
  return 'Medium'; // Default fallback
};

/**
 * Parse problem title from LeetCode page
 * @param {Document} doc - Document object
 * @returns {string} - Problem title
 */
export const parseTitle = (doc) => {
  // Try multiple selectors
  const selectors = [
    '[data-cy="question-title"]',
    'div[class*="title"]',
    'h4[class*="title"]',
    '.css-v3d350'
  ];
  
  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    if (element && element.textContent.trim()) {
      // Remove problem number prefix if present
      return element.textContent.trim().replace(/^\d+\.\s*/, '');
    }
  }
  
  // Fallback to URL
  return extractProblemNameFromUrl(window.location.href);
};

/**
 * Get current language from LeetCode editor
 * @param {Document} doc - Document object
 * @returns {string} - Programming language
 */
export const getCurrentLanguage = (doc) => {
  // Try to find language selector
  const selectors = [
    '[class*="language-selector"]',
    'button[class*="lang"]',
    '[data-cy="lang-select"]'
  ];
  
  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    if (element && element.textContent.trim()) {
      return element.textContent.trim().toLowerCase();
    }
  }
  
  return 'javascript'; // Default fallback
};

/**
 * Get code from LeetCode editor
 * @param {Document} doc - Document object
 * @returns {string} - Code content
 */
export const getEditorCode = (doc) => {
  // Monaco editor (new LeetCode)
  const monacoLines = doc.querySelectorAll('.view-lines .view-line');
  if (monacoLines.length > 0) {
    return Array.from(monacoLines)
      .map(line => line.textContent)
      .join('\n');
  }
  
  // CodeMirror (old LeetCode)
  const codeMirror = doc.querySelector('.CodeMirror');
  if (codeMirror && codeMirror.CodeMirror) {
    return codeMirror.CodeMirror.getValue();
  }
  
  // Fallback: try textarea
  const textarea = doc.querySelector('textarea[class*="code"]');
  if (textarea) {
    return textarea.value;
  }
  
  return '';
};

/**
 * Check if submission was successful
 * @param {Document} doc - Document object
 * @returns {boolean} - True if accepted
 */
export const isSubmissionAccepted = (doc) => {
  const acceptedSelectors = [
    '[class*="accepted"]',
    '[data-cy="submission-result"]',
    '.success__3Ai7',
    '[class*="success"]'
  ];
  
  for (const selector of acceptedSelectors) {
    const element = doc.querySelector(selector);
    if (element) {
      const text = element.textContent.toLowerCase();
      if (text.includes('accepted') || text.includes('success')) {
        return true;
      }
    }
  }
  
  return false;
};
