const { app, BrowserWindow, BrowserView, session, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');
const fs = require('fs');
const os = require('os');
const AIService = require('./ai-service');

// Enhanced error logging system
const DEBUG_MODE = process.env.NODE_ENV === 'development' || process.argv.includes('--debug');

function logError(context, error, additionalData = {}) {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    context,
    error: error.message || error,
    stack: error.stack,
    ...additionalData
  };
  
  console.error(`[${timestamp}] ERROR in ${context}:`, errorInfo);
  
  // In debug mode, also log to file
  if (DEBUG_MODE) {
    const fs = require('fs');
    const logFile = path.join(__dirname, '../debug-logs.txt');
    const logEntry = JSON.stringify(errorInfo, null, 2) + '\n---\n';
    fs.appendFileSync(logFile, logEntry);
  }
}

function logInfo(context, message, data = {}) {
  if (DEBUG_MODE) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO in ${context}:`, message, data);
  }
}

// Global error handlers
process.on('uncaughtException', (error) => {
  logError('UNCAUGHT_EXCEPTION', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logError('UNHANDLED_REJECTION', reason, { promise });
});

// Missing utility functions
function getStoreValue(key, defaultValue = null) {
  try {
    return store.get(key, defaultValue);
  } catch (error) {
    console.error('Error getting store value:', error);
    return defaultValue;
  }
}

function analyzeContent(content, options = {}) {
  try {
    const aiService = new AIService();
    return aiService.analyzeContent(content, options);
  } catch (error) {
    logError('ANALYZE_CONTENT', error, { content: content?.substring(0, 100), options });
    return null;
  }
}

const store = new Store({
  defaults: {
    privacy: {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X10_157) AppleWebKit/53736(KHTML, like Gecko) Chrome/120000Safari/537.36',
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
    },
    bookmarks: []
  }
});

let mainWindow;
let tabs = [];
let activeTabId = null;
let nextTabId = 1;
let downloads = [];
let nextDownloadId = 1;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: getStoreValue('window.width'),
    height: getStoreValue('window.height'),
    x: getStoreValue('window.x'),
    y: getStoreValue('window.y'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    createNewTab('https://duckduckgo.com/');
  });

  mainWindow.on('close', () => {
    const bounds = mainWindow.getBounds();
    store.set('window', {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y
    });
  });

  mainWindow.on('resize', () => {
    // Update BrowserView bounds when window is resized
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab && tab.browserView) {
      updateBrowserViewBounds(tab.browserView);
    }
  });

  mainWindow.on('move', () => {
    // Update BrowserView bounds when window is moved
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab && tab.browserView) {
      updateBrowserViewBounds(tab.browserView);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  setupPrivacySession();
  setupDownloadManager();
  setupIPCHandlers();
}

function createNewTab(url = 'about:blank') {
  const tabId = nextTabId++;
  const browserView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      webgl: false,
      plugins: false,
      // Enable features needed for dynamic content
      enableRemoteModule: false,
      sandbox: false,
      // Allow JavaScript to run properly
      javascript: true,
      // Enable DOM features
      webSecurity: true,
      // Allow images and media
      images: true,
      // Enable CSS
      css: true,
      // Enable additional features for dynamic content
      enableWebSQL: false,
      // Allow proper event handling
      enableBlinkFeatures: '',
      // Disable features that might interfere
      disableBlinkFeatures: 'AutoplayPolicy'
    }
  });
  browserView.webContents.loadURL(url);
  
  // Inject basic privacy protection scripts after page loads
  browserView.webContents.on('did-finish-load', () => {
    // Add a small delay to ensure the page is fully loaded
    setTimeout(() => {
      injectPrivacyScripts(browserView.webContents);
    }, 100);
  });
  
  browserView.webContents.on('did-start-loading', () => {
    sendTabEvent('loading', tabId, true);
  });
  
  browserView.webContents.on('did-stop-loading', () => {
    sendTabEvent('loading', tabId, false);
    updateTabMeta(tabId);
  });
  
  browserView.webContents.on('did-navigate', (event, navUrl) => {
    updateTabMeta(tabId, navUrl);
  });
  
  browserView.webContents.on('page-title-updated', (event, title) => {
    updateTabMeta(tabId, undefined, title);
  });
  
  browserView.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('BrowserView failed to load:', errorDescription);
  });
  
  const tab = {
    id: tabId,
    browserView,
    url,
    title: 'New Tab'
  };
  
  tabs.push(tab);
  switchToTab(tabId);
  notifyTabList();
}

function closeTab(tabId) {
  const idx = tabs.findIndex(t => t.id === tabId);
  if (idx === -1) return;
  const [tab] = tabs.splice(idx, 1);
  if (tab.browserView) {
    if (mainWindow.getBrowserView() === tab.browserView) {
      mainWindow.setBrowserView(null);
    }
    tab.browserView.destroy();
  }
  // If closing the active tab, switch to another
  if (activeTabId === tabId) {
    if (tabs.length > 0) {
      switchToTab(tabs[tabs.length - 1].id);
    } else {
      // No tabs left, open a new one
      createNewTab();
    }
  } else {
    notifyTabList();
  }
}

function switchToTab(tabId) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab || !tab.browserView) {
    console.error('Tab not found or has no browserView:', tabId);
    return;
  }
  
  try {
    // Check if webContents is destroyed
    const webContents = tab.browserView.webContents;
    if (webContents) {
      const isDestroyed = typeof webContents.isDestroyed === 'function' 
        ? webContents.isDestroyed() 
        : webContents.isDestroyed;
      
      if (isDestroyed) {
        console.error('WebContents is destroyed for tab:', tabId);
        return;
      }
    }
    
    if (mainWindow.getBrowserView()) {
      mainWindow.setBrowserView(null);
    }
    activeTabId = tabId;
    updateBrowserViewBounds(tab.browserView);
    mainWindow.setBrowserView(tab.browserView);
    notifyTabList();
  } catch (error) {
    logError('SWITCH_TO_TAB', error);
  }
}

function updateTabMeta(tabId, url, title) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab || !tab.browserView) return;
  
  try {
    // Check if webContents is destroyed
    const webContents = tab.browserView.webContents;
    if (webContents) {
      const isDestroyed = typeof webContents.isDestroyed === 'function' 
        ? webContents.isDestroyed() 
        : webContents.isDestroyed;
      
      if (isDestroyed) {
        console.log('WebContents is destroyed for tab:', tabId);
        return;
      }
    }
    
    if (url) tab.url = url;
    if (title) tab.title = title;
    else {
      if (webContents) {
        const webContentsDestroyed = typeof webContents.isDestroyed === 'function' 
          ? webContents.isDestroyed() 
          : webContents.isDestroyed;
        
        if (!webContentsDestroyed) {
          tab.title = webContents.getTitle() || 'New Tab';
        }
      }
    }
    notifyTabList();
  } catch (error) {
    logError('UPDATE_TAB_META', error);
  }
}

function updateBrowserViewBounds(browserView) {
  if (!browserView || !mainWindow) return;
  
  const [width, height] = mainWindow.getSize();
  const toolbarHeight = 84; // Height of toolbar + tab bar
  
  // Ensure minimum dimensions
  const viewWidth = Math.max(width, 800);
  const viewHeight = Math.max(height - toolbarHeight, 600);
  
  browserView.setBounds({
    x: 0,
    y: toolbarHeight,
    width: viewWidth,
    height: viewHeight
  });
  
  // Set auto-resize to handle window resizing
  browserView.setAutoResize({ 
    width: true, 
    height: true 
  });
}

function notifyTabList() {
  const tabList = tabs.map(tab => ({
    id: tab.id,
    url: tab.url,
    title: tab.title
  }));
  mainWindow.webContents.send('tab-list', {
    tabs: tabList,
    activeTabId
  });
}

function sendTabEvent(event, tabId, data) {
  mainWindow.webContents.send('tab-event', { event, tabId, data });
}

// Content Analysis and AI Features
const aiService = new AIService();

// Store for content analysis history
let contentAnalysisHistory = [];

// Store for content summary history
let summaryHistory = [];

function analyzePageContent(webContents, url) {
  try {
    // Get page content
    webContents.executeJavaScript(`
      (() => {
        // Extract main content, excluding navigation, ads, etc.
        const selectors = [
          'article', 'main', '.content', '.post-content', '.entry-content',
          '.article-content', '.story-content', '.text-content', 'p'
        ];
        
        let content = '';
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            // Skip if element is likely navigation or ads
            const text = element.textContent.trim();
            if (text.length > 100 && !element.closest('nav, header, footer, .sidebar, .ad, .advertisement')) {
              content += text + '\\n\\n';
            }
          }
        }
        
        // Fallback to body content if no specific content found
        if (content.length < 500) {
          content = document.body.textContent;
        }
        
        return {
          content: content.substring(0, 10000), // Limit content length
          title: document.title,
          url: window.location.href
        };
      })()
    `).then(result => {
      if (result && result.content && result.content.length > 100) {
        // Analyze content for bias and emotional tone only
        const analysis = aiService.analyzeContent(result.content, {
          enableSummary: false,
          enableReadingTime: false,
          enableKeyPoints: false,
          enableReadability: true,
          enableTopics: true,
          enableBiasAnalysis: true,
          enableEmotionalTone: true
        });
        
        if (analysis) {
          // Store analysis in history
          const analysisEntry = {
            id: Date.now(),
            url: url,
            title: result.title,
            timestamp: new Date().toISOString(),
            analysis: analysis
          };
          
          contentAnalysisHistory.unshift(analysisEntry);
          
          // Keep only last 50 analyses
          if (contentAnalysisHistory.length > 50) {
            contentAnalysisHistory = contentAnalysisHistory.slice(0, 50);
          }
          
          // Send analysis to renderer
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('content-analysis-complete', analysisEntry);
          }
          
          console.log('✅ Content analysis completed for:', url);
        }
      }
    }).catch(error => {
      console.error('Error analyzing page content:', error);
    });
  } catch (error) {
    console.error('Error in page load analysis:', error);
  }
}

function getContentAnalysisHistory() {
  return contentAnalysisHistory;
}

function clearContentAnalysisHistory() {
  contentAnalysisHistory = [];
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('content-analysis-history-cleared');
  }
}

function generateContentSummary(webContents, url) {
  try {
    // Get page content
    webContents.executeJavaScript(`
      (() => {
        // Extract main content, excluding navigation, ads, etc.
        const selectors = [
          'article', 'main', '.content', '.post-content', '.entry-content',
          '.article-content', '.story-content', '.text-content', 'p'
        ];
        
        let content = '';
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            // Skip if element is likely navigation or ads
            const text = element.textContent.trim();
            if (text.length > 100 && !element.closest('nav, header, footer, .sidebar, .ad, .advertisement')) {
              content += text + '\\n\\n';
            }
          }
        }
        
        // Fallback to body content if no specific content found
        if (content.length < 500) {
          content = document.body.textContent;
        }
        
        return {
          content: content.substring(0, 10000), // Limit content length
          title: document.title,
          url: window.location.href
        };
      })()
    `).then(result => {
      if (result && result.content && result.content.length > 100) {
        // Generate summary using AI service
        const summary = aiService.generateSummary(result.content, 'medium');
        const readingTime = aiService.calculateReadingTime(result.content);
        const keyPoints = aiService.extractKeyPoints(result.content);
        
        if (summary) {
          // Store summary in history
          const summaryEntry = {
            id: Date.now(),
            url: url,
            title: result.title,
            timestamp: new Date().toISOString(),
            summary: summary,
            readingTime: readingTime,
            keyPoints: keyPoints
          };
          
          summaryHistory.unshift(summaryEntry);
          
          // Keep only last 50 summaries
          if (summaryHistory.length > 50) {
            summaryHistory = summaryHistory.slice(0, 50);
          }
          
          // Send summary to renderer
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('content-summary-complete', summaryEntry);
          }
          
          console.log('✅ Content summary generated for:', url);
        }
      }
    }).catch(error => {
      console.error('Error generating content summary:', error);
    });
  } catch (error) {
    console.error('Error in content summary generation:', error);
  }
}

function getSummaryHistory() {
  return summaryHistory;
}

function clearSummaryHistory() {
  summaryHistory = [];
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('summary-history-cleared');
  }
}

// Enhanced IPC handlers setup
function setupIPCHandlers() {
  // Clear existing handlers to prevent duplicates
  try {
    ipcMain.removeHandler('new-tab');
    ipcMain.removeHandler('close-tab');
    ipcMain.removeHandler('switch-tab');
    ipcMain.removeHandler('reorder-tabs');
    ipcMain.removeHandler('navigate');
    ipcMain.removeHandler('go-back');
    ipcMain.removeHandler('go-forward');
    ipcMain.removeHandler('reload');
    ipcMain.removeHandler('get-current-url');
    ipcMain.removeHandler('get-navigation-state');
    ipcMain.removeHandler('add-bookmark');
    ipcMain.removeHandler('remove-bookmark');
    ipcMain.removeHandler('get-bookmarks');
    ipcMain.removeHandler('hide-browser-view');
    ipcMain.removeHandler('show-browser-view');
    ipcMain.removeHandler('get-downloads');
    ipcMain.removeHandler('cancel-download');
    ipcMain.removeHandler('open-download-folder');
    ipcMain.removeHandler('open-download-file');
    ipcMain.removeHandler('clear-completed-downloads');
    ipcMain.removeHandler('generate-content-summary');
    ipcMain.removeHandler('get-summary-history');
    ipcMain.removeHandler('clear-summary-history');
    ipcMain.removeHandler('analyze-current-page');
    ipcMain.removeHandler('get-content-analysis-history');
    ipcMain.removeHandler('clear-content-analysis-history');
    ipcMain.removeHandler('get-ai-settings');
    ipcMain.removeHandler('get-media-diet-settings');
    ipcMain.removeHandler('get-auth-status');
    ipcMain.removeHandler('lock-browser');
  } catch (error) {
    logError('IPC_HANDLER_CLEANUP', error);
  }

  // Tab management
  ipcMain.handle('new-tab', (event, url) => {
    try {
      createNewTab(url || 'about:blank');
      return { success: true };
    } catch (error) {
      logError('NEW_TAB_HANDLER', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('close-tab', (event, tabId) => {
    closeTab(tabId);
    return { success: true };
  });
  
  ipcMain.handle('switch-tab', (event, tabId) => {
    switchToTab(tabId);
    return { success: true };
  });
  
  ipcMain.handle('reorder-tabs', (event, tabIds) => {
    reorderTabs(tabIds);
    return { success: true };
  });
  
  // Navigation
  ipcMain.handle('navigate', async (event, url) => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab && tab.browserView && tab.browserView.webContents) {
      try {
        await tab.browserView.webContents.loadURL(url);
        return { success: true };
      } catch (error) {
        logError('NAVIGATE_HANDLER', error);
        return { success: false, error: error.message };
      }
    }
    return { success: false, error: 'No active tab' };
  });
  
  ipcMain.handle('go-back', async () => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab && tab.browserView && tab.browserView.webContents && tab.browserView.webContents.canGoBack()) {
      tab.browserView.webContents.goBack();
      return { success: true };
    }
    return { success: false };
  });
  
  ipcMain.handle('go-forward', async () => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab && tab.browserView && tab.browserView.webContents && tab.browserView.webContents.canGoForward()) {
      tab.browserView.webContents.goForward();
      return { success: true };
    }
    return { success: false };
  });
  
  ipcMain.handle('reload', async () => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab && tab.browserView && tab.browserView.webContents) {
      tab.browserView.webContents.reload();
      return { success: true };
    }
    return { success: false };
  });
  
  ipcMain.handle('get-current-url', async () => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab && tab.browserView && tab.browserView.webContents) {
      return tab.browserView.webContents.getURL();
    }
    return null;
  });
  
  ipcMain.handle('get-navigation-state', async () => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab && tab.browserView && tab.browserView.webContents) {
      try {
        return {
          canGoBack: tab.browserView.webContents.canGoBack(),
          canGoForward: tab.browserView.webContents.canGoForward(),
          isLoading: tab.browserView.webContents.isLoading()
        };
      } catch (error) {
        logError('GET_NAVIGATION_STATE', error);
        return { canGoBack: false, canGoForward: false, isLoading: false };
      }
    }
    return { canGoBack: false, canGoForward: false, isLoading: false };
  });

  // Bookmarks
  ipcMain.handle('add-bookmark', (event, bookmark) => {
    addBookmark(bookmark);
    return { success: true };
  });

  ipcMain.handle('remove-bookmark', (event, bookmarkId) => {
    removeBookmark(bookmarkId);
    return { success: true };
  });

  ipcMain.handle('get-bookmarks', () => {
    return getBookmarks();
  });

  // BrowserView visibility control for modals
  ipcMain.handle('hide-browser-view', () => {
    if (mainWindow) {
      mainWindow.setBrowserView(null);
    }
    return { success: true };
  });

  ipcMain.handle('show-browser-view', () => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab && mainWindow) {
      mainWindow.setBrowserView(tab.browserView);
      // Ensure the BrowserView is positioned correctly
      updateBrowserViewBounds(tab.browserView);
    }
    return { success: true };
  });

  // Download Manager IPC handlers
  ipcMain.handle('get-downloads', () => {
    return getDownloads();
  });

  ipcMain.handle('cancel-download', (event, downloadId) => {
    cancelDownload(downloadId);
    return { success: true };
  });

  ipcMain.handle('open-download-folder', () => {
    openDownloadFolder();
    return { success: true };
  });

  ipcMain.handle('open-download-file', (event, downloadId) => {
    openDownloadFile(downloadId);
    return { success: true };
  });

  ipcMain.handle('clear-completed-downloads', () => {
    clearCompletedDownloads();
    return { success: true };
  });

  // Content Summary IPC handlers
  ipcMain.handle('generate-content-summary', async (event, tabId) => {
    try {
      const tab = tabs.find(t => t.id === tabId);
      if (!tab) {
        return { success: false, error: 'Tab not found' };
      }
      if (!tab.browserView) {
        return { success: false, error: 'BrowserView not found' };
      }
      
      // Check if webContents is destroyed
      const webContents = tab.browserView.webContents;
      if (!webContents) {
        return { success: false, error: 'WebContents not found' };
      }
      
      const isDestroyed = typeof webContents.isDestroyed === 'function' 
        ? webContents.isDestroyed() 
        : webContents.isDestroyed;
      
      if (isDestroyed) {
        return { success: false, error: 'WebContents is destroyed' };
      }
      
      const url = webContents.getURL();
      generateContentSummary(webContents, url);
      return { success: true };
    } catch (error) {
      logError('GENERATE_CONTENT_SUMMARY', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('get-summary-history', () => {
    return getSummaryHistory();
  });
  
  ipcMain.handle('clear-summary-history', () => {
    clearSummaryHistory();
    return { success: true };
  });
  
  // Content Analysis IPC handlers
  ipcMain.handle('analyze-current-page', async (event, tabId) => {
    try {
      const tab = tabs.find(t => t.id === tabId);
      if (!tab) {
        return { success: false, error: 'Tab not found' };
      }
      if (!tab.browserView) {
        return { success: false, error: 'BrowserView not found' };
      }
      
      // Check if webContents is destroyed
      const webContents = tab.browserView.webContents;
      if (!webContents) {
        return { success: false, error: 'WebContents not found' };
      }
      
      const isDestroyed = typeof webContents.isDestroyed === 'function' 
        ? webContents.isDestroyed() 
        : webContents.isDestroyed;
      
      if (isDestroyed) {
        return { success: false, error: 'WebContents is destroyed' };
      }
      
      const url = webContents.getURL();
      analyzePageContent(webContents, url);
      return { success: true };
    } catch (error) {
      logError('ANALYZE_CURRENT_PAGE', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('get-content-analysis-history', () => {
    return getContentAnalysisHistory();
  });
  
  ipcMain.handle('clear-content-analysis-history', () => {
    clearContentAnalysisHistory();
    return { success: true };
  });

  // Settings and status handlers
  ipcMain.handle('get-ai-settings', () => {
    return {
      enabled: true,
      model: 'gpt-3.5-turbo',
      maxTokens: 500
    };
  });

  ipcMain.handle('get-media-diet-settings', () => {
    return {
      enabled: true,
      strictMode: false,
      allowedDomains: []
    };
  });

  ipcMain.handle('get-auth-status', () => {
    return {
      authenticated: false,
      method: 'none'
    };
  });

  ipcMain.handle('lock-browser', () => {
    // Implement browser locking functionality
    console.log('Browser lock requested');
    return { success: true };
  });
}

function reorderTabs(newTabIds) {
  // Create a new tabs array in the requested order
  const newTabs = [];
  newTabIds.forEach(tabId => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      newTabs.push(tab);
    }
  });

  // Add any remaining tabs that weren't in the new order
  tabs.forEach(tab => {
    if (!newTabIds.includes(tab.id)) {
      newTabs.push(tab);
    }
  });

  tabs = newTabs;
  notifyTabList();
}

function setupPrivacySession() {
  const privacySettings = getStoreValue('privacy');
  
  // Enhanced privacy session setup - block tracking while preserving functionality
  if (privacySettings.blockTrackers || privacySettings.blockAds) {
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      const url = details.url;
      
      // Block tracking domains while allowing essential resources
      const blockedPatterns = [
        // Tracking and analytics
        'doubleclick.net',
        'googlesyndication.com',
        'amazon-adsystem.com',
        'facebook.com/plugins',
        'facebook.com/tr',
        'google-analytics.com',
        'googletagmanager.com',
        'googletagservices.com',
        'facebook.net',
        'fbcdn.net',
        'twitter.com/tr',
        'linkedin.com/tr',
        'adnxs.com',
        'rubiconproject.com',
        'casalemedia.com',
        'openx.net',
        'pubmatic.com',
        'criteo.com',
        'taboola.com',
        'outbrain.com',
        'media.net',
        'indexww.com',
        'tapad.com',
        'bidswitch.net',
        'sonobi.com',
        'loopme.me',
        'flashtalking.com',
        'imrworldwide.com',
        'scorecardresearch.com',
        'omtrdc.net',
        'bounceexchange.com',
        'cdnwidget.com',
        'creativedot2.net',
        'aidemsrv.com',
        'audienceexposure.com',
        'yellowblue.io',
        'omnitagjs.com',
        'blismedia.com',
        'minutemedia-prebid.com',
        'visitor.us-east4.gcp.omnitagjs.com',
        'visitor.omnitagjs.com',
        'contextual.media.net',
        'securepubads.g.doubleclick.net'
      ];
      
      // Fingerprinting domains (only block actual fingerprinting, not fonts)
      const fingerprintingPatterns = [
        'canvas-tmpl',
        'fingerprint',
        'device-id',
        'browser-fingerprint',
        'canvas-fingerprint',
        'idsync',
        'user-sync',
        'sync'
      ];
      
      // Allow essential resources even if they contain blocked patterns
      const allowedPatterns = [
        'secure.espn.com/core/api/v0/nav/index',
        'www.espn.com/watch/syndicatedplayer',
        'sp.auth.adobe.com/entitlement/v4/AccessEnablerProxy.html',
        'www.espn.com/login/responder/v4/index.html',
        'cdn.registerdisney.go.com/v4/bundle/web/ESPN-ONESITE.WEB',
        'www.espn.com/analytics/XDRemote.html',
        'www.google.com/recaptcha',
        'tpc.googlesyndication.com/sodar',
        'safeframe.googlesyndication.com/safeframe',
        'www.googletagmanager.com/static/service_worker',
        'fonts.googleapis.com',
        'fonts.gstatic.com',
        'a.espncdn.com/fonts',
        'cdn1.lockerdomecdn.com/fonts',
        'db.onlinewebfonts.com',
        'www.toyota.com/etc.clientlibs/tcom/clientlibs/clientlib-site/resources/fonts',
        'nexus.toyota.com/toyotanational/t-com-p/serverComponent.php',
        'duckduckgo.com/static-assets/font',
        'cdn.flashtalking.com/fonts',
        'secure.espncdn.com/ad/html5',
        'secure.espncdn.com/connected-devices',
        'secure.espn.com/core/',
        'espndotcom.tt.omtrdc.net/m2/espndotcom/mbox/json'
      ];
      
      // Check if URL contains allowed patterns first
      if (allowedPatterns.some(pattern => url.includes(pattern))) {
        callback({});
        return;
      }
      
      // Then check for blocked patterns
      if (blockedPatterns.some(pattern => url.includes(pattern))) {
        console.log('🚫 BLOCKED tracking:', url);
        
        // Send blocked request data to renderer for privacy dashboard
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('request-blocked', {
            url: url,
            type: 'tracker',
            category: getBlockCategory(url),
            timestamp: Date.now()
          });
        }
        
        callback({ cancel: true });
        return;
      }
      
      // Check for fingerprinting patterns (track but don't block)
      if (fingerprintingPatterns.some(pattern => url.includes(pattern))) {
        console.log('🚫 BLOCKED fingerprinting:', url);
        
        // Send blocked request data to renderer for privacy dashboard
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('request-blocked', {
            url: url,
            type: 'fingerprinting',
            category: 'Font Loading',
            timestamp: Date.now()
          });
        }
        
        callback({ cancel: true });
        return;
      }
      
      callback({});
    });
  }
}

// Advanced privacy features
function setupAdvancedPrivacy() {
  // Basic header modification - only add essential privacy headers
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    // Add basic privacy headers only
    details.requestHeaders['DNT'] = '1';
    details.requestHeaders['Sec-GPC'] = '1';
    
    callback({ requestHeaders: details.requestHeaders });
  });

  // Basic security headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = details.responseHeaders || {};
    
    // Add minimal security headers only
    responseHeaders['X-Content-Type-Options'] = ['nosniff'];
    
    callback({ responseHeaders });
  });
}

// Initialize advanced privacy features when app is ready
app.whenReady().then(() => {
  setupAdvancedPrivacy();
});

// Helper function to categorize blocked requests
function getBlockCategory(url) {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('google') || urlLower.includes('doubleclick') || urlLower.includes('googlesyndication')) {
    return 'Google Ads';
  }
  if (urlLower.includes('facebook') || urlLower.includes('fbcdn')) {
    return 'Facebook Tracking';
  }
  if (urlLower.includes('amazon-adsystem')) {
    return 'Amazon Ads';
  }
  if (urlLower.includes('analytics') || urlLower.includes('tracking')) {
    return 'Analytics';
  }
  if (urlLower.includes('ad') || urlLower.includes('banner') || urlLower.includes('sponsor')) {
    return 'Advertising';
  }
  if (urlLower.includes('font') || urlLower.includes('webfont')) {
    return 'Font Loading';
  }
  if (urlLower.includes('cdn') || urlLower.includes('static')) {
    return 'CDN/Static';
  }
  
  return 'Other';
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            createNewTab();
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
            const tab = tabs.find(t => t.id === activeTabId);
            if (tab) {
              tab.browserView.webContents.reload();
            }
          }
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

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

app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

app.on('browser-window-resized', () => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab) updateBrowserViewBounds(tab.browserView);
});

function addBookmark(bookmark) {
  const bookmarks = getStoreValue('bookmarks', []);
  const newBookmark = {
    id: Date.now(),
    title: bookmark.title,
    url: bookmark.url,
    added: new Date().toISOString()
  };
  bookmarks.push(newBookmark);
  store.set('bookmarks', bookmarks);
  mainWindow.webContents.send('bookmarks-updated', bookmarks);
}

function removeBookmark(bookmarkId) {
  const bookmarks = getStoreValue('bookmarks', []);
  const filteredBookmarks = bookmarks.filter(b => b.id !== bookmarkId);
  store.set('bookmarks', filteredBookmarks);
  mainWindow.webContents.send('bookmarks-updated', filteredBookmarks);
}

function getBookmarks() {
  return getStoreValue('bookmarks', []);
}

function injectPrivacyScripts(webContents) {
  const privacyScript = `
    (function() {
      // Enhanced Canvas fingerprinting protection
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        const context = originalGetContext.call(this, type, ...args);
        if (type === '2d') {
          const originalGetImageData = context.getImageData;
          context.getImageData = function(...args) {
            const imageData = originalGetImageData.call(this, ...args);
            // Add noise to prevent fingerprinting
            for (let i = 0; i < imageData.data.length; i += 4) {
              imageData.data[i] += Math.random() * 2 - 1;
              imageData.data[i + 1] += Math.random() * 2 - 1;
              imageData.data[i + 2] += Math.random() * 2 - 1;
            }
            return imageData;
          };
          
          const originalToDataURL = context.canvas.toDataURL;
          context.canvas.toDataURL = function(...args) {
            const dataURL = originalToDataURL.call(this, ...args);
            // Add subtle noise to prevent fingerprinting
            return dataURL;
          };
        }
        return context;
      };

      // WebGL fingerprinting protection
      const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        // Spoof WebGL parameters to prevent fingerprinting
        const spoofedParams = {
          0x1F00: 'Intel Inc.', // VENDOR
          0x1F01: 'Intel Iris OpenGL Engine', // RENDERER
          0x1F02: 'WebGL 1.0' // VERSION
        };
        
        if (spoofedParams[parameter]) {
          return spoofedParams[parameter];
        }
        
        return originalGetParameter.call(this, parameter);
      };

      // AudioContext fingerprinting protection
      const originalAudioContext = window.AudioContext || window.webkitAudioContext;
      if (originalAudioContext) {
        window.AudioContext = window.webkitAudioContext = function(...args) {
          const context = new originalAudioContext(...args);
          
          // Spoof audio fingerprinting
          const originalGetChannelData = context.createAnalyser().constructor.prototype.getChannelData;
          context.createAnalyser().constructor.prototype.getChannelData = function(channel) {
            const data = originalGetChannelData.call(this, channel);
            // Add subtle noise to prevent audio fingerprinting
            for (let i = 0; i < data.length; i++) {
              data[i] += (Math.random() - 0.5) * 0.0001;
            }
            return data;
          };
          
          return context;
        };
      }

      // Hardware fingerprinting protection
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 4, // Spoof CPU cores
        configurable: true
      });
      
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8, // Spoof device memory
        configurable: true
      });
      
      Object.defineProperty(navigator, 'connection', {
        get: () => ({
          effectiveType: '4g',
          downlink: 10,
          rtt: 50,
          saveData: false
        }),
        configurable: true
      });

      // Battery API protection
      if (navigator.getBattery) {
        const originalGetBattery = navigator.getBattery;
        navigator.getBattery = function() {
          return Promise.resolve({
            charging: true,
            chargingTime: 0,
            dischargingTime: Infinity,
            level: 0.8
          });
        };
      }

      // Geolocation protection
      if (navigator.geolocation) {
        const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
        navigator.geolocation.getCurrentPosition = function(success, error, options) {
          if (error) {
            error({ code: 1, message: 'User denied geolocation' });
          } else {
            success({
              coords: {
                latitude: 40.7128,
                longitude: -74.0060,
                accuracy: 1000,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null
              },
              timestamp: Date.now()
            });
          }
        };
      }

      // Conservative CSS-based ad blocking - only hide obvious ads
      const adBlockingCSS = \`
        /* Hide only obvious ad iframes */
        iframe[src*="doubleclick.net"],
        iframe[src*="googlesyndication.com"],
        iframe[src*="amazon-adsystem.com"],
        iframe[src*="facebook.com/plugins"],
        iframe[src*="adnxs.com"],
        iframe[src*="rubiconproject.com"],
        iframe[src*="casalemedia.com"],
        iframe[src*="openx.net"],
        iframe[src*="pubmatic.com"],
        iframe[src*="criteo.com"],
        iframe[src*="taboola.com"],
        iframe[src*="outbrain.com"],
        iframe[src*="media.net"],
        iframe[src*="indexww.com"],
        iframe[src*="tapad.com"],
        iframe[src*="bidswitch.net"],
        iframe[src*="sonobi.com"],
        iframe[src*="loopme.me"],
        iframe[src*="flashtalking.com"],
        iframe[src*="imrworldwide.com"],
        iframe[src*="scorecardresearch.com"],
        iframe[src*="omtrdc.net"],
        iframe[src*="bounceexchange.com"],
        iframe[src*="cdnwidget.com"],
        iframe[src*="creativedot2.net"],
        iframe[src*="aidemsrv.com"],
        iframe[src*="audienceexposure.com"],
        iframe[src*="yellowblue.io"],
        iframe[src*="omnitagjs.com"],
        iframe[src*="blismedia.com"],
        iframe[src*="minutemedia-prebid.com"],
        iframe[src*="visitor.us-east4.gcp.omnitagjs.com"],
        iframe[src*="visitor.omnitagjs.com"],
        iframe[src*="contextual.media.net"],
        iframe[src*="securepubads.g.doubleclick.net"] {
          display: none !important;
        }
        }
        
        /* Preserve navigation elements - ensure dropdowns work */
        nav, .nav, .navigation, .menu, .dropdown, .dropdown-menu,
        .navbar, .header, .toolbar, .breadcrumb, .sidebar,
        [class*="nav"], [class*="menu"], [class*="dropdown"],
        [id*="nav"], [id*="menu"], [id*="dropdown"] {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          height: auto !important;
          width: auto !important;
          position: static !important;
          left: auto !important;
          top: auto !important;
          pointer-events: auto !important;
          z-index: auto !important;
        }
        
        /* Ensure dropdown menus can be positioned properly */
        .dropdown-menu, [class*="dropdown-menu"] {
          position: absolute !important;
          z-index: 1000 !important;
        }
      \`;
      
      const style = document.createElement('style');
      style.textContent = adBlockingCSS;
      document.head.appendChild(style);

      // Disable aggressive event listeners that interfere with dropdown behavior
      // Let the website's own JavaScript handle interactions
      
      // Remove any existing event listeners that might interfere
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        // Allow all event listeners - don't interfere with website functionality
        return originalAddEventListener.call(this, type, listener, options);
      };

      // Conservative cookie protection - only block obvious tracking cookies
      const originalCookieDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie');
      if (originalCookieDescriptor && originalCookieDescriptor.configurable) {
        Object.defineProperty(document, 'cookie', {
          get: function() {
            return originalCookieDescriptor.get.call(this);
          },
          set: function(value) {
            // Only block obvious third-party tracking cookies
            const trackingTerms = ['_ga', '_fbp', '_gid', 'tracking', 'analytics'];
            const isTracking = trackingTerms.some(term => value.includes(term));
            
            if (isTracking && !value.includes('domain=' + window.location.hostname)) {
              console.log('🍪 BLOCKED tracking cookie:', value.substring(0, 50) + '...');
              return '';
            }
            
            return originalCookieDescriptor.set.call(this, value);
          },
          configurable: true
        });
      }

      // Conservative storage protection - only block obvious tracking data
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        // Only block obvious tracking storage
        const trackingTerms = ['_ga', '_fbp', '_gid', 'tracking', 'analytics'];
        const isTracking = trackingTerms.some(term => key.includes(term));
        
        if (isTracking) {
          console.log('💾 BLOCKED tracking storage:', key);
          return;
        }
        
        return originalSetItem.call(this, key, value);
      };

      // Enhanced IndexedDB protection - block tracking databases
      if (window.indexedDB) {
        const originalOpen = window.indexedDB.open;
        window.indexedDB.open = function(name, version) {
          // Block tracking databases but allow essential ones
          const trackingTerms = ['_ga', '_fbp', '_gid', 'tracking', 'analytics', 'ad_', 'ads_'];
          const isTracking = trackingTerms.some(term => name.includes(term));
          
          if (isTracking) {
            console.log('🗄️ BLOCKED tracking IndexedDB:', name);
            return null;
          }
          
          return originalOpen.call(this, name, version);
        };
      }

      // Block WebRTC to prevent IP leakage
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
        navigator.mediaDevices.getUserMedia = function(constraints) {
          return Promise.reject(new Error('Media access blocked for privacy'));
        };
      }

      // Block notifications
      if (Notification && Notification.requestPermission) {
        const originalRequestPermission = Notification.requestPermission;
        Notification.requestPermission = function() {
          return Promise.resolve('denied');
        };
      }

      // Block clipboard access
      if (navigator.clipboard) {
        const originalReadText = navigator.clipboard.readText;
        const originalWriteText = navigator.clipboard.writeText;
        
        navigator.clipboard.readText = function() {
          return Promise.reject(new Error('Clipboard read blocked for privacy'));
        };
        
        navigator.clipboard.writeText = function(text) {
          return Promise.reject(new Error('Clipboard write blocked for privacy'));
        };
      }

      // Block screen sharing
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
        navigator.mediaDevices.getDisplayMedia = function(constraints) {
          return Promise.reject(new Error('Screen sharing blocked for privacy'));
        };
      }

      // Remove problematic event listeners that interfere with dropdown behavior
      // Let the website's own JavaScript handle dropdown interactions
      
      console.log('🔒 Enhanced privacy protection activated');
    })();
  `;
  
  webContents.executeJavaScript(privacyScript);
}

