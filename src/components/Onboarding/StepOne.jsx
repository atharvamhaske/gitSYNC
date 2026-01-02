import React, { useState, useEffect, useRef } from 'react';
import Button from '../Button';
import Footer from '../Footer';
import { setStorageData, getStorageData, removeStorageData } from '../../utils/storage';
import { validateGitHubToken, OAUTH_URL } from '../../utils/github';

function StepOne({ onComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const popupRef = useRef(null);
  const popupMonitorIntervalRef = useRef(null);
  const processedRef = useRef(false);

  useEffect(() => {
    let checkInterval = null;
    processedRef.current = false;
    
    // Listen for OAuth callback message
    const handleMessage = async (event) => {
      // Accept messages from any origin (extension popups need this)
      // Log for debugging
      console.log('[GitSync] Received message:', event.data, 'from origin:', event.origin);
      
      if (event.data?.type === 'GITHUB_AUTH_SUCCESS' && event.data?.token && !processedRef.current) {
        processedRef.current = true;
        console.log('[GitSync] Processing token...');
        setLoading(true);
        setError(null);
        
        // Clear all intervals since we got the token
        if (checkInterval) {
          clearInterval(checkInterval);
          checkInterval = null;
        }
        if (popupMonitorIntervalRef.current) {
          clearInterval(popupMonitorIntervalRef.current);
          popupMonitorIntervalRef.current = null;
        }
        
        try {
          // Validate the received token
          await validateGitHubToken(event.data.token);
          await setStorageData({ githubToken: event.data.token });
          console.log('[GitSync] Token validated and stored, moving to step 2');
          
          // Reset loading state
          setLoading(false);
          
          // Ensure extension popup stays open by focusing it
          if (typeof window !== 'undefined') {
            window.focus();
          }
          
          // Call onComplete to transition to step 2
          // Use requestAnimationFrame to ensure React state updates are processed
          requestAnimationFrame(() => {
            onComplete(event.data.token);
          });
        } catch (err) {
          console.error('[GitSync] Token validation error:', err);
          setError(err.message || 'Failed to validate token. Please try again.');
          setLoading(false);
          processedRef.current = false; // Allow retry on error
        }
      } else if (event.data?.type === 'GITHUB_AUTH_ERROR') {
        console.error('[GitSync] OAuth error:', event.data.error);
        setError(event.data.error || 'Authorization failed. Please try again.');
        setLoading(false);
        if (checkInterval) {
          clearInterval(checkInterval);
          checkInterval = null;
        }
        if (popupMonitorIntervalRef.current) {
          clearInterval(popupMonitorIntervalRef.current);
          popupMonitorIntervalRef.current = null;
        }
      }
    };

    // Poll Chrome storage for OAuth token (fallback method)
    // Check if we're currently in loading state
    checkInterval = setInterval(async () => {
      const currentLoading = document.querySelector('button:disabled') !== null; // Check if button is disabled (loading state)
      if (!processedRef.current && currentLoading) {
        try {
          const data = await getStorageData(['oauth_pending_token']);
          if (data.oauth_pending_token) {
            console.log('[GitSync] Found token in storage, processing...');
            await removeStorageData(['oauth_pending_token']);
            handleMessage({
              data: { type: 'GITHUB_AUTH_SUCCESS', token: data.oauth_pending_token },
              origin: typeof chrome !== 'undefined' && chrome.runtime ? 'chrome-extension://' + chrome.runtime.id : window.location.origin
            });
          }
        } catch (e) {
          // Ignore errors
        }
      }
    }, 1000);

    // Enhanced message listener with better logging
    const messageHandler = (event) => {
      console.log('[GitSync] Message event received:', {
        type: event.data?.type,
        hasToken: !!event.data?.token,
        origin: event.origin,
        processed: processedRef.current
      });
      handleMessage(event);
    };

    window.addEventListener('message', messageHandler);
    
    // Also listen for focus events (popup might regain focus after OAuth)
    const handleFocus = () => {
      console.log('[GitSync] Window focused, checking for messages...');
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('message', messageHandler);
      window.removeEventListener('focus', handleFocus);
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      if (popupMonitorIntervalRef.current) {
        clearInterval(popupMonitorIntervalRef.current);
        popupMonitorIntervalRef.current = null;
      }
    };
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

    popupRef.current = popup;

    // Monitor popup close - but don't interfere if we've already processed the token
    let popupClosedHandled = false;
    const checkPopup = setInterval(() => {
      if (popup.closed && !popupClosedHandled) {
        popupClosedHandled = true;
        clearInterval(checkPopup);
        popupMonitorIntervalRef.current = null;
        
        // Only reset loading if we haven't received a success message
        // Give it extra time in case message is still processing
        setTimeout(() => {
          // Only reset if we're still on step 1 and haven't processed the token
          // If processedRef.current is true, we've already moved to step 2, so don't reset
          if (!processedRef.current) {
            setLoading(false);
          }
        }, 2000); // Increased delay to ensure message processing completes
      }
    }, 500);
    
    // Store the interval reference so we can clear it when token is received
    popupMonitorIntervalRef.current = checkPopup;
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1">
        {/* GitSync Branding */}
        <div className="flex flex-col items-center mb-8">
          <img 
            src="gitsync.png" 
            alt="GitSync" 
            className="w-16 h-16 mb-3"
          />
          <h1 className="font-heading text-2xl text-black">
            GitSync
          </h1>
        </div>

        {/* Main CTA Text */}
        <h2 className="font-heading text-xl text-black mb-2">
          Connect your GitHub
        </h2>
        <p className="font-body text-gray-500 text-sm leading-relaxed mb-6">
          to sync your LeetCode solutions automatically
        </p>

        {/* Benefits */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs">✓</span>
            <p className="font-body text-sm text-gray-600">Secure OAuth authentication</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs">✓</span>
            <p className="font-body text-sm text-gray-600">Only repository access required</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs">✓</span>
            <p className="font-body text-sm text-gray-600">Revoke access anytime from GitHub</p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 font-body mb-4">{error}</p>
        )}
      </div>

      <div className="mt-auto">
        <Button onClick={handleAuthorize} disabled={loading}>
          {loading ? 'Connecting...' : 'Connect GitHub'}
        </Button>
        
        <Footer />
      </div>
    </div>
  );
}

export default StepOne;
