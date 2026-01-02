# GitSync

Automatically sync your LeetCode solutions to GitHub.

## Features

- Auto-sync on successful submission
- Organized by difficulty (easy/, medium/, hard/)
- Secure OAuth authentication
- Works in background

## Local Setup

```bash
# Clone & install
git clone https://github.com/atharvamhaske/git-sync.git
cd git-sync
npm install

# Build extension
npm run build

# Build landing page
npm run build:landing
```

## Load Extension in Chrome

1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → select `dist/` folder

## Environment Variables (Vercel)

```
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
```

## GitHub OAuth App

Create at https://github.com/settings/developers with callback URL:
```
https://gitxsync.vercel.app/api/auth/callback
```

## Author

Built by [Atharva Mhaske](https://x.com/AtharvaXDevs) with [@blackaborai](https://www.blackbox.ai)
