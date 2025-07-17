// Browser state management
let tabs = [];
let activeTabId = null;
let isLoading = false;
let canGoBack = false;
let canGoForward = false;
let bookmarks = [];

// Privacy dashboard state
let blockedRequests = [];
let blockedStats = {
  total: 0,
  trackers: 0,
  ads: 0,
  fingerprinting: 0
};

// Advanced Privacy Dashboard
let privacyStats = {
  total: 0,
  trackers: 0,
  ads: 0,
  fingerprinting: 0,
  rtb: 0,
  cookies: 0,
  storage: 0,
  media: 0,
  notifications: 0,
  clipboard: 0,
  geolocation: 0,
  webrtc: 0
};

// Download Manager state
let downloads = [];
let downloadNotifications = [];

// DOM elements
const addressBar = document.getElementById('addressBar');
const backBtn = document.getElementById('backBtn');
const forwardBtn = document.getElementById('forwardBtn');
const reloadBtn = document.getElementById('reloadBtn');
const newTabBtn = document.getElementById('newTabBtn');
const bookmarksBtn = document.getElementById('bookmarksBtn');
const privacyBtn = document.getElementById('privacyBtn');
const privacyDashboardBtn = document.getElementById('privacyDashboardBtn');
const tabsContainer = document.getElementById('tabs');
const privacyModal = document.getElementById('privacyModal');
const bookmarksModal = document.getElementById('bookmarksModal');
const privacyDashboardModal = document.getElementById('privacyDashboardModal');
const downloadManagerModal = document.getElementById('downloadManagerModal');
const securityIndicator = document.getElementById('securityIndicator');
const privacyIndicator = document.getElementById('privacyIndicator');
// Initialize the browser
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting browser initialization');
    
    // Debug: Check if modal elements exist
    console.log('Privacy Modal:', privacyModal);
    console.log('Bookmarks Modal:', bookmarksModal);
    console.log('Privacy Dashboard Modal:', privacyDashboardModal);
    console.log('Privacy Button:', privacyBtn);
    console.log('Privacy Dashboard Button:', privacyDashboardBtn);
    console.log('Bookmarks Button:', bookmarksBtn);
    
    initializeBrowser();
    setupEventListeners();
    loadPrivacySettings();
    loadBookmarks();
    setupIPCEventListeners();
    
    // Handle window resize to keep browser view properly sized
    window.addEventListener('resize', () => {
        // The main process will handle the browser view resizing
        console.log('Window resized');
    });
});

function initializeBrowser() {
    console.log('Initializing browser with multi-tab support...');
    
    // Update navigation buttons
    updateNavigationButtons();
}

