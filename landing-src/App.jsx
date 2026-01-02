import React from 'react';

function App() {
  const githubRepoUrl = 'https://github.com/atharvamhaske/gitSYNC';
  const downloadExtensionUrl = 'https://github.com/atharvamhaske/gitSYNC/blob/main/README.md';

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="font-heading text-5xl font-bold tracking-tight mb-4 text-black">
          Sync LeetCode to GitHub
        </h1>
        
        <h2 className="font-body text-lg text-gray-500 max-w-md leading-relaxed mb-12">
          Automatically push your LeetCode solutions to GitHub. Build your coding portfolio effortlessly.
        </h2>

        {/* CTAs */}
        <div className="flex gap-4 flex-wrap justify-center mb-20">
          <a
            href={downloadExtensionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-black text-white rounded-lg font-medium text-sm hover:bg-gray-800 transition-colors"
          >
            <ChromeIcon />
            Download Extension
          </a>
          <a
            href={githubRepoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-white text-black border border-gray-200 rounded-lg font-medium text-sm hover:border-black transition-colors"
          >
            <GitHubIcon />
            Star on GitHub
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-gray-400">
        <p>
          Made by{' '}
          <a href="https://x.com/atharvaxdevs" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-black">
            Atharva
          </a>
          {' '}with{' '}
          <a href="https://www.blackbox.ai" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-black">
            @blackboxai
          </a>
          {' · '}
          <a href="/privacy.html" className="text-gray-600 hover:text-black">
            Privacy Policy
          </a>
        </p>
      </footer>
    </div>
  );
}

function ChromeIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-3.952 6.848a12.014 12.014 0 0 0 9.229-9.006zM12 16.364a4.364 4.364 0 1 1 0-8.728 4.364 4.364 0 0 1 0 8.728z"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

export default App;
