# GitSync - LeetCode to GitHub Sync Extension

A clean, minimal Chrome extension that automatically syncs your LeetCode solutions to a GitHub repository.

## Features

- **Two-step onboarding**: GitHub OAuth authorization + Repository linking
- **Auto-sync**: Automatically pushes solved LeetCode problems to GitHub
- **Organized structure**: Solutions are organized into `easy/`, `medium/`, `hard/` folders
- **Smart naming**: Files are named as `problemName.extension` (e.g., `twoSum.js`)
- **Clean UI**: Minimal, distraction-free interface

## Installation

### Development Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

### GitHub OAuth Setup (Optional)

For full OAuth support, create a GitHub OAuth App:

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - Application name: `GitSync`
   - Homepage URL: `https://github.com`
   - Authorization callback URL: `https://<extension-id>.chromiumapp.org/`
4. Copy the Client ID and update `src/utils/github.js` and `src/background/background.js`

**Alternative**: Use a Personal Access Token (PAT) with `repo` scope for simpler setup.

## Usage

1. Click the GitSync extension icon
2. **Step 1**: Authorize with GitHub (or enter a Personal Access Token)
3. **Step 2**: Create a new GitHub repository and paste the URL
4. Click "Sync this repo" to complete setup
5. Solve LeetCode problems - they'll automatically sync!

## Repository Structure

Your GitHub repository will have this structure:

```
your-repo/
├── easy/
│   ├── twoSum.js
│   └── validParentheses.py
├── medium/
│   ├── addTwoNumbers.java
│   └── longestSubstring.go
└── hard/
    ├── medianOfTwoSortedArrays.cpp
    └── trappingRainWater.rs
```

## Tech Stack

- **React 18** - UI framework
- **Tailwind CSS** - Styling
- **Webpack** - Build tool
- **Chrome Extension Manifest V3**

## Typography

- **Headings**: Instrument Serif
- **Body/CTAs**: Satoshi

## Development

```bash
# Watch mode for development
npm run dev

# Production build
npm run build
```

## Credits

Made by Atharva with [@blackboxai](https://www.blackbox.ai)
