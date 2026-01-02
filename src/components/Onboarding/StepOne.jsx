import React, { useState } from 'react';
import Button from '../Button';
import { setStorageData } from '../../utils/storage';
import { initiateGitHubOAuth } from '../../utils/github';

function StepOne({ onComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAuthorize = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await initiateGitHubOAuth();
      await setStorageData({ githubToken: token });
      onComplete(token);
    } catch (err) {
      console.error('OAuth error:', err);
      setError('Failed to authorize with GitHub. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1">
        <h1 className="font-heading text-3xl text-black mb-3">
          Authorize GitHub
        </h1>
        <p className="font-body text-gray-600 text-sm leading-relaxed mb-8">
          Connect your GitHub account to enable automatic syncing of your LeetCode solutions to a repository.
        </p>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs">✓</span>
            </div>
            <p className="font-body text-sm text-gray-700">
              Secure OAuth authentication
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs">✓</span>
            </div>
            <p className="font-body text-sm text-gray-700">
              Only repository access required
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs">✓</span>
            </div>
            <p className="font-body text-sm text-gray-700">
              Revoke access anytime from GitHub
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 font-body">{error}</p>
        )}
      </div>

      <div className="mt-8">
        <Button onClick={handleAuthorize} disabled={loading}>
          {loading ? 'Authorizing...' : 'Authorize GitHub'}
        </Button>
      </div>
    </div>
  );
}

export default StepOne;