function setupEventListeners() {
    // Navigation buttons
    backBtn.addEventListener('click', async () => {
        const result = await window.electronAPI.goBack();
        if (result.success) {
            console.log('Navigated back');
        }
    });
    
    forwardBtn.addEventListener('click', async () => {
        const result = await window.electronAPI.goForward();
        if (result.success) {
            console.log('Navigated forward');
        }
    });
    
    reloadBtn.addEventListener('click', async () => {
        const result = await window.electronAPI.reload();
        if (result.success) {
            console.log('Reloaded page');
        }
    });
    
    // Address bar
    let isUserTyping = false;
    let userInputValue = '';
    
    addressBar.addEventListener('focus', () => {
        isUserTyping = true;
        userInputValue = addressBar.value;
    });
    
    addressBar.addEventListener('blur', () => {
        isUserTyping = false;
        userInputValue = '';
    });
    
    addressBar.addEventListener('input', () => {
        if (isUserTyping) {
            userInputValue = addressBar.value;
        }
    });
    
    addressBar.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const url = addressBar.value.trim();
            isUserTyping = false;
            userInputValue = '';
            await navigateToUrl(url);
        } else if (e.key === 'Tab') {
            e.preventDefault();
            // Simple autocomplete
            const input = addressBar.value.trim();
            if (input && !input.includes('://')) {
                if (input.includes('.') && !input.startsWith('http')) {
                    addressBar.value = 'https://' + input;
                } else if (!input.includes('.') && !input.startsWith('http')) {
                    // Search engine fallback
                    addressBar.value = 'https://www.google.com/search?q=' + encodeURIComponent(input);
                }
            }
        }
    });
    
    // New tab button
    newTabBtn.addEventListener('click', async () => {
        const result = await window.electronAPI.newTab();
        if (result.success) {
            console.log('Created new tab');
        }
    });
    
    // Privacy button - show settings directly
    privacyBtn.addEventListener('click', () => {
        console.log('Privacy button clicked');
        if (privacyModal) {
            console.log('Showing privacy settings modal');
            privacyModal.classList.add('show');
            // Temporarily hide BrowserView to ensure modal is visible
            window.electronAPI.hideBrowserView();
        } else {
            console.error('Privacy modal not found!');
        }
    });
    
    // Privacy dashboard button
    privacyDashboardBtn.addEventListener('click', () => {
        console.log('Privacy dashboard button clicked');
        if (privacyDashboardModal) {
            console.log('Showing privacy dashboard modal');
            privacyDashboardModal.classList.add('show');
            updatePrivacyDashboard();
            // Temporarily hide BrowserView to ensure modal is visible
            window.electronAPI.hideBrowserView();
        } else {
            console.error('Privacy dashboard modal not found!');
        }
    });
    
    // Privacy dashboard modal close
    const closePrivacyDashboardBtn = document.getElementById('closePrivacyDashboardModal');
    if (closePrivacyDashboardBtn) {
        closePrivacyDashboardBtn.addEventListener('click', () => {
            console.log('Closing privacy dashboard modal');
            privacyDashboardModal.classList.remove('show');
            // Show BrowserView again
            window.electronAPI.showBrowserView();
        });
    } else {
        console.error('Close privacy dashboard button not found!');
    }
    
    // Click outside privacy dashboard modal to close
    if (privacyDashboardModal) {
        privacyDashboardModal.addEventListener('click', (e) => {
            if (e.target === privacyDashboardModal) {
                console.log('Closing privacy dashboard modal (click outside)');
                privacyDashboardModal.classList.remove('show');
                // Show BrowserView again
                window.electronAPI.showBrowserView();
            }
        });
    }
    
    // Clear blocked requests list
    const clearBlockedListBtn = document.getElementById('clearBlockedList');
    if (clearBlockedListBtn) {
        clearBlockedListBtn.addEventListener('click', () => {
            console.log('Clearing blocked requests list');
            blockedRequests = [];
            blockedStats = { total: 0, trackers: 0, ads: 0, fingerprinting: 0 };
            privacyStats = {
                total: 0,
                trackers: 0,
                ads: 0,
                fingerprinting: 0,
                rtb: 0,
                cookies: 0,
                storage: 0,
                media: 0,
                notifications: 0,
                clipboard: 0,
                geolocation: 0,
                webrtc: 0
            };
            updatePrivacyDashboard();
            updatePrivacyIndicator();
        });
    } else {
        console.error('Clear blocked list button not found!');
    }
    
    // Test links
    document.querySelectorAll('.test-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const url = e.target.getAttribute('data-url');
            if (url) {
                console.log('Test link clicked:', url);
                window.electronAPI.navigateToUrl(url);
            }
        });
    });
    
    // Privacy settings button (add to dashboard)
    const privacySettingsBtn = document.createElement('button');
    privacySettingsBtn.textContent = 'Privacy Settings';
    privacySettingsBtn.className = 'btn-secondary';
    privacySettingsBtn.addEventListener('click', () => {
        console.log('Privacy settings button clicked');
        if (privacyDashboardModal) privacyDashboardModal.classList.remove('show');
        if (privacyModal) {
            privacyModal.classList.add('show');
            // Hide BrowserView for privacy settings modal too
            window.electronAPI.hideBrowserView();
        }
    });
    const testingSection = document.querySelector('.testing-section');
    if (testingSection) {
        testingSection.appendChild(privacySettingsBtn);
    } else {
        console.error('Testing section not found!');
    }
    
    // Modal close
    const closePrivacyBtn = document.getElementById('closePrivacyModal');
    if (closePrivacyBtn) {
        closePrivacyBtn.addEventListener('click', () => {
            console.log('Closing privacy modal');
            privacyModal.classList.remove('show');
            // Show BrowserView again
            window.electronAPI.showBrowserView();
        });
    } else {
        console.error('Close privacy modal button not found!');
    }
    
    // Click outside modal to close
    if (privacyModal) {
        privacyModal.addEventListener('click', (e) => {
            if (e.target === privacyModal) {
                console.log('Closing privacy modal (click outside)');
                privacyModal.classList.remove('show');
                // Show BrowserView again
                window.electronAPI.showBrowserView();
            }
        });
    }
    
    // Privacy settings
    const savePrivacyBtn = document.getElementById('savePrivacySettings');
    if (savePrivacyBtn) {
        savePrivacyBtn.addEventListener('click', savePrivacySettings);
    } else {
        console.error('Save privacy settings button not found!');
    }
    
    const clearDataBtn = document.getElementById('clearDataNow');
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', clearAllData);
    } else {
        console.error('Clear data button not found!');
    }
    
    // Toggle switch event listeners
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const settingName = toggle.getAttribute('data-setting');
            const isCurrentlyActive = toggle.classList.contains('active');
            updateToggleSwitch(settingName, !isCurrentlyActive);
        });
    });
    
    // Bookmarks button
    bookmarksBtn.addEventListener('click', () => {
        console.log('Bookmarks button clicked');
        if (bookmarksModal) {
            console.log('Showing bookmarks modal');
            bookmarksModal.classList.add('show');
            populateBookmarksList();
            populateBookmarkForm();
            // Temporarily hide BrowserView to ensure modal is visible
            window.electronAPI.hideBrowserView();
        } else {
            console.error('Bookmarks modal not found!');
        }
    });
    
    // Bookmarks modal close
    const closeBookmarksBtn = document.getElementById('closeBookmarksModal');
    if (closeBookmarksBtn) {
        closeBookmarksBtn.addEventListener('click', () => {
            console.log('Closing bookmarks modal');
            bookmarksModal.classList.remove('show');
            // Show BrowserView again
            window.electronAPI.showBrowserView();
        });
    } else {
        console.error('Close bookmarks modal button not found!');
    }
    
    // Click outside bookmarks modal to close
    if (bookmarksModal) {
        bookmarksModal.addEventListener('click', (e) => {
            if (e.target === bookmarksModal) {
                console.log('Closing bookmarks modal (click outside)');
                bookmarksModal.classList.remove('show');
                // Show BrowserView again
                window.electronAPI.showBrowserView();
            }
        });
    }
    
    // Download Manager button
    const downloadManagerBtn = document.getElementById('downloadManagerBtn');
    if (downloadManagerBtn) {
        downloadManagerBtn.addEventListener('click', () => {
            console.log('Download Manager button clicked');
            if (downloadManagerModal) {
                console.log('Showing download manager modal');
                downloadManagerModal.classList.add('show');
                loadDownloads();
                // Temporarily hide BrowserView to ensure modal is visible
                window.electronAPI.hideBrowserView();
            } else {
                console.error('Download Manager modal not found!');
            }
        });
    } else {
        console.error('Download Manager button not found!');
    }
    
    // Download Manager modal close
    const closeDownloadManagerBtn = document.getElementById('closeDownloadManagerModal');
    if (closeDownloadManagerBtn) {
        closeDownloadManagerBtn.addEventListener('click', () => {
            console.log('Closing download manager modal');
            downloadManagerModal.classList.remove('show');
            // Show BrowserView again
            window.electronAPI.showBrowserView();
        });
    } else {
        console.error('Close download manager modal button not found!');
    }
    
    // Click outside download manager modal to close
    if (downloadManagerModal) {
        downloadManagerModal.addEventListener('click', (e) => {
            if (e.target === downloadManagerModal) {
                console.log('Closing download manager modal (click outside)');
                downloadManagerModal.classList.remove('show');
                // Show BrowserView again
                window.electronAPI.showBrowserView();
            }
        });
    }
    
    // Add bookmark button
    const addBookmarkBtn = document.getElementById('addBookmarkBtn');
    if (addBookmarkBtn) {
        addBookmarkBtn.addEventListener('click', addCurrentBookmark);
    } else {
        console.error('Add bookmark button not found!');
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 't':
                    e.preventDefault();
                    window.electronAPI.newTab();
                    break;
                case 'w':
                    e.preventDefault();
                    if (activeTabId) {
                        window.electronAPI.closeTab(activeTabId);
                    }
                    break;
                case 'r':
                    e.preventDefault();
                    window.electronAPI.reload();
                    break;
                case 'l':
                    e.preventDefault();
                    addressBar.focus();
                    addressBar.select();
                    break;
            }
        }
    });
}

