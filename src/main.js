const { app, BrowserWindow, session, Menu, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Initialize settings store
const store = new Store({
  defaults: {
    privacy: {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      blockTrackers: true,
      blockAds: true,
      disableWebRTC: true,
      disableGeolocation: true,
      disableNotifications: true,
      clearDataOnExit: true
    },
    window: {
      width: 1200,
      height: 800,
      x: undefined,
      y: undefined
    }
  }
});

let mainWindow;

function createWindow() {
  // Create the browser window with privacy-focused settings
  mainWindow = new BrowserWindow({
    width: store.get('window.width'),
    height: store.get('window.height'),
    x: store.get('window.x'),
    y: store.get('window.y'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      // Enable webview support
      webviewTag: true,
      // Disable potentially privacy-invasive features
      webgl: false,
      plugins: false,
      // Custom preload script for privacy controls
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    show: false // Don't show until ready
    // icon: path.join(__dirname, '../assets/icon.png') // Uncomment when icon is available
  });

  // Load the main browser interface
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Save window position and size
  mainWindow.on('close', () => {
    const bounds = mainWindow.getBounds();
    store.set('window', {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y
    });
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Set up privacy-focused session
  setupPrivacySession();
}

function setupPrivacySession() {
  const privacySettings = store.get('privacy');
  
  // Set custom user agent
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = privacySettings.userAgent;
    callback({ requestHeaders: details.requestHeaders });
  });

  // Block trackers and ads
  if (privacySettings.blockTrackers || privacySettings.blockAds) {
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      const url = details.url;
      
      // Block common tracking domains
      const blockedDomains = [
        'google-analytics.com',
        'googletagmanager.com',
        'facebook.com',
        'doubleclick.net',
        'googlesyndication.com',
        'amazon-adsystem.com',
        'scorecardresearch.com',
        'hotjar.com',
        'mixpanel.com',
        'amplitude.com'
      ];

      const isBlocked = blockedDomains.some(domain => url.includes(domain));
      
      if (isBlocked) {
        console.log(`Blocked: ${url}`);
        callback({ cancel: true });
      } else {
        callback({ cancel: false });
      }
    });
  }

  // Disable WebRTC to prevent IP leaks
  if (privacySettings.disableWebRTC) {
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      if (details.url.includes('webrtc') || details.url.includes('stun:')) {
        callback({ cancel: true });
      } else {
        callback({ cancel: false });
      }
    });
  }

  // Clear data on exit
  if (privacySettings.clearDataOnExit) {
    app.on('before-quit', () => {
      session.defaultSession.clearStorageData();
    });
  }
}

// Create menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            mainWindow.webContents.send('new-tab');
          }
        },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            mainWindow.webContents.send('close-tab');
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Privacy',
      submenu: [
        {
          label: 'Clear All Data',
          click: () => {
            session.defaultSession.clearStorageData();
            mainWindow.webContents.reload();
          }
        },
        {
          label: 'Privacy Settings',
          click: () => {
            mainWindow.webContents.send('open-privacy-settings');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});
