# 🚀 Logger Simple - Enterprise Node.js Logging

<div align="center">
  <img src="https://logger-simple.com/assets/imgs/logo.png" alt="Logger Simple" width="120" height="120">
  
  **Production-ready logging with crash detection, graceful shutdown, and real-time monitoring**
  
  [![npm version](https://badge.fury.io/js/node-logger-simple.svg)](https://badge.fury.io/js/node-logger-simple)
  [![Downloads](https://img.shields.io/npm/dm/node-logger-simple.svg)](https://www.npmjs.com/package/node-logger-simple)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Node.js](https://img.shields.io/badge/Node.js-16%2B-green.svg)](https://nodejs.org)
  [![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
</div>

---

## 🎯 What is Logger Simple?

Logger Simple is a **production-ready logging solution** for Node.js applications that goes beyond basic logging. It provides:

- **🛡️ Automatic crash detection** - Never lose track of application failures
- **🔄 Graceful shutdown handling** - Ensure logs are saved before exit
- **📊 Real-time monitoring dashboard** - Monitor your apps 24/7
- **⚡ High-performance batch processing** - Handle thousands of logs efficiently
- **🔍 Advanced search & filtering** - Find exactly what you need
- **📱 Mobile-friendly interface** - Access logs from anywhere

Perfect for **production applications**, **microservices**, **APIs**, and **background services** that need reliable logging and monitoring.

---

## 📦 Installation

```bash
npm install node-logger-simple
```

**Requirements:**
- Node.js 16+ (ES2020 features required)
- Internet connection for API communication
- Logger Simple account (free tier available)

---

## 🚀 Quick Start (30 seconds)

### 1. Get Your Credentials
1. Visit [logger-simple.com](https://logger-simple.com) and create a free account
2. Create a new application in your dashboard
3. Copy your `app_id` and `api_key`

### 2. Basic Setup
```javascript
const { Logger } = require('node-logger-simple');

const logger = new Logger({
  app_id: 'your_app_id',     // From your dashboard
  api_key: 'your_api_key',   // From your dashboard
});

// Start logging immediately!
await logger.logInfo("🚀 Application started successfully");
await logger.logSuccess("✅ User authentication completed");
await logger.logWarning("⚠️ Memory usage is high", { usage: "85%" });
await logger.logError("❌ Database connection failed", { host: "db.example.com" });
await logger.logCritical("🚨 System overload detected", { cpu: "95%", memory: "90%" });
```

### 3. View Your Logs
Visit your dashboard at [logger-simple.com](https://logger-simple.com) to see your logs in real-time!

---

## 🌟 Key Features

### 🛡️ **Automatic Crash Detection**
```javascript
const logger = new Logger({
  app_id: 'my_app',
  api_key: 'sk_...',
  options: {
    enableCrashLogging: true  // Automatically log crashes
  }
});

// The logger will automatically detect and log:
// - Uncaught exceptions
// - Unhandled promise rejections  
// - Memory warnings
// - Process termination signals
```

### 🔄 **Graceful Shutdown**
```javascript
const logger = new Logger({
  app_id: 'my_app', 
  api_key: 'sk_...',
  options: {
    enableGracefulShutdown: true,  // Handle shutdown gracefully
    shutdownTimeout: 5000          // Wait 5s for logs to flush
  }
});

// Automatically handles: SIGTERM, SIGINT, SIGUSR2
// Ensures all logs are sent before application exits
```

### ⚡ **High-Performance Batch Processing**
```javascript
const logger = new Logger({
  app_id: 'high_volume_app',
  api_key: 'sk_...',
  options: {
    batchSize: 100,       // Send 100 logs at once
    flushInterval: 5000   // Flush every 5 seconds
  }
});

// For high-volume applications
for (let i = 0; i < 1000; i++) {
  logger.queueLog('info', `Processing item ${i}`, { itemId: i });
}
// Logs are automatically batched and sent efficiently
```

### 💓 **Health Monitoring**
```javascript
const logger = new Logger({
  app_id: 'monitored_app',
  api_key: 'sk_...',
  options: {
    autoHeartbeat: true,       // Send heartbeat signals
    heartbeatInterval: 300000  // Every 5 minutes
  }
});

// Monitor application health in real-time
// Dashboard shows: online/offline status, last seen, response times
```

---

## 📚 Complete API Reference

### 🎛️ Constructor Options

```javascript
const logger = new Logger({
  // Required
  app_id: string,              // Your application ID
  api_key: string,             // Your API key
  
  // Optional
  options: {
    // Connection Settings
    timeout: 30000,            // Request timeout (ms)
    retryAttempts: 3,          // Number of retry attempts
    retryDelay: 1000,          // Base retry delay (ms)
    
    // Heartbeat Settings  
    autoHeartbeat: true,       // Send automatic heartbeats
    heartbeatInterval: 300000, // Heartbeat interval (ms)
    
    // Crash Detection
    enableCrashLogging: true,  // Log crashes automatically
    enableGracefulShutdown: true, // Handle shutdown gracefully
    shutdownTimeout: 5000,     // Shutdown timeout (ms)
    
    // Performance Settings
    batchSize: 100,            // Batch size for high volume
    flushInterval: 5000,       // Batch flush interval (ms)
    maxLogLength: 10000,       // Max log message length
    
    // Features
    enableMetrics: true        // Collect performance metrics
  }
});
```

### 📝 Logging Methods

| Method | Level | Icon | Use Case | Example |
|--------|-------|------|----------|---------|
| `logSuccess()` | Success | ✅ | Completed operations | Payment processed, User registered |
| `logInfo()` | Info | ℹ️ | General information | App started, Config loaded |
| `logWarning()` | Warning | ⚠️ | Concerning but non-critical | High memory, Slow query |
| `logError()` | Error | ❌ | Errors that don't crash app | API failure, Validation error |
| `logCritical()` | Critical | 🚨 | System-level failures | DB down, Service unavailable |

**Method Signature:**
```javascript
await logger.logLevel(message: string, context?: object): Promise<object>
```

### 🔧 Utility Methods

```javascript
// Get real-time metrics
const metrics = logger.getMetrics();
console.log(metrics);
// {
//   logsSent: 1250,
//   logsSuccess: 1248, 
//   logsError: 2,
//   isConnected: true,
//   uptime: 3600,
//   averageResponseTime: 145
// }

// Test API connectivity
await logger.testConnection();

// Send manual heartbeat
await logger.sendHeartbeat();

// Get application statistics
const stats = await logger.getStats(30); // Last 30 days

// Retrieve recent logs
const logs = await logger.getLogs({
  log_level: 'error',
  limit: 50,
  start_date: '2024-01-01'
});

// Graceful shutdown
await logger.shutdown();
```

### 📡 Event Handling

```javascript
// Connection Events
logger.on('connected', () => console.log('✅ Connected to API'));
logger.on('disconnected', (error) => console.log('❌ Disconnected:', error.message));

// Heartbeat Events  
logger.on('heartbeat', (data) => console.log('💓 Heartbeat sent'));
logger.on('heartbeatError', (error) => console.log('💔 Heartbeat failed'));

// Logging Events
logger.on('logSent', ({ level, message }) => console.log(`📝 ${level}: ${message}`));
logger.on('logError', ({ error }) => console.log('❌ Log failed:', error.message));

// Batch Events
logger.on('batchProcessed', ({ count }) => console.log(`📦 Batch sent: ${count} logs`));

// Lifecycle Events
logger.on('ready', () => console.log('🚀 Logger ready'));
logger.on('shutdown', ({ graceful }) => console.log(`🛑 Shutdown: ${graceful ? 'graceful' : 'forced'}`));
```

---

## 💡 Real-World Examples

### 🌐 **Express.js Web Application**

```javascript
const express = require('express');
const { Logger } = require('node-logger-simple');

const app = express();
const logger = new Logger({
  app_id: 'my_web_app',
  api_key: process.env.LOGGER_API_KEY,
  options: {
    enableCrashLogging: true,
    enableGracefulShutdown: true
  }
});

// Request logging middleware
app.use(async (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', async () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'logError' : 'logInfo';
    
    await logger[level]('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
});

// Error handling
app.use(async (err, req, res, next) => {
  await logger.logError('Unhandled Express Error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body
  });
  
  res.status(500).json({ error: 'Internal Server Error' });
});

// Application startup
app.listen(3000, async () => {
  await logger.logSuccess('Express server started', {
    port: 3000,
    environment: process.env.NODE_ENV,
    pid: process.pid
  });
});
```

### 🗄️ **Database Operations**

```javascript
const { Logger } = require('node-logger-simple');
const mysql = require('mysql2/promise');

class DatabaseManager {
  constructor() {
    this.logger = new Logger({
      app_id: 'database_manager',
      api_key: process.env.LOGGER_API_KEY
    });
    
    this.pool = mysql.createPool({
      host: 'localhost',
      user: 'root', 
      password: 'password',
      database: 'myapp'
    });
  }

  async executeQuery(query, params = []) {
    const start = Date.now();
    
    try {
      await this.logger.logInfo('Database query started', {
        query: query.substring(0, 100) + '...',
        paramCount: params.length
      });
      
      const [results] = await this.pool.execute(query, params);
      const duration = Date.now() - start;
      
      await this.logger.logSuccess('Database query completed', {
        duration: `${duration}ms`,
        rowCount: results.length || results.affectedRows
      });
      
      return results;
      
    } catch (error) {
      const duration = Date.now() - start;
      
      await this.logger.logError('Database query failed', {
        error: error.message,
        query: query.substring(0, 100) + '...',
        duration: `${duration}ms`,
        sqlState: error.sqlState,
        errno: error.errno
      });
      
      throw error;
    }
  }

  async healthCheck() {
    try {
      await this.executeQuery('SELECT 1');
      await this.logger.logSuccess('Database health check passed');
      return true;
    } catch (error) {
      await this.logger.logCritical('Database health check failed', {
        error: error.message
      });
      return false;
    }
  }
}
```

### ⏰ **Background Tasks & Cron Jobs**

```javascript
const cron = require('node-cron');
const { Logger } = require('node-logger-simple');

class TaskScheduler {
  constructor() {
    this.logger = new Logger({
      app_id: 'task_scheduler',
      api_key: process.env.LOGGER_API_KEY,
      options: {
        enableCrashLogging: true
      }
    });
    
    this.setupTasks();
  }

  setupTasks() {
    // Daily backup at 2 AM
    cron.schedule('0 2 * * *', async () => {
      await this.runTask('daily-backup', this.performBackup.bind(this));
    });

    // Hourly cleanup
    cron.schedule('0 * * * *', async () => {
      await this.runTask('hourly-cleanup', this.cleanupTempFiles.bind(this));
    });

    // Health check every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.runTask('health-check', this.systemHealthCheck.bind(this));
    });
  }

  async runTask(taskName, taskFunction) {
    const start = Date.now();
    
    try {
      await this.logger.logInfo(`Task started: ${taskName}`, {
        startTime: new Date().toISOString()
      });
      
      const result = await taskFunction();
      const duration = Date.now() - start;
      
      await this.logger.logSuccess(`Task completed: ${taskName}`, {
        duration: `${duration}ms`,
        result: result
      });
      
    } catch (error) {
      const duration = Date.now() - start;
      
      await this.logger.logError(`Task failed: ${taskName}`, {
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`
      });
    }
  }

  async performBackup() {
    // Backup logic here
    return { filesBackedUp: 1250, size: '2.3GB' };
  }

  async cleanupTempFiles() {
    // Cleanup logic here  
    return { filesDeleted: 45, spaceFreed: '125MB' };
  }

  async systemHealthCheck() {
    const metrics = {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      loadAverage: require('os').loadavg()
    };
    
    if (metrics.memory.heapUsed / metrics.memory.heapTotal > 0.9) {
      await this.logger.logWarning('High memory usage detected', metrics);
    }
    
    return metrics;
  }
}

new TaskScheduler();
```

### 🔄 **Microservice with Batch Logging**

```javascript
const { Logger } = require('node-logger-simple');

class OrderProcessor {
  constructor() {
    this.logger = new Logger({
      app_id: 'order_processor',
      api_key: process.env.LOGGER_API_KEY,
      options: {
        batchSize: 50,           // Process 50 logs at once
        flushInterval: 2000,     // Flush every 2 seconds
        enableMetrics: true
      }
    });
    
    this.processedOrders = 0;
  }

  async processOrders(orders) {
    await this.logger.logInfo(`Processing batch of ${orders.length} orders`);
    
    for (const order of orders) {
      try {
        // Use queueLog for high-volume scenarios
        this.logger.queueLog('info', 'Processing order', {
          orderId: order.id,
          customerId: order.customerId,
          amount: order.amount
        });
        
        await this.processOrder(order);
        
        this.logger.queueLog('success', 'Order processed successfully', {
          orderId: order.id,
          processingTime: Date.now() - order.startTime
        });
        
        this.processedOrders++;
        
      } catch (error) {
        this.logger.queueLog('error', 'Order processing failed', {
          orderId: order.id,
          error: error.message
        });
      }
    }
    
    // Log summary statistics
    const metrics = this.logger.getMetrics();
    await this.logger.logInfo('Batch processing completed', {
      ordersProcessed: this.processedOrders,
      logsInQueue: metrics.queueSize,
      logsSent: metrics.logsSent
    });
  }

  async processOrder(order) {
    // Simulate order processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error('Payment processing failed');
    }
    
    return { success: true, orderId: order.id };
  }
}
```

---

## 🚀 Production Deployment

### 🌍 **Environment Configuration**

```javascript
// config/logger.js
const { Logger } = require('node-logger-simple');

const createLogger = (appName) => {
  return new Logger({
    app_id: process.env.LOGGER_APP_ID || `${appName}_${process.env.NODE_ENV}`,
    api_key: process.env.LOGGER_API_KEY,
    options: {
      // Production settings
      autoHeartbeat: true,
      heartbeatInterval: 300000,        // 5 minutes
      enableCrashLogging: true,
      enableGracefulShutdown: true,
      
      // Performance settings
      batchSize: 100,
      flushInterval: 5000,
      retryAttempts: 3,
      timeout: 30000,
      
      // Limits
      maxLogLength: 10000,
      shutdownTimeout: 5000
    }
  });
};

module.exports = { createLogger };
```

### 📁 **Project Structure**
```
my-app/
├── src/
│   ├── config/
│   │   └── logger.js          # Logger configuration
│   ├── middleware/
│   │   └── logging.js         # Express logging middleware
│   ├── services/
│   │   └── database.js        # Database with logging
│   └── app.js                 # Main application
├── .env                       # Environment variables
├── package.json
└── README.md
```

### 🔧 **Environment Variables**
```bash
# .env
NODE_ENV=production
LOGGER_APP_ID=my_production_app
LOGGER_API_KEY=sk_your_production_api_key_here
LOGGER_API_URL=https://api.logger-simple.com/

# Optional advanced settings
LOGGER_BATCH_SIZE=100
LOGGER_HEARTBEAT_INTERVAL=300000
LOGGER_TIMEOUT=30000
```

### 🐳 **Docker Integration**

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Set up logging
ENV NODE_ENV=production
ENV LOGGER_APP_ID=my_docker_app

# Health check with logging
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('./src/health-check.js')"

EXPOSE 3000
CMD ["node", "src/app.js"]
```

```javascript
// src/health-check.js
const { createLogger } = require('./config/logger');

async function healthCheck() {
  const logger = createLogger('health-check');
  
  try {
    // Test application health
    const healthy = await testApplicationHealth();
    
    if (healthy) {
      await logger.logSuccess('Health check passed');
      process.exit(0);
    } else {
      await logger.logError('Health check failed');
      process.exit(1);
    }
  } catch (error) {
    await logger.logCritical('Health check error', { error: error.message });
    process.exit(1);
  }
}

healthCheck();
```

---

## 📊 Dashboard & Monitoring

### 🎯 **Dashboard Features**

Visit [logger-simple.com](https://logger-simple.com) to access:

| Feature | Description |
|---------|-------------|
| **📊 Real-time Logs** | See logs as they arrive with live updates |
| **🔍 Advanced Search** | Filter by level, date, message content, or context |
| **📈 Analytics** | Log volume trends, error rates, response times |
| **⚠️ Alerts** | Email/SMS notifications for critical issues |
| **📱 Mobile App** | iOS/Android apps for monitoring on-the-go |
| **🔗 Integrations** | Slack, Discord, PagerDuty, Webhook integrations |
| **📋 Reports** | Generate PDF reports for stakeholders |
| **👥 Team Access** | Multi-user access with role-based permissions |

### 📱 **Mobile Monitoring**

Download the Logger Simple mobile app:
- **iOS**: [App Store Link](https://apps.apple.com/logger-simple)
- **Android**: [Google Play Link](https://play.google.com/logger-simple)

Features:
- Push notifications for critical logs
- Real-time log streaming
- Quick search and filtering
- Offline log caching
- Dark mode support

### 🚨 **Alert Configuration**

```javascript
// Set up alerts in your dashboard or via API
const alertRules = [
  {
    name: "Critical Errors",
    condition: "log_level = 'critical'",
    action: "email + sms",
    throttle: "5 minutes"
  },
  {
    name: "High Error Rate", 
    condition: "error_count > 10 in 5 minutes",
    action: "slack",
    channel: "#alerts"
  },
  {
    name: "Application Offline",
    condition: "no_heartbeat_for > 10 minutes", 
    action: "pagerduty",
    escalation: "on-call-engineer"
  }
];
```

---

## 🔧 Troubleshooting

### ❌ **Common Issues**

#### **Authentication Errors**
```javascript
// Error: 401 - Authentication failed
// Solution: Check your app_id and api_key

const logger = new Logger({
  app_id: 'correct_app_id',        // ✅ From dashboard
  api_key: 'sk_correct_api_key',   // ✅ From dashboard
});
```

#### **Network Timeouts**
```javascript
// Error: Request timeout
// Solution: Increase timeout or check network

const logger = new Logger({
  app_id: 'my_app',
  api_key: 'sk_...',
  options: {
    timeout: 60000,     // Increase to 60 seconds
    retryAttempts: 5    // More retry attempts
  }
});
```

#### **Rate Limiting**
```javascript
// Error: 429 - Rate limit exceeded
// Solution: Use batch logging for high volume

const logger = new Logger({
  app_id: 'high_volume_app',
  api_key: 'sk_...',
  options: {
    batchSize: 100,      // Batch logs together
    flushInterval: 5000  // Send every 5 seconds
  }
});

// Use queueLog instead of direct logging
logger.queueLog('info', 'High volume message');
```

#### **Memory Leaks**
```javascript
// Issue: High memory usage
// Solution: Proper cleanup and limits

const logger = new Logger({
  app_id: 'my_app',
  api_key: 'sk_...',
  options: {
    maxLogLength: 5000,  // Limit log size
    batchSize: 50       // Smaller batches
  }
});

// Always handle shutdown
process.on('SIGTERM', async () => {
  await logger.shutdown();
  process.exit(0);
});
```

### 🔍 **Debug Mode**

```javascript
// Enable debug logging
const logger = new Logger({
  app_id: 'debug_app',
  api_key: 'sk_...',
  options: {
    debug: true  // Enable debug output
  }
});

// Listen to all events for debugging
logger.on('*', (eventName, data) => {
  console.log(`Debug: ${eventName}`, data);
});
```

### 📞 **Getting Help**

- 📖 **Documentation**: [docs.logger-simple.com](https://docs.logger-simple.com)
- 💬 **Support Forum**: [help.logger-simple.com](https://help.logger-simple.com)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/logger-simple/node-logger-simple/issues)
- 📧 **Email Support**: support@logger-simple.com
- 💬 **Discord Community**: [Discord Server](https://discord.gg/logger-simple)

---

## ⚡ Performance & Best Practices

### 🚀 **Performance Tips**

1. **Use Batch Logging for High Volume**
```javascript
// For > 100 logs per minute
const logger = new Logger({
  options: { batchSize: 100, flushInterval: 5000 }
});

// Queue logs instead of sending individually
logger.queueLog('info', 'High volume message');
```

2. **Optimize Context Data**
```javascript
// Good ✅ - Structured, relevant data
await logger.logError('API Error', {
  endpoint: '/api/users',
  statusCode: 500,
  responseTime: 1200,
  userId: 12345
});

// Avoid ❌ - Large objects, circular references
await logger.logError('Error', {
  largeObject: { /* massive object */ },
  circularRef: someObjectWithCircularReference
});
```

3. **Handle Failures Gracefully**
```javascript
async function safeLog(logger, level, message, context) {
  try {
    await logger[level](message, context);
  } catch (error) {
    // Never let logging failures crash your app
    console.error('Logging failed:', error.message);
    
    // Optional: Use fallback logging
    require('fs').appendFileSync('fallback.log', 
      `${new Date().toISOString()} [${level}] ${message}\n`
    );
  }
}
```

### 🎯 **Best Practices**

#### **1. Log Levels Usage**
```javascript
// ✅ SUCCESS - Completed business operations
await logger.logSuccess('Order processed', { orderId: 123, amount: 99.99 });
await logger.logSuccess('User registered', { userId: 456, email: 'user@example.com' });

// ℹ️ INFO - System events, state changes
await logger.logInfo('Server started', { port: 3000, env: 'production' });
await logger.logInfo('Cache cleared', { keys: 150, duration: '2.3s' });

// ⚠️ WARNING - Issues that don't break functionality
await logger.logWarning('Slow query detected', { duration: '5.2s', query: 'SELECT...' });
await logger.logWarning('Memory usage high', { usage: '85%', threshold: '80%' });

// ❌ ERROR - Errors that are handled gracefully
await logger.logError('Payment failed', { orderId: 123, reason: 'Insufficient funds' });
await logger.logError('Email delivery failed', { recipient: 'user@example.com' });

// 🚨 CRITICAL - System failures, outages
await logger.logCritical('Database connection lost', { host: 'db.example.com' });
await logger.logCritical('Service unavailable', { service: 'payment-gateway' });
```

#### **2. Structured Logging**
```javascript
// ✅ Good - Consistent, searchable structure
const logContext = {
  userId: 12345,
  sessionId: 'abc123',
  requestId: 'req-456', 
  operation: 'user_login',
  timestamp: Date.now(),
  userAgent: req.get('User-Agent')
};

await logger.logSuccess('User login successful', logContext);

// ❌ Avoid - Unstructured text
await logger.logSuccess(`User ${userId} logged in at ${new Date()} from ${ip}`);
```

#### **3. Error Context**
```javascript
// ✅ Rich error context
try {
  await processPayment(order);
} catch (error) {
  await logger.logError('Payment processing failed', {
    orderId: order.id,
    customerId: order.customerId,
    amount: order.amount,
    paymentMethod: order.paymentMethod,
    error: error.message,
    errorCode: error.code,
    stack: error.stack,
    timestamp: Date.now(),
    retryCount: order.retryCount || 0
  });
}
```

#### **4. Performance Monitoring**
```javascript
// Track operation performance
async function monitoredOperation(operationName, operation) {
  const start = Date.now();
  
  try {
    await logger.logInfo(`${operationName} started`);
    const result = await operation();
    const duration = Date.now() - start;
    
    await logger.logSuccess(`${operationName} completed`, {
      duration: `${duration}ms`,
      result: typeof result === 'object' ? Object.keys(result) : result
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    await logger.logError(`${operationName} failed`, {
      duration: `${duration}ms`,
      error: error.message
    });
    
    throw error;
  }
}

// Usage
const data = await monitoredOperation('Database Query', () => 
  db.query('SELECT * FROM users WHERE active = 1')
);
```

---

## 🔐 Security & Privacy

### 🛡️ **Data Security**

- **🔒 TLS/SSL Encryption**: All data transmitted over HTTPS
- **🔑 API Key Authentication**: Secure authentication with rotating keys
- **🌍 Data Residency**: Choose your data storage region
- **🗂️ Data Retention**: Configurable retention policies (7-365 days)
- **🔄 GDPR Compliance**: Right to deletion, data portability
- **🛡️ SOC 2 Type II**: Annual security audits and compliance

### 🔑 **API Key Management**

```javascript
// Rotate API keys regularly
const logger = new Logger({
  app_id: 'my_app',
  api_key: process.env.LOGGER_API_KEY, // Store in environment variables
});

// Monitor for compromised keys
logger.on('logError', (data) => {
  if (data.error.message.includes('Invalid API key')) {
    // Alert security team
    notifySecurityTeam('Potential API key compromise detected');
  }
});
```

### 🚫 **Sensitive Data Handling**

```javascript
// ✅ Safe logging - No sensitive data
await logger.logInfo('User authentication', {
  userId: user.id,                    // ✅ Safe ID
  email: user.email.replace(/./g, '*'), // ✅ Masked email
  loginTime: Date.now(),              // ✅ Timestamp
  ipAddress: req.ip.split('.').slice(0, 3).join('.') + '.xxx' // ✅ Partial IP
});

// ❌ Dangerous - Contains sensitive data
await logger.logInfo('User login', {
  password: user.password,            // ❌ Never log passwords
  creditCard: user.creditCard,        // ❌ Never log financial data
  ssn: user.ssn,                     // ❌ Never log personal identifiers
  apiKey: user.apiKey                 // ❌ Never log credentials
});
```

---

## 📈 Advanced Use Cases

### 🔄 **A/B Testing & Feature Flags**

```javascript
const logger = new Logger({ app_id: 'ab_testing', api_key: 'sk_...' });

async function trackExperiment(userId, experiment, variant, outcome) {
  await logger.logInfo('A/B Test Event', {
    userId: userId,
    experiment: experiment,
    variant: variant,
    outcome: outcome,
    timestamp: Date.now(),
    sessionId: getSessionId(userId)
  });
}

// Usage
await trackExperiment(12345, 'checkout_button_color', 'red', 'conversion');
await trackExperiment(12346, 'checkout_button_color', 'blue', 'abandonment');
```

### 📊 **Business Metrics Tracking**

```javascript
const logger = new Logger({ app_id: 'business_metrics', api_key: 'sk_...' });

class MetricsTracker {
  async trackRevenue(orderId, amount, currency = 'USD') {
    await logger.logSuccess('Revenue Generated', {
      metric: 'revenue',
      orderId: orderId,
      amount: amount,
      currency: currency,
      timestamp: Date.now()
    });
  }
  
  async trackUserEngagement(userId, action, duration) {
    await logger.logInfo('User Engagement', {
      metric: 'engagement',
      userId: userId,
      action: action,
      duration: duration,
      timestamp: Date.now()
    });
  }
  
  async trackConversion(userId, funnel, step, success) {
    await logger.logInfo('Conversion Funnel', {
      metric: 'conversion',
      userId: userId,
      funnel: funnel,
      step: step,
      success: success,
      timestamp: Date.now()
    });
  }
}
```

### 🔒 **Security Event Monitoring**

```javascript
const logger = new Logger({ app_id: 'security_events', api_key: 'sk_...' });

class SecurityMonitor {
  async logFailedLogin(email, ip, reason) {
    await logger.logWarning('Failed Login Attempt', {
      security_event: 'failed_login',
      email: email,
      ip_address: ip,
      reason: reason,
      timestamp: Date.now(),
      severity: 'medium'
    });
  }
  
  async logSuspiciousActivity(userId, activity, riskScore) {
    const level = riskScore > 0.8 ? 'logCritical' : 'logWarning';
    
    await logger[level]('Suspicious Activity Detected', {
      security_event: 'suspicious_activity',
      userId: userId,
      activity: activity,
      risk_score: riskScore,
      timestamp: Date.now(),
      requires_review: riskScore > 0.6
    });
  }
  
  async logPrivilegeEscalation(userId, fromRole, toRole, authorizedBy) {
    await logger.logInfo('Privilege Change', {
      security_event: 'privilege_escalation',
      userId: userId,
      from_role: fromRole,
      to_role: toRole,
      authorized_by: authorizedBy,
      timestamp: Date.now()
    });
  }
}
```

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### 🚀 **Development Setup**

```bash
# Clone the repository
git clone https://github.com/logger-simple/node-logger-simple.git
cd node-logger-simple

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your test credentials

# Run tests
npm test

# Run linting
npm run lint

# Build the project
npm run build
```

### 📋 **Contribution Guidelines**

1. **🔧 Code Standards**
   - Write comprehensive tests
   - Document all public APIs
   - Use conventional commit messages

2. **🧪 Testing Requirements**
   - Unit tests for all new features
   - Integration tests for API interactions
   - Performance tests for batch operations
   - Error handling test coverage

3. **📝 Documentation**
   - Update README.md for new features
   - Add JSDoc comments for all methods
   - Include usage examples

### 🐛 **Reporting Issues**

When reporting bugs, please include:
- **Node.js version**: `node --version`
- **Package version**: `npm list node-logger-simple`
- **Operating system**: Windows/macOS/Linux
- **Error messages**: Full stack traces
- **Reproduction steps**: Minimal code example
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens

---

## 📄 License & Legal

### 📜 **License**

### 🔒 **Privacy Policy**
- We collect only necessary logging data
- Data is encrypted in transit and at rest
- No personal data is shared with third parties
- Users can delete their data at any time

---

## 🌟 Community & Support

<div align="center">

### 💬 **Join Our Community**

[![Discord](https://img.shields.io/discord/123456789?label=Discord&logo=discord&logoColor=white)](https://discord.gg/)
[![Twitter](https://img.shields.io/twitter/follow/loggersimple?style=social)](https://twitter.com/logger-simple)
[![GitHub](https://img.shields.io/github/stars/logger-simple/node-logger-simple?style=social)](https://github.com/logger-simple/node-logger-simple)

### 📞 **Get Support**

| Type | Link | Response Time |
|------|------|---------------|
| 📖 **Documentation** | [docs.logger-simple.com](https://docs.logger-simple.com) | Instant |
| 💬 **Community Forum** | [community.logger-simple.com](https://community.logger-simple.com) | < 2 hours |
| 🐛 **Bug Reports** | [GitHub Issues](https://github.com/logger-simple/node-logger-simple/issues) | < 12 hours |
| 📧 **Email Support** | [support@hello-simple.com](mailto:hello@logger-simple.com) | < 24 hours |

---

**Built with ❤️ by the Logger Simple team**

*Making logging simple, powerful, and accessible for every developer.*

</div>