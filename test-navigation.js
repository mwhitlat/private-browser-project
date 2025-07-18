// Simple test script to verify navigation functionality
const { ipcMain } = require('electron');

console.log('Testing navigation functionality...');

// Test the navigate handler
async function testNavigation() {
  try {
    // Simulate a navigation request
    const testUrl = 'https://www.google.com';
    console.log(`Testing navigation to: ${testUrl}`);
    
    // This would normally be called from the renderer process
    // For now, we'll just log that the test is ready
    console.log('Navigation test ready - try typing a URL in the address bar');
    
  } catch (error) {
    console.error('Navigation test failed:', error);
  }
}

// Export for testing
module.exports = { testNavigation };

console.log('Navigation test script loaded'); 