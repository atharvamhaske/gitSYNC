/**
 * GitHub OAuth Callback - Exchange code for token
 * GET /api/auth/callback?code=xxx
 */

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send(errorPage('No authorization code received'));
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).send(errorPage('OAuth not configured'));
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return res.status(400).send(errorPage(tokenData.error_description || tokenData.error));
    }

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(400).send(errorPage('No access token received'));
    }

    // Return HTML page that sends token to extension
    res.setHeader('Content-Type', 'text/html');
    res.send(successPage(accessToken));

  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.status(500).send(errorPage('Failed to complete authorization'));
  }
}

function successPage(token) {
  return `
<!DOCTYPE html>
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
    <p>You can close this window now.</p>
  </div>
  <script>
    // Send token to opener (extension popup)
    if (window.opener) {
      window.opener.postMessage({ type: 'GITHUB_AUTH_SUCCESS', token: '${token}' }, '*');
      setTimeout(() => window.close(), 1500);
    }
  </script>
</body>
</html>
  `;
}

function errorPage(message) {
  return `
<!DOCTYPE html>
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
    <p>${message}</p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'GITHUB_AUTH_ERROR', error: '${message}' }, '*');
    }
  </script>
</body>
</html>
  `;
}
