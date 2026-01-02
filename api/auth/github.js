/**
 * GitHub OAuth - Redirect to GitHub Authorization
 * GET /api/auth/github
 */

export default function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  
  if (!clientId) {
    return res.status(500).json({ error: 'GitHub Client ID not configured' });
  }

  const redirectUri = 'https://gitxsync.vercel.app/api/auth/callback';
  
  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', clientId);
  githubAuthUrl.searchParams.set('redirect_uri', redirectUri);
  githubAuthUrl.searchParams.set('scope', 'repo');
  githubAuthUrl.searchParams.set('state', crypto.randomUUID());

  res.redirect(githubAuthUrl.toString());
}
