import React, { useState, useEffect } from 'react';
import Button from '../Button';
import { setStorageData } from '../../utils/storage';
import { validateGitHubToken, OAUTH_URL } from '../../utils/github';

function StepOne({ onComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Listen for OAuth callback message
    const handleMessage = async (event) => {
      if (event.data?.type === 'GITHUB_AUTH_SUCCESS' && event.data?.token) {
        setLoading(true);
        setError(null);
        
        try {
          // Validate the received token
          await validateGitHubToken(event.data.token);
          await setStorageData({ githubToken: event.data.token });
          onComplete(event.data.token);
        } catch (err) {
          console.error('Token validation error:', err);
          setError(err.message || 'Failed to validate token. Please try again.');
        } finally {
          setLoading(false);
        }
      } else if (event.data?.type === 'GITHUB_AUTH_ERROR') {
        setError(event.data.error || 'Authorization failed. Please try again.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onComplete]);

  const handleAuthorize = () => {
    setLoading(true);
    setError(null);

    // Open OAuth popup
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      OAUTH_URL,
      'GitSync GitHub Authorization',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );

    // Check if popup was blocked
    if (!popup) {
      setError('Popup was blocked. Please allow popups for this extension.');
      setLoading(false);
      return;
    }

    // Monitor popup close
    const checkPopup = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopup);
        setLoading(false);
      }
    }, 500);
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1">
        {/* GitSync Branding */}
        <div className="flex flex-col items-center mb-6">
          <img 
            src="gitsync.png" 
            alt="GitSync" 
            className="w-16 h-16 mb-3"
          />
          <h1 className="font-heading text-2xl text-black">
            GitSync
          </h1>
        </div>

        <h2 className="font-heading text-xl text-black mb-3">
          Authorize GitHub
        </h2>
        <p className="font-body text-gray-600 text-sm leading-relaxed mb-6">
          Connect your GitHub account to enable automatic syncing of your LeetCode solutions to a repository.
        </p>

        <div className="space-y-4 mb-6">
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