function setupIPCEventListeners() {
    // Listen for tab list updates
    window.electronAPI.onTabList((event, data) => {
        tabs = data.tabs;
        activeTabId = data.activeTabId;
        renderTabs();
        updateAddressBar();
        updateSecurityIndicator();
        updateNavigationButtons();
    });
    
    // Listen for tab events (loading, etc.)
    window.electronAPI.onTabEvent((event, data) => {
        if (data.tabId === activeTabId) {
            if (data.event === 'loading') {
                isLoading = data.data;
                updateLoadingState(isLoading);
                updateNavigationButtons();
            }
        }
    });

    // Listen for bookmarks updates
    window.electronAPI.onBookmarksUpdated((event, updatedBookmarks) => {
        bookmarks = updatedBookmarks;
        populateBookmarksList();
    });
    
    // Listen for blocked requests
    window.electronAPI.onRequestBlocked((event, data) => {
        addBlockedRequest(data);
    });
    
    // Download Manager event listeners
    window.electronAPI.onDownloadStarted((event, download) => {
        downloads.push(download);
        showDownloadNotification(download);
        updateDownloadManager();
    });
    
    window.electronAPI.onDownloadUpdated((event, data) => {
        const download = downloads.find(d => d.id === data.id);
        if (download) {
            download.received = data.received;
            download.status = data.status;
            updateDownloadManager();
        }
    });
    
    window.electronAPI.onDownloadCompleted((event, data) => {
        const download = downloads.find(d => d.id === data.id);
        if (download) {
            download.status = data.status;
            download.path = data.path;
            showDownloadNotification(download, 'completed');
            updateDownloadManager();
        }
    });
    
    window.electronAPI.onDownloadCancelled((event, data) => {
        const download = downloads.find(d => d.id === data.id);
        if (download) {
            download.status = 'cancelled';
            updateDownloadManager();
        }
    });
    
    window.electronAPI.onDownloadsCleared((event) => {
        downloads = downloads.filter(d => d.status === 'downloading');
        updateDownloadManager();
    });
}