// Download Manager Functions
function setupDownloadManager() {
  // Set up download behavior
  session.defaultSession.on('will-download', (event, item, webContents) => {
    const downloadId = nextDownloadId++;
    const downloadPath = path.join(os.homedir(), 'Downloads', item.getFilename());
    
    const download = {
      id: downloadId,
      filename: item.getFilename(),
      path: downloadPath,
      url: item.getURL(),
      size: item.getTotalBytes(),
      received: 0,
      status: 'downloading',
      startTime: Date.now(),
      item: item
    };
    
    downloads.push(download);
    
    // Notify renderer about new download
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('download-started', download);
    }
    
    item.setSavePath(downloadPath);
    
    item.on('updated', (event, state) => {
      download.received = item.getReceivedBytes();
      download.status = state;
      
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('download-updated', {
          id: downloadId,
          received: download.received,
          status: download.status
        });
      }
    });
    
    item.on('done', (event, state) => {
      download.status = state;
      download.endTime = Date.now();
      
      if (state === 'completed') {
        download.received = download.size;
        console.log(`✅ Download completed: ${download.filename}`);
      } else {
        console.log(`❌ Download failed: ${download.filename} - ${state}`);
      }
      
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('download-completed', {
          id: downloadId,
          status: download.status,
          path: download.path
        });
      }
      
      // Remove item reference to free memory
      download.item = null;
    });
  });
}

