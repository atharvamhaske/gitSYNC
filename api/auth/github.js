/**
 * GitHub OAuth - Redirect to GitHub Authorization
 * GET /api/auth/github
 */

export default function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  
  if (!clientId) {
    console.error('[OAuth GitHub] GITHUB_CLIENT_ID is missing');
    return res.status(500).json({ 
      error: 'GitHub Client ID not configured',
      message: 'Please check your Vercel environment variables. Make sure GITHUB_CLIENT_ID is set for Production environment.'
    });
  }

  // Use environment variable for redirect URI if available, otherwise use production URL
  const redirectUri = process.env.OAUTH_REDIRECT_URI || 'https://gitxsync.vercel.app/api/auth/callback';
  
  console.log('[OAuth GitHub] Initiating OAuth flow:', {
    hasClientId: !!clientId,
    redirectUri: redirectUri,
    clientIdLength: clientId.length
  });
  
  // Generate random state for CSRF protection
  const crypto = require('crypto');
  const state = crypto.randomBytes(32).toString('hex');
  
  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', clientId);
  githubAuthUrl.searchParams.set('redirect_uri', redirectUri);
  githubAuthUrl.searchParams.set('scope', 'repo');
  githubAuthUrl.searchParams.set('state', state);

  console.log('[OAuth GitHub] Redirecting to GitHub:', githubAuthUrl.toString().replace(clientId, '[REDACTED]'));
  
  res.redirect(githubAuthUrl.toString());
}
