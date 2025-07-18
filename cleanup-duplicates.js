#!/usr/bin/env node

/**
 * Cleanup Duplicate Functions Script
 * Removes duplicate function definitions created by the fix script
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning up duplicate functions...\n');

const mainJsPath = path.join(__dirname, 'src/main.js');
let mainJsContent = fs.readFileSync(mainJsPath, 'utf8');

// Remove all duplicate getStoreValue and analyzeContent functions
console.log('1. Removing duplicate getStoreValue functions...');
const getStoreValuePattern = /function getStoreValue\(key, defaultValue = null\) \{[\s\S]*?\n\}/g;
const getStoreValueMatches = mainJsContent.match(getStoreValuePattern);
if (getStoreValueMatches && getStoreValueMatches.length > 1) {
  console.log(`   - Found ${getStoreValueMatches.length} getStoreValue functions, keeping only the first...`);
  let count = 0;
  mainJsContent = mainJsContent.replace(getStoreValuePattern, (match) => {
    count++;
    return count === 1 ? match : '';
  });
}

console.log('2. Removing duplicate analyzeContent functions...');
const analyzeContentPattern = /function analyzeContent\(content, options = \{\}\) \{[\s\S]*?\n\}/g;
const analyzeContentMatches = mainJsContent.match(analyzeContentPattern);
if (analyzeContentMatches && analyzeContentMatches.length > 1) {
  console.log(`   - Found ${analyzeContentMatches.length} analyzeContent functions, keeping only the first...`);
  let count = 0;
  mainJsContent = mainJsContent.replace(analyzeContentPattern, (match) => {
    count++;
    return count === 1 ? match : '';
  });
}

// Fix the remaining isDestroyed issues
console.log('3. Fixing remaining isDestroyed issues...');
const isDestroyedPattern = /tab\.browserView\.isDestroyed\(\)/g;
mainJsContent = mainJsContent.replace(isDestroyedPattern, (match) => {
  return `(typeof tab.browserView.isDestroyed === 'function' ? tab.browserView.isDestroyed() : tab.browserView.isDestroyed)`;
});

// Fix the getStoreValue call that's still failing
console.log('4. Fixing getStoreValue call...');
const getStoreValueCallPattern = /getStoreValue\(/g;
mainJsContent = mainJsContent.replace(getStoreValueCallPattern, (match) => {
  return `store.get(`;
});

// Clean up any empty lines that might have been created
console.log('5. Cleaning up empty lines...');
mainJsContent = mainJsContent.replace(/\n\s*\n\s*\n/g, '\n\n');

// Write the cleaned file
fs.writeFileSync(mainJsPath, mainJsContent);

console.log('\n✅ Duplicate functions cleaned up!');
console.log('\n📋 Summary of cleanup:');
console.log('   - Removed duplicate getStoreValue functions');
console.log('   - Removed duplicate analyzeContent functions');
console.log('   - Fixed remaining isDestroyed API issues');
console.log('   - Fixed getStoreValue calls');
console.log('   - Cleaned up empty lines');
console.log('\n🚀 Ready to test again!'); 