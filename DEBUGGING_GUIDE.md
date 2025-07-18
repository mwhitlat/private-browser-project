# 🐛 Private Browser Debugging Guide

This guide covers all the debugging tools and strategies for the Private Browser project.

## 🚀 Quick Start

### 1. Auto-Fix Common Issues
```bash
npm run autofix
```
Applies the most common fixes automatically without analysis.

### 2. Full Auto-Debug Analysis
```bash
npm run autodebug
```
Comprehensive analysis, detection, and fixing of all issues.

### 3. Real-Time Error Monitoring
```bash
npm run monitor
```
Starts the browser with real-time error monitoring and auto-fixing.

## 🛠️ Debugging Tools

### Auto-Debug Agent (`auto-debug-agent.js`)
Intelligent agent that automatically detects and fixes common issues.

**Features:**
- ✅ IPC handler duplicate detection
- ✅ Missing function detection
- ✅ BrowserView API issue detection
- ✅ AI service error detection
- ✅ Syntax error detection
- ✅ Dependency issue detection
- ✅ Permission issue detection

**Usage:**
```bash
# Quick fix mode
npm run autofix

# Full analysis mode
npm run autodebug

# Direct usage
node auto-debug-agent.js --quick
node auto-debug-agent.js
```

### Error Monitor (`error-monitor.js`)
Real-time error monitoring with automatic fixing.

**Features:**
- 👁️ Real-time error detection
- 🔄 Automatic error categorization
- 🔧 Intelligent auto-fixing
- 📊 Error statistics
- 🚀 Browser process monitoring

**Usage:**
```bash
# Start monitoring
npm run monitor

# Generate error report
npm run monitor:report

# Direct usage
node error-monitor.js
node error-monitor.js --report
```

### Debug Script (`debug.js`)
Static analysis tool for common issues.

**Usage:**
```bash
npm run check
node debug.js
```

## 🔍 Common Error Types & Solutions

### 1. IPC Handler Duplicates
**Error:** `Attempted to register a second handler for 'lock-browser'`

**Solution:**
```bash
npm run autofix
```

**Manual Fix:**
- Add `ipcMain.removeHandler()` calls before registering handlers
- Clear existing handlers in `setupIPCHandlers()`

### 2. Missing Functions
**Error:** `ReferenceError: getStoreValue is not defined`

**Solution:**
```bash
npm run autofix
```

**Manual Fix:**
```javascript
function getStoreValue(key, defaultValue = null) {
  try {
    return store.get(key, defaultValue);
  } catch (error) {
    console.error('Error in getStoreValue:', error);
    return defaultValue;
  }
}
```

### 3. BrowserView API Issues
**Error:** `tab.browserView.isDestroyed is not a function`

**Solution:**
```bash
npm run autofix
```

**Manual Fix:**
```javascript
// Replace
tab.browserView.isDestroyed()

// With
tab.browserView.isDestroyed && tab.browserView.isDestroyed()
```

### 4. AI Service Errors
**Error:** `Cannot read properties of undefined (reading 'toLowerCase')`

**Solution:**
```bash
npm run autofix
```

**Manual Fix:**
```javascript
// Add null check
if (!word || !word.text) {
  syllableCount += 1;
  return;
}
const cleanWord = word.text.toLowerCase();
```

### 5. File Permission Issues
**Error:** `Permission denied` or `EACCES`

**Solution:**
```bash
npm run autofix
```

**Manual Fix:**
```bash
chmod -R 755 .
```

### 6. File Lock Issues
**Error:** `File currently in use`

**Solution:**
```bash
# Kill existing processes
pkill -f electron

# Clear cache
rm -rf ~/Library/Application\ Support/private-browser
```

## 📊 Debugging Workflow

### 1. Initial Assessment
```bash
npm run check
```
Quick static analysis of common issues.

### 2. Auto-Fix
```bash
npm run autofix
```
Apply common fixes automatically.

### 3. Full Analysis
```bash
npm run autodebug
```
Comprehensive analysis and fixing.

### 4. Real-Time Monitoring
```bash
npm run monitor
```
Monitor for new errors as they occur.

### 5. Verify Fixes
```bash
npm start
```
Test the browser after fixes.

## 🔧 Advanced Debugging

### Manual Error Analysis
```bash
# View browser logs
tail -f browser-logs.txt

# View debug logs
tail -f debug-logs.txt

# View auto-debug report
cat auto-debug-report.json

# View error monitor report
cat error-monitor-report.json
```

### Debug Mode
```bash
# Run with debug logging
npm run debug

# Run with development mode
npm run dev
```

### Process Management
```bash
# Kill all Electron processes
pkill -f electron

# Check running processes
ps aux | grep electron

# Clear Electron cache
rm -rf ~/Library/Application\ Support/private-browser
```

## 📈 Error Statistics

The error monitor tracks:
- **IPC_DUPLICATE**: Duplicate IPC handler registrations
- **IPC_MISSING**: Missing IPC handlers
- **BROWSERVIEW_API**: BrowserView API issues
- **MISSING_FUNCTION**: Undefined function calls
- **NULL_REFERENCE**: Null/undefined property access
- **AI_SERVICE_ERROR**: AI service calculation errors
- **PERMISSION_ERROR**: File permission issues
- **FILE_LOCKED**: File lock issues
- **UNHANDLED_PROMISE**: Unhandled promise rejections

## 🎯 Best Practices

### 1. Use Auto-Fix First
Always try `npm run autofix` before manual debugging.

### 2. Monitor Real-Time
Use `npm run monitor` during development to catch errors early.

### 3. Check Logs Regularly
Monitor `browser-logs.txt` and `debug-logs.txt` for patterns.

### 4. Verify After Fixes
Always test the browser after applying fixes.

### 5. Keep Reports
Save auto-debug and error monitor reports for analysis.

## 🚨 Emergency Procedures

### Browser Won't Start
```bash
# 1. Kill all processes
pkill -f electron

# 2. Clear cache
rm -rf ~/Library/Application\ Support/private-browser

# 3. Auto-fix
npm run autofix

# 4. Try again
npm start
```

### Continuous Errors
```bash
# 1. Full auto-debug
npm run autodebug

# 2. Start with monitoring
npm run monitor

# 3. Check reports
cat auto-debug-report.json
cat error-monitor-report.json
```

### Permission Issues
```bash
# 1. Fix permissions
chmod -R 755 .

# 2. Check ownership
ls -la

# 3. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📝 Debugging Checklist

- [ ] Run `npm run check` for static analysis
- [ ] Run `npm run autofix` for common fixes
- [ ] Check `browser-logs.txt` for error patterns
- [ ] Run `npm run autodebug` for comprehensive analysis
- [ ] Use `npm run monitor` for real-time monitoring
- [ ] Verify fixes with `npm start`
- [ ] Check generated reports
- [ ] Document any manual fixes applied

## 🔗 Related Files

- `auto-debug-agent.js` - Main debugging agent
- `error-monitor.js` - Real-time error monitoring
- `debug.js` - Static analysis tool
- `browser-logs.txt` - Browser error logs
- `debug-logs.txt` - Debug system logs
- `auto-debug-report.json` - Auto-debug analysis report
- `error-monitor-report.json` - Error monitoring report

## 💡 Tips

1. **Start Simple**: Always try the quickest fix first (`npm run autofix`)
2. **Monitor Continuously**: Use real-time monitoring during development
3. **Document Issues**: Keep track of recurring error patterns
4. **Test Incrementally**: Test after each fix to ensure it works
5. **Use Reports**: Analyze generated reports for insights

This debugging system should handle 90% of common issues automatically, making development much faster and more reliable! 