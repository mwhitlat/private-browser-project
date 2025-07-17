// Browser state management
let currentTabId = 1;
let tabs = new Map();
let activeTab = null;

// DOM elements
const addressBar = document.getElementById('addressBar');
const backBtn = document.getElementById('backBtn');
const forwardBtn = document.getElementById('forwardBtn');
const reloadBtn = document.getElementById('reloadBtn');
const newTabBtn = document.getElementById('newTabBtn');
const privacyBtn = document.getElementById('privacyBtn');
const webview = document.getElementById('webview');
const tabsContainer = document.getElementById('tabs');
const privacyModal = document.getElementById('privacyModal');
const securityIndicator = document.getElementById('securityIndicator');
const privacyIndicator = document.getElementById('privacyIndicator');

// Initialize the browser
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting browser initialization');
    initializeBrowser();
    setupEventListeners();
    loadPrivacySettings();
    
    // Handle window resize to keep webview properly sized
    window.addEventListener('resize', () => {
        const contentArea = document.querySelector('.content-area');
        const webview = contentArea.querySelector('webview');
        if (webview) {
            const rect = contentArea.getBoundingClientRect();
            webview.style.width = `${rect.width}px`;
            webview.style.height = `${rect.height}px`;
            console.log('Webview resized to:', rect.width, 'x', rect.height);
        }
    });
});

function initializeBrowser() {
    console.log('Initializing browser...');
    
    // Create the first tab which will handle the initial page load
    createNewTab();
}



function setupEventListeners() {
    // Navigation buttons
    backBtn.addEventListener('click', () => {
        if (activeTab && activeTab.webview) {
            activeTab.webview.goBack();
        }
    });
    
    forwardBtn.addEventListener('click', () => {
        if (activeTab && activeTab.webview) {
            activeTab.webview.goForward();
        }
    });
    
    reloadBtn.addEventListener('click', () => {
        if (activeTab && activeTab.webview) {
            activeTab.webview.reload();
        }
    });
    
    // Address bar
    addressBar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const url = addressBar.value.trim();
            navigateToUrl(url);
        }
    });
    
    // New tab button
    newTabBtn.addEventListener('click', createNewTab);
    
    // Privacy button
    privacyBtn.addEventListener('click', () => {
        privacyModal.classList.add('show');
    });
    
    // Modal close
    document.getElementById('closePrivacyModal').addEventListener('click', () => {
        privacyModal.classList.remove('show');
    });
    
    // Click outside modal to close
    privacyModal.addEventListener('click', (e) => {
        if (e.target === privacyModal) {
            privacyModal.classList.remove('show');
        }
    });
    
    // Privacy settings
    document.getElementById('savePrivacySettings').addEventListener('click', savePrivacySettings);
    document.getElementById('clearDataNow').addEventListener('click', clearAllData);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 't':
                    e.preventDefault();
                    createNewTab();
                    break;
                case 'w':
                    e.preventDefault();
                    closeCurrentTab();
                    break;
                case 'r':
                    e.preventDefault();
                    if (activeTab && activeTab.webview) {
                        activeTab.webview.reload();
                    }
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

// setupWebviewEvents function removed - events are now handled per tab

function createNewTab() {
    const tabId = ++currentTabId;
    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.setAttribute('data-tab-id', tabId);

    const tabTitle = document.createElement('span');
    tabTitle.className = 'tab-title';
    tabTitle.textContent = 'New Tab';

    const tabClose = document.createElement('button');
    tabClose.className = 'tab-close';
    tabClose.title = 'Close Tab';
    tabClose.textContent = '×';
    tabClose.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(tabId);
    });

    tabElement.appendChild(tabTitle);
    tabElement.appendChild(tabClose);

    // Create and configure webview
    const tabWebview = document.createElement('webview');
    tabWebview.setAttribute('webpreferences', 'contextIsolation=yes');
    tabWebview.setAttribute('allowpopups', '');

    // ✅ Make it fill its container via absolute positioning
    tabWebview.style.position = 'absolute';
    tabWebview.style.top = '0';
    tabWebview.style.left = '0';
    tabWebview.style.right = '0';
    tabWebview.style.bottom = '0';
    tabWebview.style.width = '100%';
    tabWebview.style.height = '100%';
    tabWebview.style.border = 'none';

    // Append webview to the layout
    const contentArea = document.querySelector('.content-area');
    contentArea.appendChild(tabWebview);

    const tab = {
        id: tabId,
        element: tabElement,
        webview: tabWebview,
        title: 'New Tab',
        url: 'about:blank'
    };

    tabs.set(tabId, tab);
    tabsContainer.appendChild(tabElement);

    switchToTab(tabId);
    setupTabWebviewEvents(tab);

    // Load test or homepage URL
    if (tabs.size === 1) {
        tab.webview.src = `https://example.com`; // or local file
    }

    return tab;
}