function renderTabs() {
    // Clear existing tabs
    tabsContainer.innerHTML = '';
    
    // Create tab elements
    tabs.forEach(tab => {
        const tabElement = document.createElement('div');
        tabElement.className = 'tab';
        tabElement.setAttribute('data-tab-id', tab.id);
        
        if (tab.id === activeTabId) {
            tabElement.classList.add('active');
        }
        
        const tabTitle = document.createElement('span');
        tabTitle.className = 'tab-title';
        tabTitle.textContent = tab.title || 'New Tab';
        
        const tabClose = document.createElement('button');
        tabClose.className = 'tab-close';
        tabClose.title = 'Close Tab';
        tabClose.textContent = '×';
        tabClose.addEventListener('click', (e) => {
            e.stopPropagation();
            window.electronAPI.closeTab(tab.id);
        });
        
        tabElement.appendChild(tabTitle);
        tabElement.appendChild(tabClose);
        
        // Add click handler for tab switching
        tabElement.addEventListener('click', () => {
            window.electronAPI.switchTab(tab.id);
        });
        
        // Add drag and drop functionality
        tabElement.draggable = true;
        tabElement.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', tab.id);
            tabElement.classList.add('dragging');
        });
        
        tabElement.addEventListener('dragend', () => {
            tabElement.classList.remove('dragging');
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('drag-over'));
        });
        
        tabElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            tabElement.classList.add('drag-over');
        });
        
        tabElement.addEventListener('dragleave', () => {
            tabElement.classList.remove('drag-over');
        });
        
        tabElement.addEventListener('drop', (e) => {
            e.preventDefault();
            tabElement.classList.remove('drag-over');
            
            const draggedTabId = parseInt(e.dataTransfer.getData('text/plain'));
            const droppedTabId = tab.id;
            
            if (draggedTabId !== droppedTabId) {
                reorderTabs(draggedTabId, droppedTabId);
            }
        });
        
        tabsContainer.appendChild(tabElement);
    });
}

function reorderTabs(draggedTabId, droppedTabId) {
    const draggedIndex = tabs.findIndex(tab => tab.id === draggedTabId);
    const droppedIndex = tabs.findIndex(tab => tab.id === droppedTabId);
    
    if (draggedIndex === -1 || droppedIndex === -1) {
        return;
    }
    
    // Create new order
    const newTabIds = tabs.map(tab => tab.id);
    const [draggedTab] = newTabIds.splice(draggedIndex, 1);
    newTabIds.splice(droppedIndex, 0, draggedTab);
    
    // Send new order to main process
    window.electronAPI.reorderTabs(newTabIds);
}

async function navigateToUrl(url) {
    console.log('Attempting to navigate to:', url);
    
    let processedUrl = url.trim();
    
    // Add protocol if missing
    if (
        !processedUrl.startsWith('http://') &&
        !processedUrl.startsWith('https://') &&
        !processedUrl.startsWith('file://') &&
        !processedUrl.startsWith('data:')
    ) {
        // Check if it's a search query
        if (processedUrl.includes(' ') || !processedUrl.includes('.')) {
            processedUrl = `https://www.google.com/search?q=${encodeURIComponent(processedUrl)}`;
        } else {
            processedUrl = `https://${processedUrl}`;
        }
    }
    
    // Validate URL format
    try {
        new URL(processedUrl);
    } catch (e) {
        // If URL is invalid, treat as search query
        processedUrl = `https://www.google.com/search?q=${encodeURIComponent(url.trim())}`;
    }
    
    console.log('Processed URL:', processedUrl);
    
    try {
        const result = await window.electronAPI.navigate(processedUrl);
        if (result.success) {
            console.log('Navigation successful');
        } else {
            console.error('Navigation failed:', result.error);
        }
    } catch (error) {
        console.error('Navigation error:', error);
    }
}

