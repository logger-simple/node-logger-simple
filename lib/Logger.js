/**
 * Main Logger Class for Logger Simple
 * Orchestrates all logging functionality with error handling, rate limiting, and monitoring
 */

'use strict';

const ConfigValidator = require('./ConfigValidator');
const ApiClient = require('./ApiClient');
const RateLimiter = require('./RateLimiter');
const ErrorHandler = require('./ErrorHandler');
const { 
  LoggerError, 
  ApplicationError, 
  ShutdownError,
  RateLimitError 
} = require('./errors');

/**
 * Main Logger Class
 */
class Logger {
  /**
   * Create a new Logger instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Validate and normalize configuration
    ConfigValidator.validateConfig(options);
    this.config = ConfigValidator.normalizeConfig(options);
    
    // Initialize components
    this.apiClient = new ApiClient(this.config);
    this.rateLimiter = new RateLimiter({
      maxRequests: this.config.maxLogsPerHour,
      enabled: this.config.enableRateLimiting
    });
    this.errorHandler = new ErrorHandler(this, this.config);
    
    // State management
    this.isInitialized = false;
    this.appInfo = null;
    this.initializationPromise = null;
    
    // Performance monitoring
    this.stats = {
      totalLogs: 0,
      successfulLogs: 0,
      failedLogs: 0,
      rateLimitedLogs: 0,
      startTime: Date.now(),
      lastLogTime: null
    };
    
    // Context for structured logging
    this.defaultContext = {};
    
    // Auto-initialize if credentials provided
    if (this.config.appId && this.config.apiKey) {
      this.initializationPromise = this._initialize();
    }

    this._debug('info', 'Logger instance created successfully');
  }

  /**
   * Initialize the logger and validate application
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initialize();
    return this.initializationPromise;
  }

  /**
   * Internal initialization method
   * @private
   */
  async _initialize() {
    try {
      this._debug('info', 'Initializing Logger Simple...');

      // Test API connection
      const isConnected = await this.apiClient.testConnection();
      if (!isConnected) {
        throw new LoggerError('Failed to connect to Logger Simple API');
      }

      // Get and validate application information
      this.appInfo = await this.apiClient.getAppInfo();
      ConfigValidator.validateApplicationCategory(this.appInfo);

      // Update rate limiter with server-side limits if available
      if (this.appInfo.max_logs_per_hour) {
        this.rateLimiter.updateConfig({
          maxRequests: Math.min(this.config.maxLogsPerHour, this.appInfo.max_logs_per_hour)
        });
      }

      this.isInitialized = true;
      this._debug('success', `Logger Simple initialized for application: ${this.appInfo.name}`);
      
      return true;

    } catch (error) {
      this._debug('error', 'Logger initialization failed:', error.message);
      
      // Handle initialization errors
      const shouldContinue = await this.errorHandler.handleError(error, {
        phase: 'initialization',
        appId: this.config.appId
      });

      if (!shouldContinue) {
        throw error;
      }

      return false;
    }
  }

  /**
   * Log a message with the specified level
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {*} context - Additional context
   * @param {*} content - Optional content
   * @param {boolean} exitOnCritical - Override exit behavior for critical logs
   * @param {Array} tags - Log tags
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} API response
   */
  async log(level, message, context = null, content = null, exitOnCritical = null, tags = [], metadata = {}) {
    try {
      // Ensure logger is initialized
      await this.initialize();

      // Validate input
      ConfigValidator.validateLogEntry(level, message, context, content);
      if (tags && tags.length > 0) {
        ConfigValidator.validateTags(tags);
      }
      if (metadata && Object.keys(metadata).length > 0) {
        ConfigValidator.validateMetadata(metadata);
      }

      // Check rate limits
      this.rateLimiter.checkRequest();

      // Merge context with default context
      const finalContext = {
        ...this.defaultContext,
        ...(typeof context === 'object' ? context : { data: context })
      };

      // Add automatic metadata
      const finalMetadata = {
        logger_version: require('../package.json').version,
        node_version: process.version,
        timestamp: new Date().toISOString(),
        ...metadata
      };

      // Make API request
      const response = await this.apiClient.log(level, message, finalContext, content, tags, finalMetadata);

      // Update statistics
      this.stats.totalLogs++;
      this.stats.successfulLogs++;
      this.stats.lastLogTime = Date.now();

      // Handle critical logs
      if (level === 'critical') {
        await this._handleCriticalLog(message, finalContext, exitOnCritical);
      }

      this._debug('info', `Log sent successfully: ${level.toUpperCase()} - ${message.substring(0, 50)}...`);
      
      return response;

    } catch (error) {
      this.stats.totalLogs++;
      
      if (error instanceof RateLimitError) {
        this.stats.rateLimitedLogs++;
        this._debug('warn', `Rate limit exceeded: ${error.message}`);
      } else {
        this.stats.failedLogs++;
        this._debug('error', `Log failed: ${error.message}`);
      }

      // Handle error through error handler
      const shouldContinue = await this.errorHandler.handleError(error, {
        level,
        message: message.substring(0, 100),
        operation: 'log'
      });

      if (!shouldContinue) {
        throw error;
      }

      // For critical logs, still exit if configured even if logging failed
      if (level === 'critical' && (exitOnCritical !== null ? exitOnCritical : this.config.exitOnCritical)) {
        await this._handleCriticalLog(message, context, exitOnCritical, true);
      }

      throw error;
    }
  }

