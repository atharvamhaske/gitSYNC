/**
 * Debug endpoint to check OAuth configuration
 * GET /api/auth/debug
 * 
 * This helps verify that environment variables are set correctly in Vercel
 */

export default function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  
  // Don't expose the actual values, just check if they exist
  const config = {
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    clientIdLength: clientId ? clientId.length : 0,
    clientSecretLength: clientSecret ? clientSecret.length : 0,
    redirectUri: process.env.OAUTH_REDIRECT_URI || 'https://gitxsync.vercel.app/api/auth/callback',
    environment: process.env.VERCEL_ENV || 'unknown',
    nodeEnv: process.env.NODE_ENV || 'unknown'
  };
  
  res.status(200).json({
    message: 'OAuth Configuration Check',
    config: config,
    status: config.hasClientId && config.hasClientSecret ? 'OK' : 'MISSING_VARS',
    instructions: config.hasClientId && config.hasClientSecret 
      ? 'Configuration looks good! If OAuth is still failing, check the GitHub OAuth app callback URL matches: ' + config.redirectUri
      : 'Missing environment variables. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in Vercel project settings under Environment Variables.'
  });
}