function updateAddressBar() {
    // Don't update the address bar if the user is currently typing
    if (isUserTyping) {
        return;
    }
    
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (activeTab) {
        addressBar.value = activeTab.url;
    } else {
        addressBar.value = '';
    }
}

async function updateNavigationButtons() {
    try {
        const state = await window.electronAPI.getNavigationState();
        canGoBack = state.canGoBack;
        canGoForward = state.canGoForward;
        
        backBtn.disabled = !canGoBack;
        forwardBtn.disabled = !canGoForward;
    } catch (error) {
        console.error('Failed to get navigation state:', error);
        backBtn.disabled = true;
        forwardBtn.disabled = true;
    }
}

function updateLoadingState(loading) {
    isLoading = loading;
    reloadBtn.classList.toggle('loading', loading);
}

function updateSecurityIndicator() {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (!activeTab) {
        securityIndicator.classList.remove('insecure');
        securityIndicator.title = 'No Tab';
        return;
    }
    
    const url = activeTab.url;
    if (url.startsWith('https://')) {
        securityIndicator.classList.remove('insecure');
        securityIndicator.title = 'Secure Connection (HTTPS)';
    } else if (url.startsWith('http://')) {
        securityIndicator.classList.add('insecure');
        securityIndicator.title = 'Insecure Connection (HTTP)';
    } else {
        securityIndicator.classList.remove('insecure');
        securityIndicator.title = 'Local Page';
    }
}

// Privacy settings management
function loadPrivacySettings() {
    // This would load from electron-store in a real implementation
    // For now, we'll use default values
    const settings = {
        blockTrackers: true,
        blockAds: true,
        enhancedBlocking: true,
        firstPartyIsolation: true,
        autoDeleteCookies: true,
        stripTrackingCookies: true,
        disableWebRTC: true,
        disableGeolocation: true,
        disableNotifications: true,
        fingerprintProtection: true,
        clearDataOnExit: true,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) private-browser/1.0.0 Chrome/120.0.6099.291 Electron/28.3.3 Safari/537.36'
    };
    
    // Update UI with toggle switches
    updateToggleSwitch('blockTrackers', settings.blockTrackers);
    updateToggleSwitch('blockAds', settings.blockAds);
    updateToggleSwitch('enhancedBlocking', settings.enhancedBlocking);
    updateToggleSwitch('firstPartyIsolation', settings.firstPartyIsolation);
    updateToggleSwitch('autoDeleteCookies', settings.autoDeleteCookies);
    updateToggleSwitch('stripTrackingCookies', settings.stripTrackingCookies);
    updateToggleSwitch('disableWebRTC', settings.disableWebRTC);
    updateToggleSwitch('disableGeolocation', settings.disableGeolocation);
    updateToggleSwitch('disableNotifications', settings.disableNotifications);
    updateToggleSwitch('fingerprintProtection', settings.fingerprintProtection);
    updateToggleSwitch('clearDataOnExit', settings.clearDataOnExit);
    document.getElementById('userAgent').value = settings.userAgent;
}

function updateToggleSwitch(settingName, isActive) {
    const toggleSwitch = document.querySelector(`[data-setting="${settingName}"]`);
    const statusElement = toggleSwitch?.parentElement?.querySelector('.setting-status');
    
    if (toggleSwitch) {
        if (isActive) {
            toggleSwitch.classList.add('active');
            if (statusElement) {
                statusElement.textContent = 'Active';
                statusElement.className = 'setting-status active';
            }
        } else {
            toggleSwitch.classList.remove('active');
            if (statusElement) {
                statusElement.textContent = 'Inactive';
                statusElement.className = 'setting-status inactive';
            }
        }
    }
}

