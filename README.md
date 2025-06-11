# 🚀 Logger Simple - Node.js Module

<div align="center">
  <img src="https://logger-simple.com/assets/imgs/logo.png" alt="Logger Simple" width="100" height="100">
  
  **Simple, powerful logging for modern Node.js applications**
  
  [![npm version](https://badge.fury.io/js/node-logger-simple.svg)](https://badge.fury.io/js/node-logger-simple)
  [![Downloads](https://img.shields.io/npm/dm/node-logger-simple.svg)](https://www.npmjs.com/package/node-logger-simple)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
</div>

---

## 📦 Installation

```bash
npm install node-logger-simple
```

## 🎯 Quick Start

```javascript
const { Logger } = require('node-logger-simple');

// Initialize logger with your credentials
const logger = new Logger({
  app_id: 'your_app_id',    // Get from https://logger-simple.com
  api_key: 'your_api_key',  // Get from https://logger-simple.com
});

// Start logging!
logger.logInfo("Application started successfully");
logger.logSuccess("User authentication completed");
logger.logWarning("Low disk space detected");
logger.logError("Database connection failed");
logger.logCritical("System overload detected");
```

## 🌟 Features

- **🎯 Simple API** - Just a few lines to get started
- **🔒 Secure** - API key authentication
- **📊 Real-time Dashboard** - View logs instantly at [logger-simple.com](https://logger-simple.com)
- **🏷️ Multiple Log Levels** - Success, Info, Warning, Error, Critical
- **📈 Analytics** - Built-in log analytics and metrics
- **🔍 Searchable** - Advanced filtering and search capabilities
- **📱 Mobile-friendly** - Access your logs from anywhere
- **⚡ High Performance** - Optimized for production use

## 📋 Getting Your Credentials

1. Visit [logger-simple.com](https://logger-simple.com)
2. Create a free account
3. Create a new application
4. Copy your `app_id` and `api_key`

## 📚 Usage Examples

### Basic Logging

```javascript
const { Logger } = require('node-logger-simple');

const logger = new Logger({
  app_id: 'my_awesome_app_abc123',
  api_key: 'sk_1234567890abcdef...',
});

// Different log levels
await logger.logSuccess("Order processed successfully");
await logger.logInfo("User logged in", { userId: 123 });
await logger.logWarning("Rate limit approaching", { requests: 950 });
await logger.logError("Payment failed", { orderId: 456, error: "Invalid card" });
await logger.logCritical("Database down!", { timestamp: Date.now() });
```

### With Context Data

```javascript
// Add contextual information to your logs
await logger.logInfo("API Request", {
  method: "POST",
  endpoint: "/api/users",
  responseTime: "145ms",
  userId: 12345,
  userAgent: "Mozilla/5.0..."
});

await logger.logError("Authentication failed", {
  email: "user@example.com",
  attemptNumber: 3,
  ipAddress: "192.168.1.1",
  reason: "Invalid password"
});
```

### Express.js Integration

```javascript
const express = require('express');
const { Logger } = require('node-logger-simple');

const app = express();
const logger = new Logger({
  app_id: 'my_web_app_xyz789',
  api_key: 'sk_abcdef1234567890...',
});

// Middleware for request logging
app.use(async (req, res, next) => {
  await logger.logInfo("HTTP Request", {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Error handling middleware
app.use(async (err, req, res, next) => {
  await logger.logError("Unhandled Error", {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  res.status(500).send('Internal Server Error');
});
```

### Async/Await vs Promise Chains

```javascript
// Using async/await (recommended)
async function processOrder(orderId) {
  try {
    await logger.logInfo("Processing order", { orderId });
    
    // Your business logic here
    const result = await processPayment(orderId);
    
    await logger.logSuccess("Order completed", { orderId, amount: result.amount });
    return result;
  } catch (error) {
    await logger.logError("Order failed", { orderId, error: error.message });
    throw error;
  }
}

// Using promises
function processOrder(orderId) {
  return logger.logInfo("Processing order", { orderId })
    .then(() => processPayment(orderId))
    .then(result => {
      return logger.logSuccess("Order completed", { orderId, amount: result.amount })
        .then(() => result);
    })
    .catch(error => {
      return logger.logError("Order failed", { orderId, error: error.message })
        .then(() => { throw error; });
    });
}
```

### Background Tasks & Cron Jobs

```javascript
const cron = require('node-cron');
const { Logger } = require('node-logger-simple');

const logger = new Logger({
  app_id: 'background_tasks_def456',
  api_key: 'sk_fedcba0987654321...',
});

// Daily backup task
cron.schedule('0 2 * * *', async () => {
  await logger.logInfo("Starting daily backup");
  
  try {
    await performBackup();
    await logger.logSuccess("Daily backup completed successfully");
  } catch (error) {
    await logger.logError("Backup failed", { error: error.message });
  }
});
```

## 🎛️ Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `app_id` | string | ✅ | Your application identifier |
| `api_key` | string | ✅ | Your API authentication key |
| `timeout` | number | ❌ | Request timeout in milliseconds (default: 5000) |
| `apiUrl` | string | ❌ | Custom API endpoint (default: auto-detected) |

```javascript
const logger = new Logger({
  app_id: 'my_app_123',
  api_key: 'sk_abc123...',
  timeout: 10000,  // 10 seconds timeout
  apiUrl: 'https://custom-api.example.com/api.php'
});
```

## 📊 Available Methods

| Method | Description | Example |
|--------|-------------|---------|
| `logSuccess(message, context?)` | Log successful operations | ✅ User registered |
| `logInfo(message, context?)` | Log informational messages | ℹ️ System status update |
| `logWarning(message, context?)` | Log warning conditions | ⚠️ Memory usage high |
| `logError(message, context?)` | Log error conditions | ❌ API request failed |
| `logCritical(message, context?)` | Log critical system failures | 🚨 Service unavailable |

All methods return a `Promise` and can be used with `async/await` or `.then()/.catch()`.

## 📈 Dashboard Features

Visit your dashboard at [logger-simple.com](https://logger-simple.com) to:

- 📊 **Real-time Analytics** - Monitor log patterns and trends
- 🔍 **Advanced Search** - Filter logs by level, date, or content
- 📱 **Mobile Access** - View logs on any device
- ⚡ **Live Updates** - See logs as they happen
- 📧 **Alerts** - Get notified of critical issues
- 📈 **Statistics** - Track application health metrics

## 🚨 Error Handling

```javascript
const logger = new Logger({
  app_id: 'my_app',
  api_key: 'invalid_key'  // This will cause authentication errors
});

try {
  await logger.logInfo("Test message");
} catch (error) {
  if (error.code === 401) {
    console.error("Authentication failed - check your API key");
  } else if (error.code === 429) {
    console.error("Rate limit exceeded - slow down your requests");
  } else {
    console.error("Logging failed:", error.message);
  }
}
```

## 🔧 Best Practices

### 1. **Use Structured Logging**
```javascript
// Good ✅
await logger.logInfo("User action", {
  action: "login",
  userId: 123,
  email: "user@example.com",
  timestamp: Date.now()
});

// Avoid ❌
await logger.logInfo("User 123 (user@example.com) logged in at " + new Date());
```

### 2. **Log at Appropriate Levels**
```javascript
// Success - for completed operations
await logger.logSuccess("Payment processed", { orderId, amount });

// Info - for general information
await logger.logInfo("User session started", { userId });

// Warning - for concerning but non-critical issues
await logger.logWarning("Slow database query", { queryTime: "5.2s" });

// Error - for errors that don't crash the app
await logger.logError("Email sending failed", { recipient, error });

// Critical - for system-level failures
await logger.logCritical("Database connection lost", { server });
```

### 3. **Handle Failures Gracefully**
```javascript
async function safeLog(level, message, context) {
  try {
    await logger[level](message, context);
  } catch (error) {
    // Don't let logging failures crash your app
    console.error('Logging failed:', error.message);
  }
}
```

### 4. **Use Context Effectively**
```javascript
// Include relevant debugging information
await logger.logError("API request failed", {
  url: "/api/users",
  method: "POST", 
  statusCode: 500,
  responseTime: "2.3s",
  requestId: "req-123",
  userId: 456
});
```

## 🔗 Related Resources

- 📖 **Documentation**: [docs.logger-simple.com](https://docs.logger-simple.com)
- 🏠 **Dashboard**: [panel.logger-simple.com](https://panel.logger-simple.com)
- 💬 **Support Forum**: [help.logger-simple.com](https://help.logger-simple.com)
- 🐛 **Issues**: [GitHub Issues](https://github.com/Cut0x/node-logger-simple/issues)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

---

<div align="center">
  <p><strong>Built with ❤️ by the Logger Simple team</strong></p>
  <p>
    <a href="https://logger-simple.com">Website</a> •
    <a href="https://help.logger-simple.com">Documentation</a> •
    <a href="https://help.logger-simple.com">Support</a>
  </p>
</div>