function setupTabWebviewEvents(tab) {
    tab.webview.addEventListener('did-start-loading', () => {
        console.log(`Tab ${tab.id}: Started loading`);
        if (activeTab && activeTab.id === tab.id) {
            updateLoadingState(true);
        }
        updateTabTitle(tab, 'Loading...');
    });
    
    tab.webview.addEventListener('did-stop-loading', () => {
        console.log(`Tab ${tab.id}: Finished loading`);
        if (activeTab && activeTab.id === tab.id) {
            updateLoadingState(false);
            updateNavigationButtons();
        }
        
        // Force webview to resize after loading
        setTimeout(() => {
            forceWebviewResize(tab.webview);
        }, 100);
    });
    
    tab.webview.addEventListener('did-navigate', (e) => {
        console.log(`Tab ${tab.id}: Navigated to ${e.url}`);
        tab.url = e.url;
        if (activeTab && activeTab.id === tab.id) {
            updateAddressBar(e.url);
            updateSecurityIndicator(e.url);
        }
        updateTabTitle(tab, getPageTitle(e.url));
    });
    
    tab.webview.addEventListener('page-title-updated', (e) => {
        console.log(`Tab ${tab.id}: Title updated to "${e.title}"`);
        updateTabTitle(tab, e.title);
    });
    
    tab.webview.addEventListener('dom-ready', () => {
        console.log(`Tab ${tab.id}: DOM ready`);
        
        // Set zoom factor to 10       tab.webview.setZoomFactor(1.0);
        
        // Temporarily disable CSS injection to test basic functionality
        console.log('CSS injection disabled for testing');
        
        // Debug: Check webview dimensions after DOM is ready
        setTimeout(() => {
            const rect = tab.webview.getBoundingClientRect();
            console.log(`Tab ${tab.id}: Webview dimensions:`, rect);
            console.log(`Tab ${tab.id}: Webview computed styles:`, window.getComputedStyle(tab.webview));
            
            // Force resize after DOM is ready
            forceWebviewResize(tab.webview);
        }, 100);
        
        // Debug: Check dimensions periodically for the first few seconds
        let checkCount = 0;
        const dimensionCheck = setInterval(() => {
            const rect = tab.webview.getBoundingClientRect();
            console.log(`Tab ${tab.id}: Webview dimensions check ${++checkCount}:`, rect);
            if (checkCount >= 5) {
                clearInterval(dimensionCheck);
            }
        }, 500);
        
        injectPrivacyScripts(tab.webview);
        // Update navigation buttons when webview is ready
        if (activeTab && activeTab.id === tab.id) {
            updateNavigationButtons();
        }
    });
    
    tab.webview.addEventListener('did-fail-load', (e) => {
        console.error(`Tab ${tab.id}: Failed to load`, e);
    });
}