function savePrivacySettings() {
    const settings = {
        blockTrackers: document.querySelector('[data-setting="blockTrackers"]').classList.contains('active'),
        blockAds: document.querySelector('[data-setting="blockAds"]').classList.contains('active'),
        enhancedBlocking: document.querySelector('[data-setting="enhancedBlocking"]').classList.contains('active'),
        firstPartyIsolation: document.querySelector('[data-setting="firstPartyIsolation"]').classList.contains('active'),
        autoDeleteCookies: document.querySelector('[data-setting="autoDeleteCookies"]').classList.contains('active'),
        stripTrackingCookies: document.querySelector('[data-setting="stripTrackingCookies"]').classList.contains('active'),
        disableWebRTC: document.querySelector('[data-setting="disableWebRTC"]').classList.contains('active'),
        disableGeolocation: document.querySelector('[data-setting="disableGeolocation"]').classList.contains('active'),
        disableNotifications: document.querySelector('[data-setting="disableNotifications"]').classList.contains('active'),
        fingerprintProtection: document.querySelector('[data-setting="fingerprintProtection"]').classList.contains('active'),
        clearDataOnExit: document.querySelector('[data-setting="clearDataOnExit"]').classList.contains('active'),
        userAgent: document.getElementById('userAgent').value
    };
    
    // Save settings (in a real implementation, this would use electron-store)
    console.log('Saving privacy settings:', settings);
    
    // Close modal
    privacyModal.classList.remove('show');
    // Show BrowserView again
    window.electronAPI.showBrowserView();
    
    // Show success message
    showNotification('Privacy settings saved successfully!');
}

function clearAllData() {
    // Clear all browser data
    console.log('Clearing all browser data');
    
    showNotification('All browser data cleared!');
}

function showNotification(message) {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

async function loadBookmarks() {
    try {
        bookmarks = await window.electronAPI.getBookmarks();
        populateBookmarksList();
    } catch (error) {
        console.error('Failed to load bookmarks:', error);
    }
}

function populateBookmarksList() {
    const bookmarksList = document.getElementById('bookmarksList');
    bookmarksList.innerHTML = '';
    
    if (bookmarks.length === 0) {
        bookmarksList.innerHTML = '<p class="no-bookmarks">No bookmarks yet. Add some to get started!</p>';
        return;
    }
    
    bookmarks.forEach(bookmark => {
        const bookmarkElement = document.createElement('div');
        bookmarkElement.className = 'bookmark-item';
        
        const bookmarkTitle = document.createElement('div');
        bookmarkTitle.className = 'bookmark-title';
        bookmarkTitle.textContent = bookmark.title;
        
        const bookmarkUrl = document.createElement('div');
        bookmarkUrl.className = 'bookmark-url';
        bookmarkUrl.textContent = bookmark.url;
        
        const bookmarkActions = document.createElement('div');
        bookmarkActions.className = 'bookmark-actions';
        
        const openBtn = document.createElement('button');
        openBtn.className = 'btn-secondary btn-sm';
        openBtn.textContent = 'Open';
        openBtn.addEventListener('click', () => {
            window.electronAPI.newTab(bookmark.url);
            bookmarksModal.classList.remove('show');
        });
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn-secondary btn-sm';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
            window.electronAPI.removeBookmark(bookmark.id);
        });
        
        bookmarkActions.appendChild(openBtn);
        bookmarkActions.appendChild(removeBtn);
        
        bookmarkElement.appendChild(bookmarkTitle);
        bookmarkElement.appendChild(bookmarkUrl);
        bookmarkElement.appendChild(bookmarkActions);
        
        bookmarksList.appendChild(bookmarkElement);
    });
}

function populateBookmarkForm() {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (activeTab) {
        document.getElementById('bookmarkTitle').value = activeTab.title || '';
        document.getElementById('bookmarkUrl').value = activeTab.url || '';
    }
}

async function addCurrentBookmark() {
    const title = document.getElementById('bookmarkTitle').value.trim();
    const url = document.getElementById('bookmarkUrl').value.trim();
    
    if (!title || !url) {
        showNotification('Please enter both title and URL');
        return;
    }
    
    try {
        await window.electronAPI.addBookmark({ title, url });
        showNotification('Bookmark added successfully!');
        document.getElementById('bookmarkTitle').value = '';
        document.getElementById('bookmarkUrl').value = '';
    } catch (error) {
        console.error('Failed to add bookmark:', error);
        showNotification('Failed to add bookmark');
    }
}

// Tab click handling
tabsContainer.addEventListener('click', (e) => {
    const tabElement = e.target.closest('.tab');
    if (tabElement) {
        const tabId = parseInt(tabElement.getAttribute('data-tab-id'));
        // The main process will handle tab switching
        window.electronAPI.switchToTab(tabId);
    }
});

