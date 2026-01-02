/**
 * GitHub OAuth Callback - Exchange code for token
 * GET /api/auth/callback?code=xxx
 */

export default async function handler(req, res) {
  const { code, error: githubError, error_description } = req.query;

  // Check for GitHub OAuth errors
  if (githubError) {
    console.error('[OAuth Callback] GitHub error:', githubError, error_description);
    return res.status(400).send(errorPage(error_description || githubError || 'Authorization was denied or failed'));
  }

  if (!code) {
    console.error('[OAuth Callback] No authorization code received');
    return res.status(400).send(errorPage('No authorization code received. Please try again.'));
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  // Better error messages for missing env vars
  if (!clientId) {
    console.error('[OAuth Callback] GITHUB_CLIENT_ID is missing');
    return res.status(500).send(errorPage('OAuth configuration error: Client ID is missing. Please check your Vercel environment variables.'));
  }

  if (!clientSecret) {
    console.error('[OAuth Callback] GITHUB_CLIENT_SECRET is missing');
    return res.status(500).send(errorPage('OAuth configuration error: Client Secret is missing. Please check your Vercel environment variables.'));
  }

  console.log('[OAuth Callback] Exchanging code for token...', { 
    hasCode: !!code, 
    hasClientId: !!clientId, 
    hasClientSecret: !!clientSecret,
    codeLength: code.length 
  });

  try {
    // Exchange code for access token
    const requestBody = {
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
    };
    
    console.log('[OAuth Callback] Requesting token from GitHub...', {
      hasCode: !!code,
      codePrefix: code ? code.substring(0, 10) + '...' : 'none',
      clientIdPrefix: clientId ? clientId.substring(0, 10) + '...' : 'none',
      hasClientSecret: !!clientSecret
    });
    
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseStatus = tokenResponse.status;
    const responseText = await tokenResponse.text();
    
    console.log('[OAuth Callback] GitHub API response:', {
      status: responseStatus,
      statusText: tokenResponse.statusText,
      contentType: tokenResponse.headers.get('content-type'),
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 200)
    });

    let tokenData;
    try {
      tokenData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[OAuth Callback] Failed to parse GitHub response:', parseError);
      console.error('[OAuth Callback] Raw response:', responseText);
      return res.status(500).send(errorPage('Invalid response from GitHub. Please try again.'));
    }

    console.log('[OAuth Callback] Parsed token response:', {
      hasError: !!tokenData.error,
      error: tokenData.error,
      errorDescription: tokenData.error_description,
      errorUri: tokenData.error_uri,
      hasAccessToken: !!tokenData.access_token,
      tokenType: tokenData.token_type,
      scope: tokenData.scope,
      refreshToken: !!tokenData.refresh_token
    });

    if (tokenData.error) {
      const errorMsg = tokenData.error_description || tokenData.error;
      console.error('[OAuth Callback] GitHub API error:', {
        error: tokenData.error,
        errorDescription: tokenData.error_description,
        errorUri: tokenData.error_uri,
        fullResponse: tokenData
      });
      
      // Provide helpful error messages for common issues
      let userMessage = errorMsg;
      if (tokenData.error === 'bad_verification_code') {
        userMessage = 'The authorization code has expired or is invalid. Please try again.';
      } else if (tokenData.error === 'incorrect_client_credentials') {
        userMessage = 'Invalid client credentials. Please check your GitHub OAuth app settings and Vercel environment variables.';
      } else if (tokenData.error === 'redirect_uri_mismatch') {
        userMessage = 'Redirect URI mismatch. Please ensure your GitHub OAuth app callback URL is exactly: https://gitxsync.vercel.app/api/auth/callback';
      }
      
      return res.status(400).send(errorPage(userMessage));
    }

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error('[OAuth Callback] No access token in response:', tokenData);
      return res.status(400).send(errorPage('No access token received from GitHub. Please try again.'));
    }

    console.log('[OAuth Callback] Successfully obtained access token', {
      tokenLength: accessToken.length,
      tokenPrefix: accessToken.substring(0, 10) + '...',
      tokenType: tokenData.token_type,
      scope: tokenData.scope
    });
    
    // Return HTML page that sends token to extension
    res.setHeader('Content-Type', 'text/html');
    res.send(successPage(accessToken));

  } catch (error) {
    console.error('[OAuth Callback] Unexpected error:', error);
    return res.status(500).send(errorPage(`Failed to complete authorization: ${error.message || 'Unknown error'}`));
  }
}