function getDownloads() {
  return downloads.map(download => ({
    id: download.id,
    filename: download.filename,
    path: download.path,
    url: download.url,
    size: download.size,
    received: download.received,
    status: download.status,
    startTime: download.startTime,
    endTime: download.endTime
  }));
}

function cancelDownload(downloadId) {
  const download = downloads.find(d => d.id === downloadId);
  if (download && download.item) {
    download.item.cancel();
    download.status = 'cancelled';
    
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('download-cancelled', { id: downloadId });
    }
  }
}

function openDownloadFolder() {
  const downloadsPath = path.join(os.homedir(), 'Downloads');
  shell.openPath(downloadsPath);
}

function openDownloadFile(downloadId) {
  const download = downloads.find(d => d.id === downloadId);
  if (download && download.status === 'completed') {
    shell.openPath(download.path);
  }
}

function clearCompletedDownloads() {
  downloads = downloads.filter(download => download.status === 'downloading');
  
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('downloads-cleared');
  }
}

// App initialization
app.whenReady().then(() => {
  console.log('🚀 Private Browser starting...');
  
  // Set up privacy session
  setupPrivacySession();
  
  // Create main window
  createWindow();
  
  // Set up download manager
  setupDownloadManager();
  
  // Set up menu
  createMenu();
  
  // Set up IPC handlers
  setupIPCHandlers();
  
  console.log('✅ Private Browser initialized');
});

// App event handlers
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  console.log('🔄 Private Browser shutting down...');
  
  // Clear any ongoing downloads
  downloads.forEach(download => {
    if (download.item && download.status === 'downloading') {
      download.item.cancel();
    }
  });
  
  // Clear analysis history
  clearContentAnalysisHistory();
  clearSummaryHistory();
  
  console.log('✅ Private Browser shutdown complete');
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('⚠️ Another instance is already running');
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}
