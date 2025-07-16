const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Tab management
  newTab: () => ipcRenderer.send('new-tab'),
  closeTab: () => ipcRenderer.send('close-tab'),
  
  // Privacy controls
  openPrivacySettings: () => ipcRenderer.send('open-privacy-settings'),
  clearAllData: () => ipcRenderer.send('clear-all-data'),
  
  // Navigation
  navigate: (url) => ipcRenderer.send('navigate', url),
  goBack: () => ipcRenderer.send('go-back'),
  goForward: () => ipcRenderer.send('go-forward'),
  reload: () => ipcRenderer.send('reload'),
  
  // Listeners
  onTabUpdate: (callback) => ipcRenderer.on('tab-update', callback),
  onPrivacySettingsOpen: (callback) => ipcRenderer.on('open-privacy-settings', callback),
  
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
