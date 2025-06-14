const axios = require('axios');
const EventEmitter = require('events');

const { version } = require('./package.json');

/**
 * Logger Simple - Enhanced Node.js Module
 * Version 2.1 with improved API integration and crash detection
 */
class Logger extends EventEmitter {
  constructor({ app_id, api_key, apiUrl, options = {} }) {
    super();
    
    if (!app_id || !api_key) {
      throw new Error("app_id and api_key are required.");
    }
    
    // Main configuration
    this.app_id = app_id;
    this.api_key = api_key;
    this.apiUrl = "https://api.logger-simple.com/"; // Require : no edit !
    
    // Advanced options
    this.options = {
      autoHeartbeat: options.autoHeartbeat !== false,
      heartbeatInterval: options.heartbeatInterval || 300000, // 5 minutes
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      timeout: options.timeout || 30000,
      enableCrashLogging: options.enableCrashLogging !== false,
      enableMetrics: options.enableMetrics !== false,
      maxLogLength: options.maxLogLength || 10000,
      batchSize: options.batchSize || 100,
      flushInterval: options.flushInterval || 5000,
      shutdownTimeout: options.shutdownTimeout || 5000,
      enableGracefulShutdown: options.enableGracefulShutdown !== false,
      ...options
    };
    
    // Internal state
    this.heartbeatIntervalId = null;
    this.isConnected = false;
    this.logQueue = [];
    this.batchTimer = null;
    this.isShuttingDown = false;
    this.shutdownPromise = null;
    this.metrics = {
      logsSent: 0,
      logsSuccess: 0,
      logsError: 0,
      lastHeartbeat: null,
      connectionErrors: 0,
      averageResponseTime: 0,
      startTime: new Date(),
      crashes: 0,
      gracefulShutdowns: 0
    };
    
    // HTTP client configuration
    this.httpClient = axios.create({
      timeout: this.options.timeout,
      headers: {
        'User-Agent': `Logger-Simple-NodeJS/${version}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Initialize
    this.init();
  }
  
  /**
   * Logger initialization
   */
  async init() {
    try {
      // Initial connection test
      await this.testConnection();
      
      // Start automatic heartbeat
      if (this.options.autoHeartbeat) {
        this.startHeartbeat();
      }
      
      // Setup error handling
      if (this.options.enableCrashLogging) {
        this.setupCrashLogging();
      }
      
      // Setup graceful shutdown
      if (this.options.enableGracefulShutdown) {
        this.setupGracefulShutdown();
      }
      
      // Start batch processing
      this.startBatchProcessing();
      
      // Log successful initialization
      await this.logInfo(`Logger initialized successfully for app: ${this.app_id}`, {
        version: `${version}`,
        options: this.options,
        startTime: this.metrics.startTime.toISOString()
      });
      
      this.emit('ready');
      console.log(`[Logger] Initialized successfully for app: ${this.app_id}`);
      
    } catch (error) {
      this.emit('error', error);
      console.error('[Logger] Initialization failed:', error.message);
    }
  }
  
  /**
   * Test API connection
   */
  async testConnection() {
    try {
      const response = await this.makeRequest('health', {}, 'GET');
      this.isConnected = true;
      this.metrics.connectionErrors = 0;
      this.emit('connected');
      return response;
    } catch (error) {
      this.isConnected = false;
      this.metrics.connectionErrors++;
      this.emit('disconnected', error);
      throw error;
    }
  }
  
  /**
   * Send log with error handling and retry
   */
  async sendLog(logLevel, message, context = null, options = {}) {
    if (this.isShuttingDown && !options.allowDuringShutdown) {
      console.warn('[Logger] Skipping log during shutdown:', message);
      return null;
    }
    
    const startTime = Date.now();
    
    try {
      // Validation
      if (!['success', 'info', 'warning', 'error', 'critical'].includes(logLevel)) {
        throw new Error(`Invalid log level: ${logLevel}`);
      }
      
      if (typeof message !== 'string' || message.length === 0) {
        throw new Error('Message must be a non-empty string');
      }
      
      if (message.length > this.options.maxLogLength) {
        message = message.substring(0, this.options.maxLogLength) + '... [TRUNCATED]';
      }
      
      // Prepare data according to API format
      const logData = {
        action: 'logger',
        request: 'new_log',
        app_id: this.app_id,
        api_key: this.api_key,
        logLevel: logLevel,
        message: message
      };
      
      if (context) {
        logData.context = typeof context === 'string' ? context : JSON.stringify(context);
      }
      
      // Send with retry
      const result = await this.makeRequestWithRetry(logData);
      
      // Update metrics
      this.metrics.logsSent++;
      this.metrics.logsSuccess++;
      this.updateAverageResponseTime(Date.now() - startTime);
      
      this.emit('logSent', { level: logLevel, message, result });
      return result;
      
    } catch (error) {
      this.metrics.logsError++;
      this.emit('logError', { level: logLevel, message, error });
      
      if (options.throwOnError !== false) {
        throw error;
      }
      
      console.error(`[Logger] Failed to send ${logLevel} log:`, error.message);
      return null;
    }
  }
  
  /**
   * Simplified logging methods
   */
  async logSuccess(message, context = null) {
    return this.sendLog('success', message, context);
  }
  
  async logInfo(message, context = null) {
    return this.sendLog('info', message, context);
  }
  
  async logWarning(message, context = null) {
    return this.sendLog('warning', message, context);
  }
  
  async logError(message, context = null) {
    return this.sendLog('error', message, context);
  }
  
  async logCritical(message, context = null) {
    return this.sendLog('critical', message, context);
  }
  
  /**
   * Batch logging (for high volume)
   */
  queueLog(logLevel, message, context = null) {
    if (this.isShuttingDown) {
      console.warn('[Logger] Skipping queued log during shutdown:', message);
      return;
    }
    
    this.logQueue.push({ logLevel, message, context, timestamp: Date.now() });
    
    if (this.logQueue.length >= this.options.batchSize) {
      this.flushLogs();
    }
  }
  
  async flushLogs() {
    if (this.logQueue.length === 0) return;
    
    const logsToSend = this.logQueue.splice(0, this.options.batchSize);
    
    try {
      const promises = logsToSend.map(log => 
        this.sendLog(log.logLevel, log.message, log.context, { 
          throwOnError: false,
          allowDuringShutdown: true 
        })
      );
      
      await Promise.allSettled(promises);
      this.emit('batchProcessed', { count: logsToSend.length });
      
    } catch (error) {
      this.emit('batchError', error);
      console.error('[Logger] Batch processing failed:', error.message);
    }
  }
  
  /**
   * Enhanced heartbeat
   */
  async sendHeartbeat() {
    try {
      const data = {
        action: 'logger',
        request: 'heartbeat',
        app_id: this.app_id,
        api_key: this.api_key
      };
      
      const result = await this.makeRequest('heartbeat', data);
      this.metrics.lastHeartbeat = new Date();
      this.isConnected = true;
      this.emit('heartbeat', result);
      
      return result;
      
    } catch (error) {
      this.isConnected = false;
      this.emit('heartbeatError', error);
      throw error;
    }
  }
  
  /**
   * Start automatic heartbeat
   */
  startHeartbeat() {
    if (this.heartbeatIntervalId) {
      return;
    }
    
    this.heartbeatIntervalId = setInterval(async () => {
      if (this.isShuttingDown) return;
      
      try {
        await this.sendHeartbeat();
      } catch (error) {
        console.error('[Logger] Heartbeat failed:', error.message);
      }
    }, this.options.heartbeatInterval);
    
    console.log(`[Logger] Heartbeat started (interval: ${this.options.heartbeatInterval}ms)`);
  }
  
  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
      console.log('[Logger] Heartbeat stopped');
    }
  }
  
  /**
   * Start batch processing
   */
  startBatchProcessing() {
    this.batchTimer = setInterval(() => {
      if (!this.isShuttingDown) {
        this.flushLogs();
      }
    }, this.options.flushInterval);
  }
  
  /**
   * Get logs
   */
  async getLogs(filters = {}) {
    const data = {
      action: 'logger',
      request: 'get_logs',
      app_id: this.app_id,
      api_key: this.api_key,
      ...filters
    };
    
    return this.makeRequest('get_logs', data);
  }
  
  /**
   * Get statistics
   */
  async getStats(days = 7) {
    const data = {
      action: 'logger',
      request: 'stats',
      app_id: this.app_id,
      api_key: this.api_key,
      days: days
    };
    
    return this.makeRequest('stats', data);
  }
  
  /**
   * Get local metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      isConnected: this.isConnected,
      queueSize: this.logQueue.length,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      isShuttingDown: this.isShuttingDown
    };
  }
  
  /**
   * Enhanced crash detection and logging
   */
  setupCrashLogging() {
    // Uncaught exceptions
    process.on('uncaughtException', async (error) => {
      this.metrics.crashes++;
      console.error('[Logger] Uncaught Exception detected:', error.message);
      
      try {
        await this.logCritical('Uncaught Exception detected - Application will exit', {
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          pid: process.pid,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage()
        });
        
        // Force flush any remaining logs
        await this.flushLogs();
        
      } catch (e) {
        console.error('[Logger] Failed to log uncaught exception:', e.message);
      }
      
      // Wait for logs to be sent
      setTimeout(() => {
        console.error('[Logger] Exiting due to uncaught exception');
        process.exit(1);
      }, 2000);
    });
    
    // Unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      this.metrics.crashes++;
      console.error('[Logger] Unhandled Promise Rejection detected');
      
      try {
        await this.logCritical('Unhandled Promise Rejection detected', {
          reason: reason?.toString() || 'Unknown reason',
          promise: promise?.toString() || 'Unknown promise',
          timestamp: new Date().toISOString(),
          pid: process.pid,
          uptime: process.uptime()
        });
      } catch (e) {
        console.error('[Logger] Failed to log unhandled rejection:', e.message);
      }
    });
    
    // Warning for potential memory leaks
    process.on('warning', async (warning) => {
      if (warning.name === 'MaxListenersExceededWarning' || 
          warning.name === 'DeprecationWarning') {
        try {
          await this.logWarning(`Node.js Warning: ${warning.name}`, {
            message: warning.message,
            stack: warning.stack,
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          console.error('[Logger] Failed to log warning:', e.message);
        }
      }
    });
  }
  
  /**
   * Setup graceful shutdown handling
   */
  setupGracefulShutdown() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        if (this.isShuttingDown) {
          console.log(`[Logger] Force exit on ${signal}`);
          process.exit(1);
        }
        
        console.log(`[Logger] Received ${signal}, starting graceful shutdown...`);
        await this.gracefulShutdown(signal);
      });
    });
    
    // Handle process exit
    process.on('exit', (code) => {
      console.log(`[Logger] Process exiting with code: ${code}`);
    });
    
    // Handle beforeExit (last chance to do async operations)
    process.on('beforeExit', async (code) => {
      if (!this.isShuttingDown && code === 0) {
        console.log('[Logger] Process ending normally, logging final state...');
        try {
          await this.logInfo('Application ending normally', {
            exitCode: code,
            uptime: process.uptime(),
            metrics: this.getMetrics()
          });
        } catch (e) {
          console.error('[Logger] Failed to log normal exit:', e.message);
        }
      }
    });
  }
  
  /**
   * Graceful shutdown process
   */
  async gracefulShutdown(signal = 'UNKNOWN') {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }
    
    this.shutdownPromise = this._performShutdown(signal);
    return this.shutdownPromise;
  }
  
  async _performShutdown(signal) {
    this.isShuttingDown = true;
    this.metrics.gracefulShutdowns++;
    
    console.log(`[Logger] Starting graceful shutdown (signal: ${signal})...`);
    
    try {
      // Log shutdown start
      await this.logInfo(`Graceful shutdown initiated by ${signal}`, {
        signal: signal,
        uptime: process.uptime(),
        finalMetrics: this.getMetrics(),
        timestamp: new Date().toISOString()
      });
      
      // Stop new operations
      this.stopHeartbeat();
      if (this.batchTimer) {
        clearInterval(this.batchTimer);
      }
      
      // Flush remaining logs
      console.log('[Logger] Flushing remaining logs...');
      await this.flushLogs();
      
      // Final metrics log
      await this.logInfo('Shutdown completed successfully', {
        totalLogs: this.metrics.logsSent,
        successfulLogs: this.metrics.logsSuccess,
        errors: this.metrics.logsError,
        uptime: process.uptime()
      });
      
      this.emit('shutdown', { signal, graceful: true });
      console.log('[Logger] Graceful shutdown completed');
      
    } catch (error) {
      console.error('[Logger] Error during graceful shutdown:', error.message);
      this.emit('shutdown', { signal, graceful: false, error });
    }
    
    // Force exit after timeout
    setTimeout(() => {
      console.log('[Logger] Shutdown timeout reached, forcing exit');
      process.exit(0);
    }, this.options.shutdownTimeout);
  }
  
  /**
   * HTTP request with retry
   */
  async makeRequestWithRetry(data, method = 'POST') {
    let lastError;
    
    for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
      try {
        return await this.makeRequest(data.request, data, method);
      } catch (error) {
        lastError = error;
        
        if (attempt < this.options.retryAttempts) {
          const delay = this.options.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.warn(`[Logger] Request failed (attempt ${attempt}), retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * Base HTTP request
   */
  async makeRequest(endpoint, data, method = 'POST') {
    const startTime = Date.now();
    
    try {
      let response;
      
      if (method === 'GET') {
        const params = new URLSearchParams(data);
        response = await this.httpClient.get(`${this.apiUrl}?${params}`);
      } else {
        response = await this.httpClient.post(this.apiUrl, data);
      }
      
      this.updateAverageResponseTime(Date.now() - startTime);
      
      if (response.data?.success) {
        return response.data.data || response.data;
      } else {
        throw new Error(response.data?.error || 'API request failed');
      }
      
    } catch (error) {
      if (error.response) {
        throw new Error(`HTTP ${error.response.status}: ${error.response.data?.error || error.message}`);
      } else if (error.request) {
        throw new Error('Network error: No response received');
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Utilities
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  updateAverageResponseTime(responseTime) {
    if (this.metrics.averageResponseTime === 0) {
      this.metrics.averageResponseTime = responseTime;
    } else {
      this.metrics.averageResponseTime = (this.metrics.averageResponseTime + responseTime) / 2;
    }
  }
  
  /**
   * Manual shutdown
   */
  async shutdown() {
    return this.gracefulShutdown('MANUAL');
  }
  
  /**
   * Factory method for easy instance creation
   */
  static create(app_id, api_key, apiUrl, options = {}) {
    return new Logger({ app_id, api_key, apiUrl, options });
  }
}

module.exports = { Logger };