function forceWebviewResize(webview) {
    // Get the content area dimensions
    const contentArea = document.querySelector('.content-area');
    const contentRect = contentArea.getBoundingClientRect();
    
    // Force the webview to resize by temporarily changing its display
    const originalDisplay = webview.style.display;
    webview.style.display = 'none';
    webview.offsetHeight; // Force reflow
    webview.style.display = originalDisplay;
    
    // Force the webview to fill its container with explicit dimensions
    webview.style.cssText = `
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100% !important;
      height: 100% !important;
      min-width: 0 !important;
      min-height: 0 !important;
      max-width: none !important;
      max-height: none !important;
      border: none !important;
      display: block !important;
      margin: 0 !important;
      padding: 0 !important;
      z-index: 1000 !important;
      visibility: visible !important;
      opacity: 1 !important;
      transform: none !important;
    `;
    
    // Force another reflow
    webview.offsetHeight;
    
    const rect = webview.getBoundingClientRect();
    console.log('Forced webview resize, new dimensions:', rect);
    console.log('Expected dimensions:', contentRect.width, 'x', contentRect.height);
    console.log('Actual dimensions:', rect.width, 'x', rect.height);
    
    // If dimensions still don't match, try setting them again
    if (Math.abs(rect.width - contentRect.width) > 1 || Math.abs(rect.height - contentRect.height) > 1) {
        console.log('Dimensions still don\'t match, trying again...');
        setTimeout(() => {
            webview.style.width = contentRect.width + 'px';
            webview.style.height = contentRect.height + 'px';
            webview.offsetHeight; // Force reflow
            console.log('Second attempt - webview dimensions:', webview.getBoundingClientRect());
        }, 50);
    }
}

function switchToTab(tabId) {
    // Hide all webviews and deactivate all tabs
    tabs.forEach(tab => {
        tab.webview.style.display = 'none';
        tab.element.classList.remove('active');
    });

    // Show the selected tab's webview and activate its tab
    const tab = tabs.get(tabId);
    if (tab) {
        tab.webview.style.display = 'block';
        tab.element.classList.add('active');
        activeTab = tab;
        updateAddressBar(tab.url);
        updateTabTitle(tab, tab.title);
        updateSecurityIndicator(tab.url);
    }
}

function closeTab(tabId) {
    const tab = tabs.get(tabId);
    if (!tab) return;
    
    // Remove tab element
    tab.element.remove();
    tab.webview.remove();
    tabs.delete(tabId);
    
    // If this was the active tab, switch to another tab
    if (activeTab && activeTab.id === tabId) {
        const remainingTabs = Array.from(tabs.values());
        if (remainingTabs.length > 0) {
            switchToTab(remainingTabs[0].id);
        } else {
            // No tabs left, create a new one
            createNewTab();
        }
    }
}

function closeCurrentTab() {
    if (activeTab) {
        closeTab(activeTab.id);
    }
}

function navigateToUrl(url) {
    console.log('Attempting to navigate to:', url);
    console.log('Active tab:', activeTab);
    console.log('Active tab webview:', activeTab?.webview);
    
    if (!activeTab || !activeTab.webview) {
        console.error('No active tab or webview available');
        return;
    }
    
    let processedUrl = url;
    
    // Add protocol if missing
    if (
        !url.startsWith('http://') &&
        !url.startsWith('https://') &&
        !url.startsWith('file://') &&
        !url.startsWith('data:')
    ) {
        // Check if it's a search query
        if (url.includes(' ') || !url.includes('.')) {
            processedUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
        } else {
            processedUrl = `https://${url}`;
        }
    }
    
    console.log('Processed URL:', processedUrl);
    
    try {
        console.log('Calling loadURL on webview...');
        activeTab.webview.loadURL(processedUrl);
        console.log('loadURL called successfully');
    } catch (error) {
        console.error('Error calling loadURL:', error);
        console.log('Webview not ready yet, will retry when ready');
        // If webview isn't ready, wait for dom-ready event
        activeTab.webview.addEventListener('dom-ready', () => {
            try {
                console.log('Retrying loadURL after dom-ready...');
                activeTab.webview.loadURL(processedUrl);
                console.log('Retry loadURL successful');
            } catch (e) {
                console.error('Failed to load URL on retry:', e);
            }
        }, { once: true });
    }
}

function updateAddressBar(url) {
    addressBar.value = url;
}

