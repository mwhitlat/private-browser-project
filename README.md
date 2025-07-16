# Private Browser

A privacy-focused web browser built with Electron that provides enhanced privacy controls and tracking protection.

## Features

### 🔒 Privacy Protection
- **Tracker Blocking**: Automatically blocks common tracking domains (Google Analytics, Facebook, etc.)
- **Ad Blocking**: Built-in ad blocking capabilities
- **WebRTC Protection**: Prevents IP address leaks through WebRTC
- **Canvas Fingerprinting Protection**: Adds noise to canvas data to prevent fingerprinting
- **Geolocation Blocking**: Disables location tracking
- **Notification Blocking**: Prevents unwanted notifications
- **Custom User Agent**: Configurable user agent string

### 🛡️ Security Features
- **HTTPS Enforcement**: Visual indicators for secure/insecure connections
- **Data Clearing**: Automatic data clearing on exit
- **Session Isolation**: Each tab operates in its own context
- **External Link Protection**: Opens external links in default browser

### 🎨 User Interface
- **Modern Design**: Clean, responsive interface with dark mode support
- **Tab Management**: Multiple tabs with easy switching
- **Navigation Controls**: Back, forward, reload, and new tab buttons
- **Address Bar**: Smart URL processing with search integration
- **Privacy Settings**: Easy-to-use privacy configuration modal

### ⌨️ Keyboard Shortcuts
- `Ctrl/Cmd + T`: New tab
- `Ctrl/Cmd + W`: Close current tab
- `Ctrl/Cmd + R`: Reload page
- `Ctrl/Cmd + L`: Focus address bar

## Installation

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn

### Setup
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd private-browser-project
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

### Building for Production
```bash
# Build for current platform
npm run build

# Build for distribution
npm run dist
```

## Usage

### Basic Navigation
1. **Address Bar**: Type a URL or search term and press Enter
2. **Navigation**: Use the back/forward buttons or keyboard shortcuts
3. **Tabs**: Click the "+" button or use `Ctrl/Cmd + T` for new tabs
4. **Privacy**: Click the shield icon to access privacy settings

### Privacy Settings
Access privacy settings by clicking the shield icon in the toolbar:

- **Tracking Protection**: Enable/disable tracker and ad blocking
- **Privacy Features**: Control WebRTC, geolocation, and notifications
- **Data Management**: Configure automatic data clearing
- **User Agent**: Customize your browser fingerprint

### Security Indicators
- 🟢 **Green Shield**: Secure HTTPS connection
- 🔴 **Red Shield**: Insecure HTTP connection
- 🔵 **Blue Shield**: Local page or special protocol

## Privacy Features Explained

### Tracker Blocking
The browser automatically blocks requests to known tracking domains:
- Google Analytics
- Facebook tracking pixels
- DoubleClick ads
- Hotjar analytics
- Mixpanel
- And many more...

### Fingerprinting Protection
- **Canvas Fingerprinting**: Adds random noise to canvas data
- **Audio Fingerprinting**: Modifies audio context data
- **WebRTC Protection**: Disables WebRTC to prevent IP leaks

### Data Management
- **Automatic Clearing**: Option to clear all data when closing the browser
- **Manual Clearing**: Clear data immediately from privacy settings
- **Session Isolation**: Each tab maintains separate data

## Development

### Project Structure
```
private-browser-project/
├── src/
│   ├── main.js          # Main Electron process
│   ├── preload.js       # Preload script for security
│   ├── index.html       # Main browser interface
│   ├── styles.css       # Styling
│   └── renderer.js      # Renderer process logic
├── assets/              # Icons and static assets
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

### Key Components

#### Main Process (`main.js`)
- Creates the browser window
- Manages privacy settings
- Handles session configuration
- Sets up security policies

#### Renderer Process (`renderer.js`)
- Manages the user interface
- Handles tab management
- Processes user interactions
- Injects privacy scripts

#### Preload Script (`preload.js`)
- Provides secure communication between processes
- Disables privacy-invasive APIs
- Implements fingerprinting protection

### Adding New Privacy Features

1. **Update Main Process**: Add new blocking rules in `main.js`
2. **Update UI**: Add controls in `index.html` and `renderer.js`
3. **Update Preload**: Add new API blocking in `preload.js`
4. **Test**: Verify the feature works as expected

## Security Considerations

### What This Browser Protects Against
- **Tracking**: Blocks common tracking scripts and pixels
- **Fingerprinting**: Prevents browser fingerprinting techniques
- **Data Collection**: Minimizes data stored locally
- **IP Leaks**: Prevents WebRTC IP address leaks

### What This Browser Does NOT Protect Against
- **Network-level tracking**: Your ISP can still see your traffic
- **Advanced fingerprinting**: Some sophisticated techniques may still work
- **Malware**: Not a security-focused browser
- **VPN/Proxy**: No built-in VPN or proxy support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Development Guidelines
- Follow the existing code style
- Add comments for complex privacy features
- Test privacy features thoroughly
- Update documentation for new features

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This browser is designed for educational purposes and enhanced privacy. While it provides significant privacy improvements over standard browsers, it should not be considered a complete privacy solution. For maximum privacy, consider using additional tools like VPNs, Tor, or other privacy-focused services.

## Acknowledgments

- Built with [Electron](https://electronjs.org/)
- Privacy features inspired by [Brave Browser](https://brave.com/)
- UI design influenced by modern browser interfaces
