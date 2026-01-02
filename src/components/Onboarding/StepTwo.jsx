import React, { useState } from 'react';
import Button from '../Button';
import Footer from '../Footer';
import { setStorageData } from '../../utils/storage';
import { validateAndSetupRepo } from '../../utils/github';

function StepTwo({ githubToken, onComplete }) {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSync = async () => {
    if (!repoUrl.trim()) {
      setError('Please enter a repository URL');
      return;
    }

    // Validate GitHub repo URL format
    const repoPattern = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/;
    if (!repoPattern.test(repoUrl.trim())) {
      setError('Please enter a valid GitHub repository URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Validate repo access and setup folder structure
      await validateAndSetupRepo(githubToken, repoUrl.trim());
      
      await setStorageData({
        repoUrl: repoUrl.trim(),
        onboardingComplete: true
      });
      
      onComplete();
    } catch (err) {
      console.error('Repo setup error:', err);
      setError(err.message || 'Failed to sync repository. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1">
        <h1 className="font-heading text-3xl text-black mb-3">
          Link Repository
        </h1>
        <p className="font-body text-gray-600 text-sm leading-relaxed mb-6">
          Create a new GitHub repository and paste the link below. We'll set up the folder structure automatically.
        </p>

        <div className="mb-6">
          <label className="block font-body text-sm text-black mb-2">
            Repository URL
          </label>
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/username/leetcode-solutions"
            className="w-full px-4 py-3 border border-gray-300 font-body text-sm focus:outline-none focus:border-black transition-colors"
          />
        </div>

        <div className="bg-gray-50 p-4 border border-gray-100">
          <p className="font-body text-xs text-gray-600 mb-2">
            Repository structure:
          </p>
          <div className="font-body text-xs text-gray-800 space-y-1">
            <p>📁 easy/</p>
            <p>📁 medium/</p>
            <p>📁 hard/</p>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 font-body">{error}</p>
        )}
      </div>

      <div className="mt-8">
        <Button onClick={handleSync} disabled={loading || !repoUrl.trim()}>
          {loading ? 'Setting up...' : 'Sync this repo'}
        </Button>
        
        <Footer />
      </div>
    </div>
  );
}

export default StepTwo;