function successPage(token) {
  // Escape token for safe insertion into HTML/JS
  const tokenJson = JSON.stringify(token);
  
  return `<!DOCTYPE html>
<html>
<head>
  <title>GitSync - Authorization Successful</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f9fafb;
    }
    .container {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      max-width: 400px;
    }
    .success-icon {
      width: 64px;
      height: 64px;
      background: #10b981;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }
    .success-icon svg {
      width: 32px;
      height: 32px;
      color: white;
    }
    h1 { font-size: 24px; color: #111; margin-bottom: 8px; }
    p { color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
    </div>
    <h1>Authorization Successful!</h1>
    <p id="status-text">Sending token to extension...</p>
    <p style="font-size: 12px; color: #9ca3af; margin-top: 8px;" id="close-text" style="display: none;">You can close this window now.</p>
  </div>
  <script>
    (function() {
      const token = ${tokenJson};
      let messageSent = false;
      const statusText = document.getElementById('status-text');
      const closeText = document.getElementById('close-text');
      
      // Function to send message to opener
      function sendMessage() {
        if (window.opener && !window.opener.closed) {
          try {
            // Send with wildcard origin (for extension popups)
            window.opener.postMessage({ 
              type: 'GITHUB_AUTH_SUCCESS', 
              token: token 
            }, '*');
            
            if (!messageSent) {
              messageSent = true;
              console.log('[OAuth Callback] Message sent to opener');
              statusText.textContent = 'Token sent successfully!';
              setTimeout(() => {
                if (closeText) closeText.style.display = 'block';
                statusText.textContent = 'You can close this window now.';
              }, 1000);
            }
            return true;
          } catch (e) {
            console.error('[OAuth Callback] Failed to send message:', e);
            return false;
          }
        } else {
          console.warn('[OAuth Callback] No opener window found or opener is closed');
          return false;
        }
      }
      
      // Function to close window safely - only close THIS window, not the opener
      function closeWindow() {
        setTimeout(() => {
          try {
            // Only close this callback window, never the opener
            if (window.opener && !window.opener.closed) {
              // Make sure opener is still there before closing
              window.close();
            }
          } catch (e) {
            console.log('[OAuth Callback] Could not auto-close window');
          }
        }, 1000); // Increased delay to ensure message is processed
      }
      
      // Try immediately
      const sentImmediately = sendMessage();
      
      // If message sent immediately, close window after a delay
      if (sentImmediately && messageSent) {
        closeWindow();
        return; // Exit early if message was sent successfully
      }
      
      // Try multiple times with increasing delays if first attempt failed
      const attempts = [100, 300, 500, 1000];
      attempts.forEach((delay, index) => {
        setTimeout(() => {
          if (!messageSent) {
            const sent = sendMessage();
            if (sent && messageSent) {
              // Message sent successfully, close window after delay
              closeWindow();
            } else if (!sent && index === attempts.length - 1) {
              statusText.textContent = 'Please manually close this window.';
              statusText.style.color = '#ef4444';
            }
          }
        }, delay);
      });
      
      // Also try when window gains focus
      window.addEventListener('focus', () => {
        if (!messageSent) {
          const sent = sendMessage();
          if (sent && messageSent) {
            closeWindow();
          }
        }
      });
      
      // Store token in URL hash as fallback
      try {
        if (window.location.hash.indexOf('token=') === -1) {
          window.location.hash = '#token=' + encodeURIComponent(token);
        }
      } catch (e) {
        // Ignore
      }
    })();
  </script>
</body>
</html>`;
}

function errorPage(message) {
  // Escape message for safe insertion into HTML/JS
  const messageEscaped = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const messageJson = JSON.stringify(message);
  
  return `<!DOCTYPE html>
<html>
<head>
  <title>GitSync - Authorization Failed</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f9fafb;
    }
    .container {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      max-width: 400px;
    }
    .error-icon {
      width: 64px;
      height: 64px;
      background: #ef4444;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }
    .error-icon svg {
      width: 32px;
      height: 32px;
      color: white;
    }
    h1 { font-size: 24px; color: #111; margin-bottom: 8px; }
    p { color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="error-icon">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </div>
    <h1>Authorization Failed</h1>
    <p>${messageEscaped}</p>
  </div>
  <script>
    (function() {
      const errorMsg = ${messageJson};
      
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage({ 
            type: 'GITHUB_AUTH_ERROR', 
            error: errorMsg 
          }, '*');
          
          window.opener.postMessage({ 
            type: 'GITHUB_AUTH_ERROR', 
            error: errorMsg 
          }, window.location.origin);
        } catch (e) {
          console.error('Failed to send error message:', e);
        }
      }
    })();
  </script>
</body>
</html>`;
}