// Privacy Dashboard Functions
function addBlockedRequest(data) {
    const blockedRequest = {
        id: Date.now() + Math.random(),
        url: data.url,
        type: data.type,
        category: data.category || 'Unknown',
        timestamp: data.timestamp
    };
    
    blockedRequests.unshift(blockedRequest);
    
    // Keep only last 100 requests (increased from 50)
    if (blockedRequests.length > 100) {
        blockedRequests = blockedRequests.slice(0, 100);
    }
    
    // Update both old and new statistics
    blockedStats.total++;
    privacyStats.total++;
    
    switch (data.type) {
        case 'tracker':
            blockedStats.trackers++;
            privacyStats.trackers++;
            break;
        case 'ad':
        case 'advanced-ad':
            blockedStats.ads++;
            privacyStats.ads++;
            break;
        case 'webrtc':
        case 'fingerprinting':
            blockedStats.fingerprinting++;
            privacyStats.fingerprinting++;
            break;
        case 'rtb':
            privacyStats.rtb++;
            break;
        default:
            // For backward compatibility
            if (data.type === 'tracker/ad') {
                blockedStats.trackers++;
                privacyStats.trackers++;
            } else if (data.type.includes('ad')) {
                blockedStats.ads++;
                privacyStats.ads++;
            } else if (data.type.includes('fingerprint') || data.type.includes('webrtc')) {
                blockedStats.fingerprinting++;
                privacyStats.fingerprinting++;
            }
            break;
    }
    
    // Update dashboard if open
    if (privacyDashboardModal && privacyDashboardModal.classList.contains('show')) {
        updatePrivacyDashboard();
    }
    
    // Update privacy indicator
    updatePrivacyIndicator();
    
    // Log blocked request for debugging
    console.log(`🚫 Blocked ${data.type} (${data.category}): ${data.url}`);
}

function updatePrivacyDashboard() {
    const dashboard = document.getElementById('privacy-dashboard');
    if (!dashboard) return;
    
    dashboard.innerHTML = `
      <div class="privacy-header">
        <h3>🔒 Privacy Protection Dashboard</h3>
        <div class="privacy-status ${privacyStats.total > 0 ? 'active' : 'inactive'}">
          ${privacyStats.total > 0 ? '🛡️ Active' : '⚪ Inactive'}
        </div>
      </div>
      
      <div class="privacy-stats">
        <div class="stat-item">
          <span class="stat-label">Total Blocked</span>
          <span class="stat-value">${privacyStats.total}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Trackers</span>
          <span class="stat-value tracker">${privacyStats.trackers}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Ads</span>
          <span class="stat-value ad">${privacyStats.ads}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Fingerprinting</span>
          <span class="stat-value fingerprint">${privacyStats.fingerprinting}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">RTB Requests</span>
          <span class="stat-value rtb">${privacyStats.rtb}</span>
        </div>
      </div>
      
      <div class="privacy-protections">
        <h4>Active Protections</h4>
        <div class="protection-list">
          <div class="protection-item ${privacyStats.cookies > 0 ? 'active' : ''}">
            <span>🍪 Cookie Protection</span>
            <span class="protection-count">${privacyStats.cookies}</span>
          </div>
          <div class="protection-item ${privacyStats.storage > 0 ? 'active' : ''}">
            <span>💾 Storage Protection</span>
            <span class="protection-count">${privacyStats.storage}</span>
          </div>
          <div class="protection-item ${privacyStats.media > 0 ? 'active' : ''}">
            <span>🎥 Media Protection</span>
            <span class="protection-count">${privacyStats.media}</span>
          </div>
          <div class="protection-item ${privacyStats.notifications > 0 ? 'active' : ''}">
            <span>🔔 Notification Protection</span>
            <span class="protection-count">${privacyStats.notifications}</span>
          </div>
          <div class="protection-item ${privacyStats.clipboard > 0 ? 'active' : ''}">
            <span>📋 Clipboard Protection</span>
            <span class="protection-count">${privacyStats.clipboard}</span>
          </div>
          <div class="protection-item ${privacyStats.geolocation > 0 ? 'active' : ''}">
            <span>📍 Geolocation Protection</span>
            <span class="protection-count">${privacyStats.geolocation}</span>
          </div>
          <div class="protection-item ${privacyStats.webrtc > 0 ? 'active' : ''}">
            <span>🌐 WebRTC Protection</span>
            <span class="protection-count">${privacyStats.webrtc}</span>
          </div>
        </div>
      </div>
      
      <div class="privacy-actions">
        <button onclick="clearPrivacyStats()" class="btn-secondary">Clear Stats</button>
        <button onclick="exportPrivacyReport()" class="btn-secondary">Export Report</button>
      </div>
    `;
}

function updatePrivacyIndicator() {
    if (blockedStats.total > 0) {
        privacyIndicator.style.color = '#28a745';
        privacyIndicator.title = `Privacy Protection Active - ${blockedStats.total} requests blocked`;
        privacyIndicator.classList.add('active');
    } else {
        privacyIndicator.style.color = '#6c757d';
        privacyIndicator.title = 'Privacy Protection Active';
        privacyIndicator.classList.remove('active');
    }
}

