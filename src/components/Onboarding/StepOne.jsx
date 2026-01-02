import React, { useState, useEffect, useRef } from 'react';
import Button from '../Button';
import { setStorageData, getStorageData, removeStorageData } from '../../utils/storage';
import { validateGitHubToken, OAUTH_URL } from '../../utils/github';

function StepOne({ onComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const popupRef = useRef(null);
  const popupMonitorIntervalRef = useRef(null);
  const processedRef = useRef(false);

  useEffect(() => {
    let storageCheckInterval = null;
    // Don't reset processedRef on every render - only reset when component unmounts or user clicks authorize again
    
    // Process token and move to step 2
    const processTokenAndMoveToStep2 = async (token) => {
      if (processedRef.current) {
        console.log('[GitSync] Token already processed, skipping...');
        return;
      }
      
      processedRef.current = true;
      console.log('[GitSync] Processing token and moving to step 2...');
      setLoading(true);
      setError(null);
      
      // Clear all intervals
      if (storageCheckInterval) {
        clearInterval(storageCheckInterval);
        storageCheckInterval = null;
      }
      if (popupMonitorIntervalRef.current) {
        clearInterval(popupMonitorIntervalRef.current);
        popupMonitorIntervalRef.current = null;
      }
      
      try {
        // Validate the received token
        await validateGitHubToken(token);
        await setStorageData({ githubToken: token });
        console.log('[GitSync] Token validated and stored successfully');
        
        // Reset loading state
        setLoading(false);
        
        // Ensure extension popup stays open
        if (typeof window !== 'undefined') {
          window.focus();
        }
        
        // Call onComplete to transition to step 2
        // Use setTimeout to ensure React state updates are processed
        setTimeout(() => {
          console.log('[GitSync] Calling onComplete to move to step 2');
          onComplete(token);
        }, 100);
      } catch (err) {
        console.error('[GitSync] Token validation error:', err);
        setError(err.message || 'Failed to validate token. Please try again.');
        setLoading(false);
        processedRef.current = false; // Allow retry on error
      }
    };
    
    // Listen for OAuth callback message
    const handleMessage = async (event) => {
      // Accept messages from any origin (extension popups need this)
      console.log('[GitSync] Received message:', event.data, 'from origin:', event.origin);
      
      if (event.data?.type === 'GITHUB_AUTH_SUCCESS' && event.data?.token) {
        await processTokenAndMoveToStep2(event.data.token);
      } else if (event.data?.type === 'GITHUB_AUTH_ERROR') {
        console.error('[GitSync] OAuth error:', event.data.error);
        setError(event.data.error || 'Authorization failed. Please try again.');
        setLoading(false);
        if (storageCheckInterval) {
          clearInterval(storageCheckInterval);
          storageCheckInterval = null;
        }
        if (popupMonitorIntervalRef.current) {
          clearInterval(popupMonitorIntervalRef.current);
          popupMonitorIntervalRef.current = null;
        }
      }
    };

    // Check on mount if we already have a token (user might have completed OAuth before)
    const checkExistingToken = async () => {
      try {
        // Check localStorage first
        try {
          const localStorageToken = localStorage.getItem('oauth_pending_token');
          const tokenTimestamp = localStorage.getItem('oauth_token_timestamp');
          
          if (localStorageToken && tokenTimestamp && !processedRef.current) {
            const age = Date.now() - parseInt(tokenTimestamp, 10);
            if (age < 5 * 60 * 1000) { // 5 minutes
              console.log('[GitSync] Found pending token in localStorage on mount, processing...');
              localStorage.removeItem('oauth_pending_token');
              localStorage.removeItem('oauth_token_timestamp');
              await processTokenAndMoveToStep2(localStorageToken);
              return;
            } else {
              localStorage.removeItem('oauth_pending_token');
              localStorage.removeItem('oauth_token_timestamp');
            }
          }
        } catch (e) {
          console.log('[GitSync] Could not check localStorage on mount:', e);
        }
        
        // Check Chrome storage
        const data = await getStorageData(['githubToken', 'oauth_pending_token']);
        
        // Check for pending token first
        if (data.oauth_pending_token && !processedRef.current) {
          console.log('[GitSync] Found pending token in Chrome storage on mount, processing...');
          await removeStorageData(['oauth_pending_token']);
          await processTokenAndMoveToStep2(data.oauth_pending_token);
          return;
        }
        
        // If we have a githubToken but haven't processed it, process it
        if (data.githubToken && !processedRef.current) {
          console.log('[GitSync] Found existing token on mount, moving to step 2');
          await processTokenAndMoveToStep2(data.githubToken);
        }
      } catch (e) {
        console.error('[GitSync] Error checking existing token:', e);
      }
    };
    
    // Check immediately on mount
    checkExistingToken();
    
    // Enhanced fallback: Check Chrome storage AND localStorage for token periodically
    // This handles cases where postMessage fails - check every 500ms when loading (reduced frequency)
    storageCheckInterval = setInterval(async () => {
      // Only check if we're loading AND haven't processed yet
      if (!processedRef.current && loading) {
        try {
          // Check localStorage first (callback page stores it there)
          try {
            const localStorageToken = localStorage.getItem('oauth_pending_token');
            const tokenTimestamp = localStorage.getItem('oauth_token_timestamp');
            
            // Only use token if it's recent (within last 5 minutes)
            if (localStorageToken && tokenTimestamp) {
              const age = Date.now() - parseInt(tokenTimestamp, 10);
              if (age < 5 * 60 * 1000) { // 5 minutes
                console.log('[GitSync] Found pending token in localStorage, processing...');
                localStorage.removeItem('oauth_pending_token');
                localStorage.removeItem('oauth_token_timestamp');
                await processTokenAndMoveToStep2(localStorageToken);
                return;
              } else {
                // Token is too old, remove it
                localStorage.removeItem('oauth_pending_token');
                localStorage.removeItem('oauth_token_timestamp');
              }
            }
          } catch (e) {
            // localStorage might not be accessible
            console.log('[GitSync] Could not check localStorage:', e);
          }
          
          // Check Chrome storage
          const data = await getStorageData(['githubToken', 'oauth_pending_token']);
          
          // Check for pending token from callback first
          if (data.oauth_pending_token) {
            console.log('[GitSync] Found pending token in Chrome storage, processing...');
            await removeStorageData(['oauth_pending_token']);
            await processTokenAndMoveToStep2(data.oauth_pending_token);
            return;
          }
          
          // If we have a githubToken but haven't processed it, process it
          if (data.githubToken) {
            console.log('[GitSync] Found existing token in Chrome storage, processing...');
            await processTokenAndMoveToStep2(data.githubToken);
            return;
          }
        } catch (e) {
          console.error('[GitSync] Error checking storage:', e);
        }
      }
    }, 500); // Check every 500ms when loading (reduced from 300ms to prevent excessive checks)

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
      if (storageCheckInterval) {
        clearInterval(storageCheckInterval);
      }
      if (popupMonitorIntervalRef.current) {
        clearInterval(popupMonitorIntervalRef.current);
        popupMonitorIntervalRef.current = null;
      }
    };
  }, [onComplete, loading]);

  const handleAuthorize = () => {
    // Reset processed flag when user clicks authorize (new attempt)
    processedRef.current = false;
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
      </div>
    </div>
  );
}

export default StepOne;
