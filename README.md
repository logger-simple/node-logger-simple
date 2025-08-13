# Node Logger Simple

[![npm version](https://badge.fury.io/js/node-logger-simple.svg)](https://badge.fury.io/js/node-logger-simple)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/node-logger-simple.svg)](https://nodejs.org)

**Official Node.js client for Logger Simple** - A complete logging solution with error tracking, performance monitoring, and real-time analytics.

## 🚀 Features

- **Easy Integration**: Get up and running in minutes with minimal configuration
- **Real-time Logging**: Send logs directly to Logger Simple dashboard
- **Error Tracking**: Automatic error capture with stack traces and context
- **Performance Monitoring**: Built-in operation timing and performance metrics
- **Rate Limiting**: Client-side rate limiting to prevent API spam
- **Auto-Shutdown**: Configurable automatic shutdown on critical errors
- **Context-Aware Logging**: Structured logging with contextual information
- **TypeScript Support**: Full TypeScript definitions included
- **Health Monitoring**: Comprehensive health checks and diagnostics
- **Category Validation**: Ensures application category matches Node.js

## 📋 Requirements

- **Node.js**: 14.0.0 or higher
- **Application Category**: Must be set to "nodejs" in Logger Simple dashboard
- **Valid Credentials**: Application ID and API Key from Logger Simple

## 📦 Installation

```bash
npm install node-logger-simple
```

## 🏁 Quick Start

### 1. Create Your Application

First, create a Node.js application in the [Logger Simple Dashboard](https://logger-simple.com/dashboard/apps/create/):

1. Go to Dashboard → Applications → Create New Application
2. Set **Programming Language** to "Node.js"
3. Configure your application settings
4. Copy your **App ID** and **API Key**

### 2. Basic Usage

```javascript
const createLogger = require('node-logger-simple');

// Initialize logger
const logger = createLogger({
  appId: 'your-app-id',
  apiKey: 'your-api-key',
  debug: true
});

// Basic logging
await logger.info('Application started successfully');
await logger.warn('This is a warning message');
await logger.error('Something went wrong', { 
  userId: 12345, 
  action: 'user_login' 
});

// Critical errors (will exit app by default)
await logger.critical('Database connection failed', {
  error: 'Connection timeout',
  database: 'primary'
});
```

### 3. Advanced Usage

```javascript
const logger = createLogger({
  appId: 'your-app-id',
  apiKey: 'your-api-key',
  debug: true,
  maxLogsPerHour: 2000,
  exitOnCritical: true
});

// Context-aware logging
const userLogger = logger.context('UserService');
await userLogger.info('User login attempt', {
  userId: 12345,
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
});

// Performance monitoring
const result = await logger.timeOperation(async () => {
  // Your expensive operation here
  return await processLargeDataset();
}, 'DataProcessing');

// Structured logging with tags and metadata
await logger.error('Payment failed', 
  { orderId: 'ORDER-123', amount: 99.99 }, // context
  'Payment processing error details...', // content
  ['payment', 'error', 'critical'], // tags
  { retryCount: 3, gateway: 'stripe' } // metadata
);
```

## 🔧 Configuration

### LoggerConfig Options

```javascript
const logger = createLogger({
  // Required
  appId: 'your-app-id',              // Your application ID
  apiKey: 'your-api-key',            // Your API key
  
  // Optional
  baseUrl: 'https://api.logger-simple.com',  // API base URL
  timeout: 10000,                    // Request timeout (ms)
  retries: 3,                        // Retry attempts
  debug: false,                      // Enable debug logging
  exitOnCritical: true,              // Exit on critical errors
  maxLogsPerHour: 1000,             // Rate limit
  enableRateLimiting: true,          // Enable rate limiting
  userAgent: 'custom-agent/1.0',    // Custom user agent
  enableGlobalErrorHandling: true,   // Global error handlers
  exitOnAuthError: true              // Exit on auth failures
});
```

## 📝 Logging Methods

### Basic Logging

```javascript
// Different log levels
await logger.success('Operation completed successfully');
await logger.info('Information message');
await logger.warn('Warning message');
await logger.error('Error message');
await logger.critical('Critical error - app will exit');

// Generic log method
await logger.log('info', 'Custom message', context, content, false, tags, metadata);
```

### Context-Aware Logging

```javascript
// Create context loggers
const dbLogger = logger.context('Database');
const apiLogger = logger.context('API');

// All logs will include context automatically
await dbLogger.error('Connection failed');
// Logs as: "Connection failed" with context: { context: "Database" }

// Nested contexts
const userDbLogger = dbLogger.subContext('Users');
await userDbLogger.info('User created');
// Context: { context: "Database::Users" }
```

### Performance Monitoring

```javascript
// Monitor operation performance
const result = await logger.timeOperation(async () => {
  const data = await fetchUserData();
  return processData(data);
}, 'UserDataProcessing');

// With custom log level
await logger.timeOperation(
  () => criticalOperation(),
  'CriticalOperation',
  'error' // Log as error level
);
```

## 🛡️ Error Handling

The logger automatically handles various error scenarios:

### Critical Error Management

```javascript
// Critical errors trigger app shutdown by default
try {
  await logger.critical('System failure');
} catch (error) {
  // App will exit after logging
}

// Prevent shutdown for specific critical logs
await logger.critical('Important but non-fatal error', null, null, false);
```

### Global Error Handling

```javascript
// The logger automatically catches unhandled errors
process.on('uncaughtException', (error) => {
  // Automatically logged and handled
});

process.on('unhandledRejection', (reason) => {
  // Automatically logged and handled
});
```

### Graceful Shutdown

```javascript
// Graceful shutdown with logging
await logger.gracefulShutdown('Maintenance mode', 0);

// Force exit with critical error
await logger.forceExit('Emergency shutdown', {
  reason: 'Memory limit exceeded',
  memoryUsage: process.memoryUsage()
});
```

## 📊 Monitoring & Analytics

### Health Checks

```javascript
// Comprehensive health check
const health = await logger.healthCheck();
console.log(health);
/*
{
  timestamp: "2024-01-15T10:30:00.000Z",
  api_connection: true,
  app_authenticated: true,
  app_category_valid: true,
  response_time: 156,
  client_stats: { ... },
  rate_limiter: { ... },
  error_handler: { ... }
}
*/
```

### Statistics

```javascript
// Client-side statistics
const stats = logger.getClientStats();
console.log(stats);
/*
{
  totalLogs: 1523,
  successfulLogs: 1495,
  failedLogs: 28,
  rateLimitedLogs: 5,
  success_rate: 98,
  avg_logs_per_minute: 12.5,
  uptime_human: "2h 15m 30s"
}
*/

// Server-side log statistics
const logStats = await logger.getLogStats(30); // Last 30 days
console.log(logStats.data);
```

### Rate Limiting

```javascript
// Check rate limit status
const rateLimiter = logger.rateLimiter;
const status = rateLimiter.getStatus();

console.log(`Rate limit: ${status.currentHourRequests}/${status.maxRequestsPerHour}`);
console.log(`Available tokens: ${status.availableTokens}`);
console.log(`Utilization: ${status.utilizationPercent}%`);

// Get timing recommendations for bulk operations
const timing = rateLimiter.calculateOptimalTiming(100);
if (!timing.canProceed) {
  console.log(`Recommendation: ${timing.recommendation}`);
}
```

## 🎯 Advanced Features

### Data Retrieval

```javascript
// Get recent logs
const logs = await logger.getLogs({
  level: 'error',
  limit: 50,
  search: 'payment failed'
});

// Get log statistics
const stats = await logger.getLogStats(7); // Last 7 days
```

### Default Context

```javascript
// Set default context for all logs
logger.setDefaultContext({
  version: '1.0.0',
  environment: 'production',
  server: 'web-01'
});

// All subsequent logs will include this context
await logger.info('User action'); 
// Includes: { version: '1.0.0', environment: 'production', server: 'web-01' }
```

### Custom Configuration

```javascript
// Update configuration at runtime
logger.updateConfig({
  debug: true,
  maxLogsPerHour: 2000
});

// Get current configuration
const config = logger.getConfig();
console.log(config);
```

## 🚨 Error Types

The logger provides specific error types for better error handling:

```javascript
const { 
  LoggerError, 
  ValidationError, 
  NetworkError, 
  RateLimitError,
  ApplicationError,
  AuthenticationError 
} = require('node-logger-simple');

try {
  await logger.info('test');
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation failed:', error.field, error.value);
  } else if (error instanceof NetworkError) {
    console.log('Network error:', error.statusCode);
  } else if (error instanceof RateLimitError) {
    console.log('Rate limited. Reset at:', error.resetTime);
  }
}
```

## 🔍 Debugging

Enable debug mode to see detailed logging information:

```javascript
const logger = createLogger({
  appId: 'your-app-id',
  apiKey: 'your-api-key',
  debug: true  // Enable debug output
});

// Debug output will show:
// [2024-01-15T10:30:00.000Z] [Logger-Simple] [INFO] Logger instance created successfully
// [2024-01-15T10:30:01.000Z] [Logger-Simple] [INFO] API Request: GET /api.php
// [2024-01-15T10:30:01.000Z] [Logger-Simple] [INFO] Log sent successfully: INFO - User login...
```

## 🧪 Testing

The logger is designed to be testable and includes utilities for testing:

```javascript
// Disable automatic shutdown for testing
const logger = createLogger({
  appId: 'test-app-id',
  apiKey: 'test-api-key',
  exitOnCritical: false,
  enableGlobalErrorHandling: false
});

// Mock API responses for testing
// (See test examples in /examples/testing.js)
```

## 🌐 Environment Variables

You can configure the logger using environment variables:

```bash
# .env file
LOGGER_SIMPLE_APP_ID=your-app-id
LOGGER_SIMPLE_API_KEY=your-api-key
LOGGER_SIMPLE_DEBUG=true
LOGGER_SIMPLE_MAX_LOGS_PER_HOUR=2000
```

```javascript
const logger = createLogger({
  appId: process.env.LOGGER_SIMPLE_APP_ID,
  apiKey: process.env.LOGGER_SIMPLE_API_KEY,
  debug: process.env.LOGGER_SIMPLE_DEBUG === 'true',
  maxLogsPerHour: parseInt(process.env.LOGGER_SIMPLE_MAX_LOGS_PER_HOUR) || 1000
});
```

## 📁 Examples

Check out the `/examples` directory for complete usage examples:

- [Basic Usage](examples/basic-usage.js)
- [Express.js Integration](examples/express-integration.js)
- [Error Handling](examples/error-handling.js)
- [Performance Monitoring](examples/performance-monitoring.js)
- [Testing Setup](examples/testing.js)

## 🆘 Troubleshooting

### Common Issues

1. **"Application category mismatch"**
   - Ensure your application is set to "Node.js" in the dashboard
   - Check that you're using the correct App ID

2. **"Rate limit exceeded"**
   - Reduce log frequency or increase `maxLogsPerHour`
   - Check rate limit status with `rateLimiter.getStatus()`

3. **"Authentication failed"**
   - Verify your API key is correct and active
   - Ensure the application is active in the dashboard

4. **Network errors**
   - Check internet connectivity
   - Verify the API URL is accessible
   - Check firewall settings

### Debug Information

```javascript
// Get comprehensive debug information
const health = await logger.healthCheck();
const stats = logger.getClientStats();
const config = logger.getConfig();

console.log('Health:', health);
console.log('Stats:', stats);
console.log('Config:', config);
```

## 🤝 Support

- **Documentation**: [https://logger-simple.com/docs](https://logger-simple.com/docs)
- **Discord Community**: [https://discord.gg/26HvypuvxR](https://discord.gg/26HvypuvxR)
- **Email Support**: [support@logger-simple.com](mailto:contact@valloic.dev)
- **GitHub Issues**: [Report bugs and request features](https://github.com/logger-simple/node-logger-simple/issues)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📊 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed list of changes and version history.

---

**Made with ❤️ by the Logger Simple Team**

[Website](https://logger-simple.com) • [Dashboard](https://logger-simple.com/dashboard) • [Documentation](https://logger-simple.com/docs)