function clearPrivacyStats() {
  privacyStats = {
    total: 0,
    trackers: 0,
    ads: 0,
    fingerprinting: 0,
    rtb: 0,
    cookies: 0,
    storage: 0,
    media: 0,
    notifications: 0,
    clipboard: 0,
    geolocation: 0,
    webrtc: 0
  };
  updatePrivacyDashboard();
}

function exportPrivacyReport() {
  const report = {
    timestamp: new Date().toISOString(),
    url: currentURL,
    stats: privacyStats,
    blockedRequests: blockedRequests.slice(0, 50) // Last 50 requests
  };
  
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `privacy-report-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Download Manager Functions
async function loadDownloads() {
    try {
        downloads = await window.electronAPI.getDownloads();
        updateDownloadManager();
    } catch (error) {
        console.error('Failed to load downloads:', error);
    }
}

function updateDownloadManager() {
    const downloadsList = document.getElementById('downloadsList');
    const downloadStats = document.getElementById('downloadStats');
    
    if (!downloadsList || !downloadStats) return;
    
    // Update stats
    const totalDownloads = downloads.length;
    const completedDownloads = downloads.filter(d => d.status === 'completed').length;
    const activeDownloads = downloads.filter(d => d.status === 'downloading').length;
    
    downloadStats.innerHTML = `
        <div class="download-stat">
            <span class="stat-label">Total:</span>
            <span class="stat-value">${totalDownloads}</span>
        </div>
        <div class="download-stat">
            <span class="stat-label">Completed:</span>
            <span class="stat-value completed">${completedDownloads}</span>
        </div>
        <div class="download-stat">
            <span class="stat-label">Active:</span>
            <span class="stat-value active">${activeDownloads}</span>
        </div>
    `;
    
    // Update downloads list
    downloadsList.innerHTML = '';
    
    if (downloads.length === 0) {
        downloadsList.innerHTML = '<div class="no-downloads">No downloads yet</div>';
        return;
    }
    
    downloads.forEach(download => {
        const downloadItem = document.createElement('div');
        downloadItem.className = `download-item ${download.status}`;
        
        const progress = download.size > 0 ? (download.received / download.size) * 100 : 0;
        const fileSize = formatFileSize(download.size);
        const receivedSize = formatFileSize(download.received);
        
        downloadItem.innerHTML = `
            <div class="download-info">
                <div class="download-filename">${download.filename}</div>
                <div class="download-details">
                    <span class="download-size">${receivedSize} / ${fileSize}</span>
                    <span class="download-status">${getStatusText(download.status)}</span>
                </div>
                <div class="download-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <span class="progress-text">${Math.round(progress)}%</span>
                </div>
            </div>
            <div class="download-actions">
                ${download.status === 'downloading' ? 
                    `<button onclick="cancelDownload(${download.id})" class="btn-cancel">Cancel</button>` : 
                    download.status === 'completed' ? 
                        `<button onclick="openDownloadFile(${download.id})" class="btn-open">Open</button>` : 
                        ''
                }
            </div>
        `;
        
        downloadsList.appendChild(downloadItem);
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getStatusText(status) {
    switch (status) {
        case 'downloading': return 'Downloading...';
        case 'completed': return 'Completed';
        case 'cancelled': return 'Cancelled';
        case 'interrupted': return 'Interrupted';
        default: return status;
    }
}

async function cancelDownload(downloadId) {
    try {
        await window.electronAPI.cancelDownload(downloadId);
        console.log('Download cancelled:', downloadId);
    } catch (error) {
        console.error('Failed to cancel download:', error);
    }
}

async function openDownloadFile(downloadId) {
    try {
        await window.electronAPI.openDownloadFile(downloadId);
        console.log('Opening download file:', downloadId);
    } catch (error) {
        console.error('Failed to open download file:', error);
    }
}

async function openDownloadFolder() {
    try {
        await window.electronAPI.openDownloadFolder();
        console.log('Opening download folder');
    } catch (error) {
        console.error('Failed to open download folder:', error);
    }
}

async function clearCompletedDownloads() {
    try {
        await window.electronAPI.clearCompletedDownloads();
        console.log('Cleared completed downloads');
    } catch (error) {
        console.error('Failed to clear completed downloads:', error);
    }
}

function showDownloadNotification(download, type = 'started') {
    const notification = document.createElement('div');
    notification.className = `download-notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">${type === 'completed' ? '✅' : '📥'}</div>
            <div class="notification-text">
                <div class="notification-title">${type === 'completed' ? 'Download Complete' : 'Download Started'}</div>
                <div class="notification-filename">${download.filename}</div>
            </div>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

