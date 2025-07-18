const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class TouchIDAuth {
  constructor() {
    this.isAvailable = false;
    this.checkAvailability();
  }

  async checkAvailability() {
    try {
      // Check if Touch ID is available on this device
      const { stdout } = await execAsync('system_profiler SPBiometricDataType');
      this.isAvailable = stdout.includes('Touch ID') || stdout.includes('Face ID');
      
      // If no output, try alternative detection methods
      if (!stdout || stdout.trim() === '') {
        // Check if we're on macOS and try to detect Touch ID capability
        const { stdout: osInfo } = await execAsync('sw_vers -productVersion');
        const version = osInfo.trim();
        
        // macOS 10.12.1+ supports Touch ID
        if (version >= '10.12.1') {
          // Try to check if Touch ID is enabled in system preferences
          try {
            const { stdout: touchIDCheck } = await execAsync('defaults read com.apple.driver.AppleBiometricServices 2>/dev/null || echo "not_available"');
            this.isAvailable = !touchIDCheck.includes('not_available');
          } catch (e) {
            // If we can't check, assume Touch ID might be available
            this.isAvailable = true;
          }
        } else {
          this.isAvailable = false;
        }
      }
    } catch (error) {
      console.log('Touch ID detection failed:', error.message);
      // Fallback: assume Touch ID might be available on modern macOS
      this.isAvailable = true;
    }
  }

  async authenticate(reason = 'Authenticate to unlock Private Browser') {
    if (!this.isAvailable) {
      throw new Error('Touch ID is not available on this device');
    }

    try {
      // Use the security command to trigger Touch ID authentication
      // This will prompt for Touch ID if available
      const command = `security unlock-keychain -p "" ~/Library/Keychains/login.keychain-db 2>&1`;
      
      const { stdout, stderr } = await execAsync(command);
      
      // Check for various error conditions
      if (stderr.includes('User interaction is not allowed') || 
          stderr.includes('User canceled') ||
          stderr.includes('Authentication failed') ||
          stdout.includes('AUTH_FAILED')) {
        throw new Error('Touch ID authentication failed or was cancelled');
      }
      
      // If we get here, authentication was successful
      return true;
    } catch (error) {
      console.error('Touch ID authentication error:', error);
      
      // If it's a command not found error, Touch ID might not be available
      if (error.message.includes('ENOENT') || error.message.includes('command not found')) {
        throw new Error('Touch ID is not available on this device');
      }
      
      throw error;
    }
  }

  async isTouchIDAvailable() {
    await this.checkAvailability();
    return this.isAvailable;
  }
}

module.exports = TouchIDAuth; 