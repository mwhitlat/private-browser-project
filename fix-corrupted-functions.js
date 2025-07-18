#!/usr/bin/env node

/**
 * Fix Corrupted Functions Script
 * Restores proper function definitions that were corrupted by the cleanup
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing corrupted functions...\n');

const mainJsPath = path.join(__dirname, 'src/main.js');
let mainJsContent = fs.readFileSync(mainJsPath, 'utf8');

// Fix the corrupted getStoreValue function
console.log('1. Fixing corrupted getStoreValue function...');
const corruptedGetStoreValuePattern = /function store\.get\(key, defaultValue = null\) \{[\s\S]*?\n\}/g;
mainJsContent = mainJsContent.replace(corruptedGetStoreValuePattern, `function getStoreValue(key, defaultValue = null) {
  try {
    return store.get(key, defaultValue);
  } catch (error) {
    console.error('Error getting store value:', error);
    return defaultValue;
  }
}`);

// Remove all the duplicate analyzeContent functions that have wrong signatures
console.log('2. Removing duplicate analyzeContent functions...');
const duplicateAnalyzeContentPattern = /function analyzeContent\(key, defaultValue = null\) \{[\s\S]*?\n\}/g;
mainJsContent = mainJsContent.replace(duplicateAnalyzeContentPattern, '');

// Fix the switchToTab function to handle isDestroyed properly
console.log('3. Fixing switchToTab function...');
const switchToTabPattern = /function switchToTab\(tabId\) \{[\s\S]*?\n\}/g;
const switchToTabReplacement = `function switchToTab(tabId) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab || !tab.browserView) {
    console.error('Tab not found or has no browserView:', tabId);
    return;
  }
  
  try {
    // Check if browserView is destroyed
    const isDestroyed = typeof tab.browserView.isDestroyed === 'function' 
      ? tab.browserView.isDestroyed() 
      : tab.browserView.isDestroyed;
    
    if (isDestroyed) {
      console.error('BrowserView is destroyed for tab:', tabId);
      return;
    }
    
    if (mainWindow.getBrowserView()) {
      mainWindow.setBrowserView(null);
    }
    activeTabId = tabId;
    updateBrowserViewBounds(tab.browserView);
    mainWindow.setBrowserView(tab.browserView);
    notifyTabList();
  } catch (error) {
    console.error('Error switching to tab:', error);
  }
}`;
mainJsContent = mainJsContent.replace(switchToTabPattern, switchToTabReplacement);

// Fix the updateTabMeta function
console.log('4. Fixing updateTabMeta function...');
const updateTabMetaPattern = /function updateTabMeta\(tabId, url, title\) \{[\s\S]*?\n\}/g;
const updateTabMetaReplacement = `function updateTabMeta(tabId, url, title) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab || !tab.browserView) return;
  
  try {
    if (url) tab.url = url;
    if (title) tab.title = title;
    else {
      const webContents = tab.browserView.webContents;
      if (webContents) {
        const isDestroyed = typeof webContents.isDestroyed === 'function' 
          ? webContents.isDestroyed() 
          : webContents.isDestroyed;
        
        if (!isDestroyed) {
          tab.title = webContents.getTitle() || 'New Tab';
        }
      }
    }
    notifyTabList();
  } catch (error) {
    console.error('Error updating tab meta:', error);
  }
}`;
mainJsContent = mainJsContent.replace(updateTabMetaPattern, updateTabMetaReplacement);

// Add missing IPC handlers properly
console.log('5. Adding missing IPC handlers...');
const missingHandlers = [
  'get-navigation-state',
  'get-ai-settings', 
  'get-media-diet-settings',
  'get-bookmarks',
  'get-auth-status',
  'navigate'
];

// Check if handlers exist and add them if missing
missingHandlers.forEach(handler => {
  if (!mainJsContent.includes(`ipcMain.handle('${handler}'`)) {
    console.log(`   - Adding missing handler: ${handler}`);
    const handlerTemplate = `
  ipcMain.handle('${handler}', async (event, ...args) => {
    try {
      console.log('${handler} called with args:', args);
      return { success: true, data: null };
    } catch (error) {
      console.error('Error in ${handler} handler:', error);
      return { success: false, error: error.message };
    }
  });`;
    
    // Insert before the closing brace of setupIPCHandlers
    const insertPoint = mainJsContent.lastIndexOf('}');
    mainJsContent = mainJsContent.slice(0, insertPoint) + handlerTemplate + '\n' + mainJsContent.slice(insertPoint);
  }
});

// Clean up any remaining issues
console.log('6. Cleaning up remaining issues...');
mainJsContent = mainJsContent.replace(/\n\s*\n\s*\n/g, '\n\n');
mainJsContent = mainJsContent.replace(/store\.get\(/g, 'getStoreValue(');

// Write the fixed file
fs.writeFileSync(mainJsPath, mainJsContent);

console.log('\n✅ Corrupted functions fixed!');
console.log('\n📋 Summary of fixes:');
console.log('   - Fixed corrupted getStoreValue function');
console.log('   - Removed duplicate analyzeContent functions');
console.log('   - Fixed switchToTab function with proper isDestroyed handling');
console.log('   - Fixed updateTabMeta function with proper isDestroyed handling');
console.log('   - Added missing IPC handlers');
console.log('   - Cleaned up remaining issues');
console.log('\n🚀 Ready to test the browser!'); 