# Quick Start Guide

Get your Private Browser up and running in minutes!

## 🚀 Installation

### Prerequisites
- **macOS/Linux/Windows**
- **Node.js 16+** (we'll install this if you don't have it)

### Step 1: Install Node.js (if needed)
If you don't have Node.js installed:

**macOS (with Homebrew):**
```bash
brew install node
```

**macOS/Linux (with nvm):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 18
```

**Windows:**
Download from [nodejs.org](https://nodejs.org/)

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Start the Browser
```bash
npm start
```

That's it! Your Private Browser should now open. 🎉

## 🎯 First Steps

### 1. Test Basic Navigation
- Type `google.com` in the address bar and press Enter
- Try the back/forward buttons
- Open a new tab with `Ctrl/Cmd + T`

### 2. Check Privacy Features
- Click the shield icon in the toolbar
- Review the privacy settings
- Try the "Clear All Data Now" button

### 3. Test Tracker Blocking
- Visit a news website
- Open Developer Tools (F12)
- Check the Network tab for blocked requests

## 🔧 Customization

### Privacy Settings
Access via the shield icon:
- **Tracking Protection**: Block ads and trackers
- **Privacy Features**: Disable WebRTC, geolocation, notifications
- **Data Management**: Auto-clear data on exit
- **User Agent**: Customize your browser fingerprint

### Keyboard Shortcuts
- `Ctrl/Cmd + T`: New tab
- `Ctrl/Cmd + W`: Close tab
- `Ctrl/Cmd + R`: Reload page
- `Ctrl/Cmd + L`: Focus address bar

## 🐛 Troubleshooting

### Browser Won't Start
1. **Check Node.js version**: `node --version` (should be 16+)
2. **Reinstall dependencies**: `rm -rf node_modules && npm install`
3. **Check for errors**: Look at the terminal output

### Privacy Features Not Working
1. **Restart the browser** after changing settings
2. **Check the console** for error messages
3. **Verify settings** in the privacy modal

### Performance Issues
1. **Close unnecessary tabs**
2. **Clear browser data** from privacy settings
3. **Restart the browser**

## 🔍 Testing Privacy

### Tracker Blocking Test
1. Visit `https://www.google.com`
2. Open Developer Tools → Network tab
3. Look for blocked `google-analytics.com` requests

### Fingerprinting Test
1. Visit `https://browserleaks.com/canvas`
2. Check if canvas fingerprinting is protected

### WebRTC Test
1. Visit `https://browserleaks.com/webrtc`
2. Verify no WebRTC connections are established

## 📱 Building for Distribution

### Create Executable
```bash
npm run build
```

### Package for Distribution
```bash
npm run dist
```

This creates installable packages for your platform.

## 🆘 Need Help?

### Common Issues
- **"npm not found"**: Install Node.js first
- **"Electron failed to start"**: Check your system requirements
- **"Permission denied"**: Run with appropriate permissions

### Getting Support
1. Check the [README.md](README.md) for detailed documentation
2. Review [PRIVACY_FEATURES.md](PRIVACY_FEATURES.md) for technical details
3. Check the console for error messages

## 🎉 You're All Set!

Your Private Browser is now ready to use. Enjoy browsing with enhanced privacy protection!

### What's Next?
- Explore the privacy settings
- Test different websites
- Customize your user agent
- Learn about the privacy features in detail

Happy private browsing! 🔒