  /**
   * Log success message
   */
  async success(message, context = null, content = null, tags = [], metadata = {}) {
    return this.log('success', message, context, content, null, tags, metadata);
  }

  /**
   * Log info message
   */
  async info(message, context = null, content = null, tags = [], metadata = {}) {
    return this.log('info', message, context, content, null, tags, metadata);
  }

  /**
   * Log warning message
   */
  async warn(message, context = null, content = null, tags = [], metadata = {}) {
    return this.log('warning', message, context, content, null, tags, metadata);
  }

  /**
   * Log error message
   */
  async error(message, context = null, content = null, tags = [], metadata = {}) {
    return this.log('error', message, context, content, null, tags, metadata);
  }

  /**
   * Log critical message (triggers alerts and potential shutdown)
   */
  async critical(message, context = null, content = null, exitOnCritical = null, tags = [], metadata = {}) {
    return this.log('critical', message, context, content, exitOnCritical, tags, metadata);
  }

  /**
   * Create a context-aware logger
   * @param {string} contextName - Context name
   * @returns {Object} Context logger
   */
  context(contextName) {
    const contextLogger = {
      success: (message, context = null, content = null, tags = [], metadata = {}) =>
        this.success(message, { context: contextName, ...context }, content, tags, metadata),
        
      info: (message, context = null, content = null, tags = [], metadata = {}) =>
        this.info(message, { context: contextName, ...context }, content, tags, metadata),
        
      warn: (message, context = null, content = null, tags = [], metadata = {}) =>
        this.warn(message, { context: contextName, ...context }, content, tags, metadata),
        
      error: (message, context = null, content = null, tags = [], metadata = {}) =>
        this.error(message, { context: contextName, ...context }, content, tags, metadata),
        
      critical: (message, context = null, content = null, exitOnCritical = null, tags = [], metadata = {}) =>
        this.critical(message, { context: contextName, ...context }, content, exitOnCritical, tags, metadata),
        
      log: (level, message, context = null, content = null, exitOnCritical = null, tags = [], metadata = {}) =>
        this.log(level, message, { context: contextName, ...context }, content, exitOnCritical, tags, metadata),

      // Performance monitoring for this context
      timeOperation: (operation, operationName, level = 'info') =>
        this.timeOperation(operation, `${contextName}::${operationName}`, level),

      // Create sub-context
      subContext: (subName) => this.context(`${contextName}::${subName}`)
    };

    return contextLogger;
  }

  /**
   * Monitor the performance of an operation
   * @param {Function} operation - Async operation to monitor
   * @param {string} operationName - Name for logging
   * @param {string} level - Log level for results
   * @returns {Promise<any>} Operation result
   */
  async timeOperation(operation, operationName, level = 'info') {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    try {
      const result = await operation();
      
      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      const performanceData = {
        operation: operationName,
        duration_ms: Math.round(duration * 100) / 100,
        memory_delta: {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external
        },
        success: true
      };
      
      await this.log(level, `Performance: ${operationName} completed`, performanceData);
      
      return result;
      
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;
      
      const performanceData = {
        operation: operationName,
        duration_ms: Math.round(duration * 100) / 100,
        success: false,
        error: error.message,
        stack: error.stack
      };
      
      await this.error(`Performance: ${operationName} failed`, performanceData);
      
      throw error;
    }
  }

  /**
   * Force exit the application with a critical log
   * @param {string} message - Exit message
   * @param {*} context - Additional context
   */
  async forceExit(message, context = null) {
    const exitContext = {
      forced_exit: true,
      timestamp: new Date().toISOString(),
      pid: process.pid,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      ...context
    };

    try {
      await this.critical(message, exitContext, null, false);
    } catch (error) {
      this._debug('error', 'Failed to log force exit:', error.message);
    }

    throw new ShutdownError(message, 'FORCE_EXIT', 1);
  }

