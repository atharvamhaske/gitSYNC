import React from 'react';

function App() {
  const chromeStoreUrl = '#'; // Update after publishing
  const githubRepoUrl = 'https://github.com/atharvamhaske/git-sync';

  const steps = [
    { num: 1, text: 'Install Extension' },
    { num: 2, text: 'Connect GitHub' },
    { num: 3, text: 'Select Repository' },
    { num: 4, text: 'Solve & Sync' },
  ];

  const features = [
    { icon: '⚡', title: 'Automatic Sync', desc: 'Solutions are pushed instantly when you submit on LeetCode' },
    { icon: '📁', title: 'Organized', desc: 'Files sorted by difficulty: easy/, medium/, hard/' },
    { icon: '🔒', title: 'Secure', desc: 'OAuth authentication. Your token stays in your browser' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
        <a href="/" className="flex items-center gap-3">
          <img src="/gitsync.png" alt="GitSync" className="w-9 h-9" />
          <span className="font-heading text-xl font-semibold">GitSync</span>
        </a>
        <a 
          href={githubRepoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-500 hover:text-black transition-colors"
        >
          GitHub
        </a>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <img src="/gitsync.png" alt="GitSync" className="w-20 h-20 mb-8" />
        
        <h1 className="font-heading text-5xl font-bold tracking-tight mb-4">
          Sync LeetCode to GitHub
        </h1>
        
        <p className="text-lg text-gray-500 max-w-md leading-relaxed mb-12">
          Automatically push your LeetCode solutions to GitHub. Build your coding portfolio effortlessly.
        </p>

        {/* Flow Steps */}
        <div className="flex items-center gap-4 mb-12 flex-wrap justify-center">
          {steps.map((step, i) => (
            <React.Fragment key={step.num}>
              <div className="flex items-center gap-2.5 px-5 py-3 bg-gray-50 rounded-full">
                <span className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-semibold">
                  {step.num}
                </span>
                <span className="text-sm text-gray-700">{step.text}</span>
              </div>
              {i < steps.length - 1 && (
                <span className="text-gray-300 text-xl hidden sm:block">→</span>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex gap-4 flex-wrap justify-center">
          <a
            href={chromeStoreUrl}
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

        {/* Features */}
        <div className="flex gap-12 mt-20 flex-wrap justify-center">
          {features.map((feature) => (
            <div key={feature.title} className="text-center max-w-[200px]">
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl">
                {feature.icon}
              </div>
              <h3 className="font-heading font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-gray-400">
        <p>
          Made by{' '}
          <a href="https://x.com/AtharvaXDevs" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-black">
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
