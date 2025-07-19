# Logger Simple - Node.js Client Library

[![npm version](https://badge.fury.io/js/logger-simple.svg)](https://badge.fury.io/js/logger-simple)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2012.0.0-brightgreen)](https://nodejs.org/)

**Logger Simple** is a powerful, production-ready Node.js client library for the Logger Simple platform - a next-generation application monitoring service with real-time logging, AI-powered insights, and automatic error notifications.

## 🚀 Features

- **5 Log Levels**: `success`, `info`, `warn`, `error`, `critical`
- **Automatic Email Alerts**: Critical errors trigger instant email notifications
- **Auto-Exit on Critical**: Automatically terminates application on critical errors
- **Real-time Monitoring**: Stream logs with sub-millisecond latency
- **AI-Powered Analytics**: Intelligent error detection and insights
- **Easy Integration**: 30-second setup with any Node.js application
- **Retry Logic**: Built-in retry mechanism with exponential backoff
- **Context-Aware Logging**: Module-specific loggers for better organization
- **Auto Error Catching**: Automatic capture of uncaught exceptions (with exit)
- **Performance Monitoring**: Built-in operation timing and memory tracking
- **Batch Logging**: Efficient batch processing for high-volume applications
- **Help Center Integration**: Access to error tips and troubleshooting guides
- **Graceful Shutdown**: Proper logging during application shutdown

## 📦 Installation

```bash
npm install node-logger-simple
```

## 🔧 Quick Start

### 1. Basic Setup

```javascript
const { Logger } = require('node-logger-simple');

// Initialize with your app credentials
const logger = new Logger({
    appId: 'your_app_id',
    apiKey: 'your_api_key',
    exitOnCritical: true,  // Auto-exit on critical errors (default: true)
    autoExit: true,        // Auto-exit on uncaught errors (default: true)
    debug: true            // Show debug messages (default: true, set false for silent mode)
});

// Initialize your app with startup logging
await logger.initialize('MyApp', '1.0.0', {
    environment: 'production',
    deployment: 'aws-us-east-1'
});

// Disable debug messages at runtime if needed
logger.setDebug(false);  // Silent mode
```

### 2. Basic Logging

```javascript
// Different log levels
await logger.success('User registration completed successfully');
await logger.info('Processing user request');
await logger.warn('Database connection pool getting full');
await logger.error('Failed to save user data');
await logger.critical('Database connection lost'); // 🚨 Triggers email + EXIT!

// With additional context
await logger.error('Payment processing failed', {
    userId: 12345,
    amount: 99.99,
    paymentMethod: 'credit_card',
    errorCode: 'CARD_DECLINED'
});
```

### 3. Advanced Usage with Auto-Exit Protection

```javascript
// Context-aware logging for specific modules
const dbLogger = logger.context('DatabaseManager');
const apiLogger = logger.context('APIController');

await dbLogger.info('Connected to database');
await apiLogger.warn('Rate limit approaching', { requests: 95, limit: 100 });

// Enable automatic error catching (will EXIT on uncaught errors)
logger.enableAutoCatch(true, true); // enabled=true, exitOnError=true

// This will be automatically logged as critical and EXIT the process
throw new Error('Unhandled application error');

// Performance monitoring
const result = await logger.timeOperation(async () => {
    return await heavyDatabaseOperation();
}, 'DatabaseQuery');
```

## 📋 API Reference

### Constructor Options

```javascript
const logger = new Logger({
    appId: 'your_app_id',                         // Your application ID
    apiKey: 'your_api_key',                       // Your API key
    timeout: 10000,                               // Request timeout (ms)
    retries: 3,                                   // Retry attempts
    userAgent: 'Logger-Simple-NodeJS/6.1.0',     // Custom user agent
    exitOnCritical: true,                         // Exit on critical logs (default: true)
    autoExit: true,                               // Exit on auto-caught errors (default: true)
    debug: true                                   // Show debug messages (default: true)
});
```

### Logging Methods

#### `log(level, message, context?, content?, exitOnCritical?)`
Generic logging method with optional exit override.

```javascript
await logger.log('critical', 'System failure', { error: 'details' }, null, false);
// This critical log won't cause exit due to last parameter
```

#### `critical(message, context?, content?)`
⚠️ **WARNING**: Critical logs will **EXIT your application** by default!

```javascript
await logger.critical('System out of memory', {
    availableMemory: '50MB',
    requiredMemory: '500MB',
    action: 'killing_process'
});
// 🚨 Application will exit in 1 second after logging
```

### Debug Mode & Console Output

Logger Simple includes built-in debug logging to help you understand what's happening internally. You can control this output:

#### Enable/Disable Debug Mode

```javascript
// Initialize with debug enabled (default)
const logger = new Logger({
    appId: 'your_app_id',
    apiKey: 'your_api_key',
    debug: true  // Show internal debug messages
});

// Initialize with debug disabled (silent mode)
const logger = new Logger({
    appId: 'your_app_id',
    apiKey: 'your_api_key',
    debug: false  // No internal debug messages
});

// Change debug mode at runtime
logger.setDebug(true);   // Enable debug
logger.setDebug(false);  // Disable debug
```

#### Debug Output Examples

When debug is **enabled**, you'll see internal Logger Simple messages:

```
[2025-07-16T12:00:00.000Z] [Logger-Simple] [INFO] Credentials updated
[2025-07-16T12:00:01.000Z] [Logger-Simple] [SUCCESS] 🛡️ Logger Simple auto-catch enabled
[2025-07-16T12:00:02.000Z] [Logger-Simple] [ERROR] 🚨 CRITICAL ERROR LOGGED: Database connection lost
[2025-07-16T12:00:02.000Z] [Logger-Simple] [ERROR] Application will exit in 1 second...
```

When debug is **disabled**, Logger Simple operates silently without console output.

#### Production Recommendations

```javascript
// Development mode - show debug messages
const logger = new Logger({
    appId: process.env.LOGGER_APP_ID,
    apiKey: process.env.LOGGER_API_KEY,
    debug: process.env.NODE_ENV !== 'production',  // Debug in dev only
    exitOnCritical: process.env.NODE_ENV === 'production'
});

// Or set based on environment variable
const logger = new Logger({
    appId: process.env.LOGGER_APP_ID,
    apiKey: process.env.LOGGER_API_KEY,
    debug: process.env.LOGGER_DEBUG === 'true'  // Set via env var
});
```

#### `enableAutoCatch(enabled?, exitOnError?)`
Enable automatic error catching with process termination.

```javascript
// Enable with exit on errors (recommended for production)
logger.enableAutoCatch(true, true);

// Enable without exit (for development)
logger.enableAutoCatch(true, false);

// Now all uncaught exceptions and unhandled rejections will be logged
// and optionally terminate the process
```

#### `forceExit(message, context?)`
Immediately log critical error and exit.

```javascript
if (criticalSystemFailure) {
    await logger.forceExit('Critical system failure detected', {
        subsystem: 'payment_processor',
        error_code: 'SYS_FAIL_001'
    });
    // Process exits immediately after logging
}
```

#### `gracefulShutdown(reason?, exitCode?)`
Perform graceful shutdown with logging.

```javascript
process.on('SIGTERM', async () => {
    await logger.gracefulShutdown('Received SIGTERM signal', 0);
    // Logs shutdown reason and exits gracefully
});
```

### Performance & Monitoring

#### `timeOperation(operation, operationName, level?)`
Monitor operation performance automatically.

```javascript
const result = await logger.timeOperation(async () => {
    const data = await database.query('SELECT * FROM users');
    return processData(data);
}, 'UserDataProcessing', 'info');

// Automatically logs duration, memory usage, and success/failure
```

#### `createPerformanceMonitor(operationName)`
Create reusable performance monitor.

```javascript
const monitor = logger.createPerformanceMonitor('FileProcessing');
monitor.start();

// ... do work ...

const metrics = await monitor.end('info', { filesProcessed: 150 });
console.log(`Operation took ${metrics.duration}ms`);
```

### Batch Logging

#### `createBatchLogger(maxBatchSize?, maxWaitTime?)`
Create batch logger for high-volume applications.

```javascript
const batchLogger = logger.createBatchLogger(50, 10000);

// Add logs to batch (doesn't send immediately)
batchLogger.add('info', 'User action', { userId: 123 });
batchLogger.add('info', 'Another action', { userId: 456 });

// Force send batch
await batchLogger.flush();
```

### Data Retrieval Methods

#### `getLogs(options?)`
Retrieve application logs with enhanced statistics.

```javascript
// Get recent logs
const logs = await logger.getLogs();

// Get only error logs
const errorLogs = await logger.getLogs({ level: 'error', limit: 50 });

// Response includes logs and 24h statistics
console.log(logs.data.logs);           // Array of log entries
console.log(logs.data.stats_24h);      // 24-hour statistics by level
console.log(logs.data.valid_levels);   // Valid log levels
```

#### `getLogStats(days?)`
Get detailed log statistics and recent critical logs.

```javascript
// Get 7-day statistics
const stats = await logger.getLogStats(7);

console.log(stats.data.level_totals);         // Total counts by level
console.log(stats.data.daily_breakdown);      // Daily breakdown
console.log(stats.data.recent_critical_logs); // Recent critical logs (last 10)
```

#### `healthCheck()`
Comprehensive health and connectivity check.

```javascript
const health = await logger.healthCheck();
console.log(health);
/*
{
  timestamp: '2025-07-16T12:00:00.000Z',
  api_connection: true,
  app_authenticated: true,
  response_time: 45,
  error: null
}
*/
```

### Context-Aware Logging

#### `context(contextName)`
Create context-specific logger with sub-context support.

```javascript
const userService = logger.context('UserService');
const dbManager = userService.subContext('DatabaseManager');

await userService.info('User operation started');
await dbManager.error('Database connection failed');

// Performance monitoring with context
const result = await userService.timeOperation(async () => {
    return await processUsers();
}, 'ProcessAllUsers');

// Force exit with context
if (criticalError) {
    await userService.forceExit('Critical user service failure');
}
```

### Admin Methods (Master Key Required)

All admin methods require a master API key for authentication:

#### `getUsers(masterKey, limit?)` / `getUser(masterKey, userId)`
```javascript
const users = await logger.getUsers('master_key_here', 50);
const user = await logger.getUser('master_key_here', 123);
```

#### `createUser(masterKey, userData)` / `updateUser(masterKey, userId, updateData)` / `deleteUser(masterKey, userId)`
```javascript
const newUser = await logger.createUser('master_key_here', {
    username: 'newuser',
    email: 'user@example.com',
    password: 'securepassword',
    role: 'user'
});

await logger.updateUser('master_key_here', 123, { role: 'admin' });
await logger.deleteUser('master_key_here', 123);
```

#### `createApp(masterKey, appData)` / `updateApp(masterKey, appId, updateData)` / `deleteApp(masterKey, appId)`
```javascript
const newApp = await logger.createApp('master_key_here', {
    name: 'My New App',
    userId: '123',
    description: 'Application description'
});

await logger.updateApp('master_key_here', 5, { name: 'Updated Name' });
await logger.deleteApp('master_key_here', 5);
```

#### Help Center Management
```javascript
// Create posts and replies
const post = await logger.createPost('api_key_here', {
    userId: 123,
    categoryId: 3,
    title: 'How to integrate Logger Simple',
    content: 'Step by step guide...'
});

await logger.replyPost('api_key_here', {
    postId: post.data.id,
    userId: 123,
    content: 'Great tutorial!',
    isSolution: false
});
```

## 🚀 Real-World Examples

### Production Express.js App with Auto-Exit

```javascript
const express = require('express');
const { Logger } = require('node-logger-simple');

const logger = new Logger({
    appId: process.env.LOGGER_APP_ID,
    apiKey: process.env.LOGGER_API_KEY,
    exitOnCritical: true  // Exit on critical errors
});

const app = express();

// Initialize app with startup logging
logger.initialize('MyAPI', '2.1.0', {
    environment: process.env.NODE_ENV,
    port: process.env.PORT || 3000
});

// Enable auto-catch with exit (production safety)
logger.enableAutoCatch(true, true);

// Context loggers
const apiLogger = logger.context('API');
const dbLogger = logger.context('Database');

// Performance monitoring middleware
app.use(async (req, res, next) => {
    const operation = apiLogger.createPerformanceMonitor(`${req.method} ${req.path}`);
    operation.start();
    
    res.on('finish', async () => {
        const level = res.statusCode >= 400 ? 'error' : 'info';
        await operation.end(level, {
            statusCode: res.statusCode,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
    });
    
    next();
});

// Critical error handler (will exit app)
app.use(async (err, req, res, next) => {
    if (err.critical) {
        // This will log and exit the application
        await apiLogger.critical('Critical API error - application will exit', {
            error: err.message,
            stack: err.stack,
            url: req.url,
            method: req.method
        });
        // Process exits automatically after logging
    } else {
        await apiLogger.error('API error caught', {
            error: err.message,
            url: req.url,
            method: req.method
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Graceful shutdown handlers
process.on('SIGTERM', () => logger.gracefulShutdown('SIGTERM received'));
process.on('SIGINT', () => logger.gracefulShutdown('SIGINT received'));
```

### Database Connection with Auto-Recovery

```javascript
const mongoose = require('mongoose');
const logger = new Logger({ /* config */ });

const dbLogger = logger.context('MongoDB');
let connectionAttempts = 0;
const maxAttempts = 5;

mongoose.connection.on('connected', async () => {
    connectionAttempts = 0;
    await dbLogger.success('Connected to MongoDB');
});

mongoose.connection.on('error', async (err) => {
    connectionAttempts++;
    
    if (connectionAttempts >= maxAttempts) {
        // Critical: too many failed attempts, exit application
        await dbLogger.critical('MongoDB connection failed after maximum attempts', {
            attempts: connectionAttempts,
            maxAttempts: maxAttempts,
            error: err.message
        });
        // Application will exit automatically
    } else {
        await dbLogger.error('MongoDB connection error', { 
            attempt: connectionAttempts,
            error: err.message 
        });
    }
});

mongoose.connection.on('disconnected', async () => {
    await dbLogger.warn('Disconnected from MongoDB');
});
```

### Background Job Processor with Performance Monitoring

```javascript
const logger = new Logger({ /* config */ });
const jobLogger = logger.context('JobProcessor');

async function processJob(jobData) {
    return await jobLogger.timeOperation(async () => {
        await jobLogger.info('Job started', { jobId: jobData.id });
        
        try {
            // Simulate heavy work
            const result = await doHeavyWork(jobData);
            
            await jobLogger.success('Job completed successfully', {
                jobId: jobData.id,
                recordsProcessed: result.count
            });
            
            return result;
        } catch (error) {
            if (error.critical) {
                // Critical job failure, exit application
                await jobLogger.critical('Critical job failure - system unstable', {
                    jobId: jobData.id,
                    error: error.message,
                    stack: error.stack
                });
                // Process will exit
            } else {
                await jobLogger.error('Job failed', {
                    jobId: jobData.id,
                    error: error.message
                });
                throw error;
            }
        }
    }, `ProcessJob_${jobData.type}`);
}

// Batch logging for high-volume job systems
const batchLogger = logger.createBatchLogger(100, 5000);

function logJobEvent(jobId, event, data) {
    batchLogger.add('info', `Job ${event}`, { jobId, event, ...data });
}
```

## 🔒 Security & Best Practices

### Environment Variables
Store credentials securely:
```bash
LOGGER_APP_ID=your_app_id
LOGGER_API_KEY=your_api_key
NODE_ENV=production
```

### Sensitive Data Protection
```javascript
// ❌ Don't log sensitive data
logger.info('User login', { password: userPassword, creditCard: '4111...' });

// ✅ Log safely
logger.info('User login successful', { 
    userId: user.id, 
    email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
    loginMethod: 'oauth'
});
```

### Production Configuration
```javascript
const logger = new Logger({
    appId: process.env.LOGGER_APP_ID,
    apiKey: process.env.LOGGER_API_KEY,
    exitOnCritical: process.env.NODE_ENV === 'production', // Exit in production
    autoExit: process.env.NODE_ENV === 'production',       // Exit on uncaught errors in production
    debug: process.env.NODE_ENV !== 'production',          // Debug in development only
    timeout: 15000,  // Longer timeout for production
    retries: 5       // More retries for production
});

// Enable auto-catch in production only
if (process.env.NODE_ENV === 'production') {
    logger.enableAutoCatch(true, true);
}
```

### Environment Variables
```bash
LOGGER_APP_ID=your_app_id
LOGGER_API_KEY=your_api_key
LOGGER_DEBUG=false          # Set to 'true' to enable debug in production
NODE_ENV=production
```

## 📊 Log Levels Guide

| Level | Use Case | Email Alert | Auto-Exit | Examples |
|-------|----------|-------------|-----------|----------|
| `success` | Successful operations | No | No | User registration, file upload, payment processed |
| `info` | General information | No | No | Application startup, user login, configuration loaded |
| `warn` | Potential issues | No | No | High memory usage, slow response time, deprecated API usage |
| `error` | Recoverable errors | No | No | Validation failed, API timeout, file not found |
| `critical` | System failures | **Yes** | **Yes** | Database down, out of memory, unhandled exceptions |

## ⚠️ Important: Auto-Exit Behavior

**By default, Logger Simple will EXIT your application in these scenarios:**

1. **Critical logs**: `logger.critical()` will exit after logging
2. **Uncaught exceptions**: When `enableAutoCatch(true, true)` is active
3. **Unhandled promise rejections**: When auto-catch is enabled
4. **Force exit**: When `forceExit()` is called

To disable auto-exit:
```javascript
const logger = new Logger({
    exitOnCritical: false,  // Don't exit on critical logs
    autoExit: false         // Don't exit on auto-caught errors
});

// Or override per call
await logger.critical('Error but don\'t exit', {}, null, false);
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

- **Documentation**: [panel.logger-simple.com/docs](https://panel.logger-simple.com/docs)
- **Help Center**: [panel.logger-simple.com/help](https://panel.logger-simple.com/help)
- **Discord Community**: [https://discord.gg/](https://discord.gg/)
- **Email Support**: loggersimple@gmail.com

---

**⚠️ Production Ready with Safety Features!** 

This library is designed to help you catch and handle critical errors before they damage your application. Use the auto-exit features wisely in production environments.

🚀 **Start monitoring your applications today!** Visit [logger-simple.com](https://logger-simple.com)