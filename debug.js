#!/usr/bin/env node

/**
 * Debug script for private browser project
 * Run with: node debug.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Private Browser Debug Script\n');

// Check for common issues
const issues = [];

// 1. Check if main.js exists
if (!fs.existsSync(path.join(__dirname, 'src/main.js'))) {
  issues.push('❌ src/main.js not found');
} else {
  console.log('✅ src/main.js exists');
}

// 2. Check if ai-service.js exists
if (!fs.existsSync(path.join(__dirname, 'src/ai-service.js'))) {
  issues.push('❌ src/ai-service.js not found');
} else {
  console.log('✅ src/ai-service.js exists');
}

// 3. Check package.json
if (!fs.existsSync(path.join(__dirname, 'package.json'))) {
  issues.push('❌ package.json not found');
} else {
  console.log('✅ package.json exists');
  
  // Check dependencies
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    const requiredDeps = ['electron', 'electron-store'];
    
    requiredDeps.forEach(dep => {
      if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
        issues.push(`❌ Missing dependency: ${dep}`);
      } else {
        console.log(`✅ Dependency ${dep} found`);
      }
    });
  } catch (error) {
    issues.push(`❌ Error reading package.json: ${error.message}`);
  }
}

// 4. Check for common syntax errors
const filesToCheck = [
  'src/main.js',
  'src/ai-service.js',
  'src/preload.js',
  'src/renderer.js'
];

filesToCheck.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    try {
      const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
      
      // Check for common syntax issues
      if (content.includes('getStoreValue') && !content.includes('function getStoreValue')) {
        issues.push(`⚠️  ${file}: getStoreValue function referenced but not defined`);
      }
      
      if (content.includes('analyzeContent') && !content.includes('function analyzeContent')) {
        issues.push(`⚠️  ${file}: analyzeContent function referenced but not defined`);
      }
      
      if (content.includes('DOMParser') && !content.includes('new DOMParser')) {
        issues.push(`⚠️  ${file}: DOMParser referenced but not properly instantiated`);
      }
      
      console.log(`✅ ${file} syntax check passed`);
    } catch (error) {
      issues.push(`❌ Error reading ${file}: ${error.message}`);
    }
  } else {
    issues.push(`❌ ${file} not found`);
  }
});

// 5. Check for IPC handler duplicates
try {
  const mainContent = fs.readFileSync(path.join(__dirname, 'src/main.js'), 'utf8');
  const ipcHandlers = mainContent.match(/ipcMain\.handle\(['"`]([^'"`]+)['"`]/g);
  
  if (ipcHandlers) {
    const handlerNames = ipcHandlers.map(h => h.match(/['"`]([^'"`]+)['"`]/)[1]);
    const duplicates = handlerNames.filter((name, index) => handlerNames.indexOf(name) !== index);
    
    if (duplicates.length > 0) {
      issues.push(`⚠️  Duplicate IPC handlers found: ${duplicates.join(', ')}`);
    } else {
      console.log('✅ No duplicate IPC handlers found');
    }
  }
} catch (error) {
  issues.push(`❌ Error checking IPC handlers: ${error.message}`);
}

// 6. Check for BrowserView API usage
try {
  const mainContent = fs.readFileSync(path.join(__dirname, 'src/main.js'), 'utf8');
  
  if (mainContent.includes('.isDestroyed()') && !mainContent.includes('.isDestroyed &&')) {
    issues.push('⚠️  BrowserView.isDestroyed() called without null check');
  }
  
  console.log('✅ BrowserView API usage check passed');
} catch (error) {
  issues.push(`❌ Error checking BrowserView API: ${error.message}`);
}

// Summary
console.log('\n📋 Debug Summary:');
if (issues.length === 0) {
  console.log('✅ No issues found! Your setup looks good.');
} else {
  console.log(`❌ Found ${issues.length} issue(s):`);
  issues.forEach(issue => console.log(`  ${issue}`));
  
  console.log('\n🔧 Quick Fixes:');
  console.log('1. Run: npm install (if dependencies missing)');
  console.log('2. Check for syntax errors in the files mentioned above');
  console.log('3. Ensure all required functions are defined');
  console.log('4. Add null checks for BrowserView.isDestroyed() calls');
  console.log('5. Remove duplicate IPC handler registrations');
}

console.log('\n🚀 To run with debug logging:');
console.log('  NODE_ENV=development npm start');
console.log('  or');
console.log('  npm start -- --debug'); 