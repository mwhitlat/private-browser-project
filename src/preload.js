const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Tab management
  newTab: (url) => ipcRenderer.invoke('new-tab', url),
  closeTab: (tabId) => ipcRenderer.invoke('close-tab', tabId),
  switchTab: (tabId) => ipcRenderer.invoke('switch-tab', tabId),
  reorderTabs: (tabIds) => ipcRenderer.invoke('reorder-tabs', tabIds),
  
  // Bookmarks
  addBookmark: (bookmark) => ipcRenderer.invoke('add-bookmark', bookmark),
  removeBookmark: (bookmarkId) => ipcRenderer.invoke('remove-bookmark', bookmarkId),
  getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
  
  // Navigation
  navigate: (url) => ipcRenderer.invoke('navigate', url),
  navigateToUrl: (url) => ipcRenderer.invoke('navigate', url),
  goBack: () => ipcRenderer.invoke('go-back'),
  goForward: () => ipcRenderer.invoke('go-forward'),
  reload: () => ipcRenderer.invoke('reload'),
  
  // Get current state
  getCurrentUrl: () => ipcRenderer.invoke('get-current-url'),
  getNavigationState: () => ipcRenderer.invoke('get-navigation-state'),
  
  // BrowserView visibility control
  hideBrowserView: () => ipcRenderer.invoke('hide-browser-view'),
  showBrowserView: () => ipcRenderer.invoke('show-browser-view'),
  
  // Download Manager
  getDownloads: () => ipcRenderer.invoke('get-downloads'),
  cancelDownload: (downloadId) => ipcRenderer.invoke('cancel-download', downloadId),
  openDownloadFolder: () => ipcRenderer.invoke('open-download-folder'),
  openDownloadFile: (downloadId) => ipcRenderer.invoke('open-download-file', downloadId),
  clearCompletedDownloads: () => ipcRenderer.invoke('clear-completed-downloads'),
  
  // Listen for events from main process
  onTabList: (callback) => ipcRenderer.on('tab-list', callback),
  onTabEvent: (callback) => ipcRenderer.on('tab-event', callback),
  onBookmarksUpdated: (callback) => ipcRenderer.on('bookmarks-updated', callback),
  onBrowserViewLoading: (callback) => ipcRenderer.on('browser-view-loading', callback),
  onBrowserViewNavigate: (callback) => ipcRenderer.on('browser-view-navigate', callback),
  onBrowserViewTitle: (callback) => ipcRenderer.on('browser-view-title', callback),
  onRequestBlocked: (callback) => ipcRenderer.on('request-blocked', callback),
  
  // Download events
  onDownloadStarted: (callback) => ipcRenderer.on('download-started', callback),
  onDownloadUpdated: (callback) => ipcRenderer.on('download-updated', callback),
  onDownloadCompleted: (callback) => ipcRenderer.on('download-completed', callback),
  onDownloadCancelled: (callback) => ipcRenderer.on('download-cancelled', callback),
  onDownloadsCleared: (callback) => ipcRenderer.on('downloads-cleared', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Disable potentially privacy-invasive APIs
window.addEventListener('DOMContentLoaded', () => {
  // Disable geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition = () => {};
    navigator.geolocation.watchPosition = () => {};
  }
  
  // Disable notifications
  if (Notification) {
    Notification.requestPermission = () => Promise.resolve('denied');
  }
  
  // Disable WebRTC
  if (window.RTCPeerConnection) {
    window.RTCPeerConnection = undefined;
  }
  
  // Disable canvas fingerprinting
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
    }
    return context;
  };
  
  // Disable audio fingerprinting
  if (window.AudioContext) {
    const originalGetChannelData = AudioBuffer.prototype.getChannelData;
    AudioBuffer.prototype.getChannelData = function(channel) {
      const data = originalGetChannelData.call(this, channel);
      // Add minimal noise to prevent fingerprinting
      for (let i = 0; i < data.length; i++) {
        data[i] += (Math.random() - 0.5) * 0.0001;
      }
      return data;
    };
  }
});