function updateTabTitle(tab, title) {
    if (!tab) return;
    
    tab.title = title;
    const titleElement = tab.element.querySelector('.tab-title');
    if (titleElement) {
        titleElement.textContent = title;
    }
}

function updateNavigationButtons() {
    if (!activeTab || !activeTab.webview) {
        backBtn.disabled = true;
        forwardBtn.disabled = true;
        return;
    }
    
    // Check if webview is ready before calling navigation methods
    try {
        activeTab.webview.canGoBack().then(canGoBack => {
            backBtn.disabled = !canGoBack;
        }).catch(() => {
            backBtn.disabled = true;
        });
        
        activeTab.webview.canGoForward().then(canGoForward => {
            forwardBtn.disabled = !canGoForward;
        }).catch(() => {
            forwardBtn.disabled = true;
        });
    } catch (error) {
        // Webview not ready yet, disable buttons
        backBtn.disabled = true;
        forwardBtn.disabled = true;
    }
}

function updateLoadingState(loading) {
    reloadBtn.classList.toggle('loading', loading);
}

function updateSecurityIndicator(url) {
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

function getPageTitle(url) {
    if (url === 'about:blank') return 'New Tab';
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch {
        return 'New Tab';
    }
}

function injectPrivacyScripts(webviewElement = webview) {
    const scripts = [
        // Disable canvas fingerprinting
        `
        (function() {
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
        })();
        `,
        
        // Disable WebRTC
        `
        (function() {
            if (window.RTCPeerConnection) {
                window.RTCPeerConnection = undefined;
            }
        })();
        `,
        
        // Disable geolocation
        `
        (function() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition = function() {};
                navigator.geolocation.watchPosition = function() {};
            }
        })();
        `,
        
        // Disable notifications
        `
        (function() {
            if (Notification) {
                Notification.requestPermission = function() {
                    return Promise.resolve('denied');
                };
            }
        })();
        `
    ];
    
    scripts.forEach(script => {
        webviewElement.executeJavaScript(script);
    });
}

// Privacy settings management
function loadPrivacySettings() {
    // This would load from electron-store in a real implementation
    // For now, we'll use default values
    const settings = {
        blockTrackers: true,
        blockAds: true,
        disableWebRTC: true,
        disableGeolocation: true,
        disableNotifications: true,
        clearDataOnExit: true,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
    
    // Update UI
    document.getElementById('blockTrackers').checked = settings.blockTrackers;
    document.getElementById('blockAds').checked = settings.blockAds;
    document.getElementById('disableWebRTC').checked = settings.disableWebRTC;
    document.getElementById('disableGeolocation').checked = settings.disableGeolocation;
    document.getElementById('disableNotifications').checked = settings.disableNotifications;
    document.getElementById('clearDataOnExit').checked = settings.clearDataOnExit;
    document.getElementById('userAgent').value = settings.userAgent;
}

function savePrivacySettings() {
    const settings = {
        blockTrackers: document.getElementById('blockTrackers').checked,
        blockAds: document.getElementById('blockAds').checked,
        disableWebRTC: document.getElementById('disableWebRTC').checked,
        disableGeolocation: document.getElementById('disableGeolocation').checked,
        disableNotifications: document.getElementById('disableNotifications').checked,
        clearDataOnExit: document.getElementById('clearDataOnExit').checked,
        userAgent: document.getElementById('userAgent').value
    };
    
    // Save settings (in a real implementation, this would use electron-store)
    console.log('Saving privacy settings:', settings);
    
    // Close modal
    privacyModal.classList.remove('show');
    
    // Show success message
    showNotification('Privacy settings saved successfully!');
}

function clearAllData() {
    // Clear all browser data
    if (activeTab && activeTab.webview) {
        activeTab.webview.clearHistory();
        activeTab.webview.clearCache();
        activeTab.webview.clearStorageData();
    }
    
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

// Tab click handling
tabsContainer.addEventListener('click', (e) => {
    const tabElement = e.target.closest('.tab');
    if (tabElement) {
        const tabId = parseInt(tabElement.getAttribute('data-tab-id'));
        switchToTab(tabId);
    }
});