  /**
   * Graceful shutdown with logging
   * @param {string} reason - Shutdown reason
   * @param {number} exitCode - Exit code
   */
  async gracefulShutdown(reason = 'Graceful shutdown requested', exitCode = 0) {
    const shutdownContext = {
      graceful_shutdown: true,
      exit_code: exitCode,
      timestamp: new Date().toISOString(),
      pid: process.pid,
      uptime: process.uptime(),
      stats: this.getStats()
    };

    try {
      await this.info(`Application shutting down: ${reason}`, shutdownContext);
    } catch (error) {
      this._debug('error', 'Failed to log graceful shutdown:', error.message);
    }

    throw new ShutdownError(reason, 'GRACEFUL_SHUTDOWN', exitCode);
  }

  /**
   * Get logs from the API
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Logs and metadata
   */
  async getLogs(options = {}) {
    await this.initialize();
    return this.apiClient.getLogs(options);
  }

  /**
   * Get log statistics
   * @param {number} days - Number of days to analyze
   * @returns {Promise<Object>} Log statistics
   */
  async getLogStats(days = 7) {
    await this.initialize();
    return this.apiClient.getLogStats(days);
  }

  /**
   * Get platform statistics
   * @returns {Promise<Object>} Platform statistics
   */
  async getStats() {
    return this.apiClient.getStats();
  }

  /**
   * Test connection and perform health check
   * @returns {Promise<Object>} Health check results
   */
  async healthCheck() {
    const health = await this.apiClient.healthCheck();
    
    // Add client-side information
    health.client_stats = this.getClientStats();
    health.rate_limiter = this.rateLimiter.getStatus();
    health.error_handler = this.errorHandler.getStats();
    
    return health;
  }

  /**
   * Get client-side statistics
   * @returns {Object} Client statistics
   */
  getClientStats() {
    const now = Date.now();
    const uptimeMs = now - this.stats.startTime;
    
    return {
      ...this.stats,
      uptime_ms: uptimeMs,
      uptime_human: this._formatDuration(uptimeMs),
      success_rate: this.stats.totalLogs > 0 ? 
        Math.round((this.stats.successfulLogs / this.stats.totalLogs) * 100) : 0,
      avg_logs_per_minute: this.stats.totalLogs > 0 ? 
        Math.round((this.stats.totalLogs / (uptimeMs / 60000)) * 100) / 100 : 0,
      is_initialized: this.isInitialized,
      app_info: this.appInfo ? {
        name: this.appInfo.name,
        category: this.appInfo.category,
        environment: this.appInfo.environment
      } : null
    };
  }

  /**
   * Set default context for all logs
   * @param {Object} context - Default context object
   */
  setDefaultContext(context) {
    this.defaultContext = { ...context };
  }

  /**
   * Get current configuration (sanitized)
   * @returns {Object} Current configuration
   */
  getConfig() {
    return {
      ...this.apiClient.getConfig(),
      rateLimiter: this.rateLimiter.getStatus(),
      isInitialized: this.isInitialized
    };
  }

  /**
   * Handle critical log processing
   * @private
   */
  async _handleCriticalLog(message, context, exitOnCritical, loggingFailed = false) {
    const shouldExit = exitOnCritical !== null ? exitOnCritical : this.config.exitOnCritical;
    
    if (shouldExit) {
      this._debug('error', `🚨 CRITICAL ERROR ${loggingFailed ? '(logging failed)' : 'LOGGED'}: ${message}`);
      this._debug('error', 'Application will exit in 1 second...');
      
      // Give time for the log to be processed (if it succeeded)
      const delay = loggingFailed ? 0 : 1000;
      
      setTimeout(() => {
        process.exit(1);
      }, delay);
    }
  }

  /**
   * Internal debug logging
   * @private
   */
  _debug(level, message, ...args) {
    if (!this.config.debug) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [Logger-Simple] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`, ...args);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`, ...args);
        break;
      case 'success':
      case 'info':
      default:
        console.log(`${prefix} ${message}`, ...args);
        break;
    }
  }

  /**
   * Format duration in human-readable format
   * @private
   */
  _formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Clean up logger resources
   */
  cleanup() {
    this.errorHandler.cleanup();
    this._debug('info', 'Logger cleanup completed');
  }
}

module.exports = Logger;