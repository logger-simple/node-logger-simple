/**
 * Error Handler for Logger Simple
 * Manages critical errors and automatic application shutdown
 */

'use strict';

const { 
  LoggerError, 
  ApplicationError, 
  AuthenticationError,
  ShutdownError,
  RateLimitError
} = require('./errors');

/**
 * Error Handler Class
 */
class ErrorHandler {
  /**
   * Create a new Error Handler
   * @param {Object} logger - Logger instance reference
   * @param {Object} config - Configuration object
   */
  constructor(logger, config) {
    this.logger = logger;
    this.config = config;
    this.isShuttingDown = false;
    this.shutdownTimeout = null;
    this.criticalErrorCount = 0;
    this.maxCriticalErrors = 5;
    this.criticalErrorWindow = 60000; // 1 minute
    this.criticalErrorTimes = [];
    
    // Bind methods to preserve context
    this.handleUncaughtException = this.handleUncaughtException.bind(this);
    this.handleUnhandledRejection = this.handleUnhandledRejection.bind(this);
    this.handleShutdownSignal = this.handleShutdownSignal.bind(this);
    
    // Setup global error handlers if enabled
    if (config.enableGlobalErrorHandling !== false) {
      this.setupGlobalErrorHandlers();
    }
  }

  /**
   * Setup global error handlers for the process
   */
  setupGlobalErrorHandlers() {
    // Remove existing listeners to avoid duplicates
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
    
    // Handle uncaught exceptions
    process.on('uncaughtException', this.handleUncaughtException);
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', this.handleUnhandledRejection);
    
    // Handle graceful shutdown signals
    process.on('SIGTERM', () => this.handleShutdownSignal('SIGTERM'));
    process.on('SIGINT', () => this.handleShutdownSignal('SIGINT'));
  }

  /**
   * Handle uncaught exceptions
   * @param {Error} error - The uncaught exception
   */
  async handleUncaughtException(error) {
    console.error('\n🚨 UNCAUGHT EXCEPTION DETECTED!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    try {
      // Try to log the critical error
      await this._logCriticalError('Uncaught Exception', error, {
        type: 'uncaught_exception',
        pid: process.pid,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Failed to log uncaught exception:', logError.message);
    }
    
    // Force exit - uncaught exceptions are always fatal
    this._forceExit(1, 'Uncaught exception occurred');
  }

  /**
   * Handle unhandled promise rejections
   * @param {*} reason - The rejection reason
   * @param {Promise} promise - The rejected promise
   */
  async handleUnhandledRejection(reason, promise) {
    console.error('\n🚨 UNHANDLED PROMISE REJECTION DETECTED!');
    console.error('Reason:', reason);
    console.error('Promise:', promise);
    
    try {
      // Try to log the critical error
      await this._logCriticalError('Unhandled Promise Rejection', reason instanceof Error ? reason : new Error(String(reason)), {
        type: 'unhandled_rejection',
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        pid: process.pid,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Failed to log unhandled rejection:', logError.message);
    }
    
    // Exit if configured to do so
    if (this.config.exitOnCritical) {
      this._scheduleExit(1, 'Unhandled promise rejection occurred');
    }
  }

  /**
   * Handle shutdown signals
   * @param {string} signal - The signal received
   */
  async handleShutdownSignal(signal) {
    console.log(`\n📡 Received ${signal} signal - shutting down gracefully...`);
    
    try {
      // Log graceful shutdown
      await this._logInfo(`Application received ${signal} - Graceful shutdown`, {
        signal,
        timestamp: new Date().toISOString(),
        pid: process.pid,
        uptime: process.uptime()
      });
    } catch (logError) {
      console.error('Failed to log shutdown signal:', logError.message);
    }
    
    this._scheduleExit(0, 'Graceful shutdown requested');
  }

  /**
   * Handle application-specific errors
   * @param {Error} error - The error to handle
   * @param {Object} context - Additional context
   * @returns {boolean} Whether the application should continue
   */
  async handleError(error, context = {}) {
    const errorInfo = {
      name: error.name,
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
      ...context
    };

    try {
      // Handle different error types
      if (error instanceof ApplicationError) {
        return await this._handleApplicationError(error, errorInfo);
      } else if (error instanceof AuthenticationError) {
        return await this._handleAuthenticationError(error, errorInfo);
      } else if (error instanceof RateLimitError) {
        return await this._handleRateLimitError(error, errorInfo);
      } else if (error instanceof ShutdownError) {
        return await this._handleShutdownError(error, errorInfo);
      } else if (error instanceof LoggerError) {
        return await this._handleLoggerError(error, errorInfo);
      } else {
        return await this._handleGenericError(error, errorInfo);
      }
    } catch (handlingError) {
      console.error('Error while handling error:', handlingError.message);
      console.error('Original error:', error.message);
      
      // If we can't handle the error, force exit
      this._forceExit(1, 'Error handling failed');
      return false;
    }
  }

  /**
   * Handle application category errors (fatal)
   * @private
   */
  async _handleApplicationError(error, errorInfo) {
    console.error('\n❌ APPLICATION ERROR:', error.message);
    
    try {
      await this._logCriticalError('Application Category Mismatch', error, errorInfo);
    } catch (logError) {
      console.error('Failed to log application error:', logError.message);
    }
    
    // Application category errors are always fatal
    this._forceExit(1, 'Application category validation failed');
    return false;
  }

  /**
   * Handle authentication errors (potentially fatal)
   * @private
   */
  async _handleAuthenticationError(error, errorInfo) {
    console.error('\n🔐 AUTHENTICATION ERROR:', error.message);
    
    try {
      await this._logError('Authentication Failed', errorInfo);
    } catch (logError) {
      console.error('Failed to log authentication error:', logError.message);
    }
    
    // Authentication errors can be fatal depending on configuration
    if (this.config.exitOnAuthError !== false) {
      this._scheduleExit(1, 'Authentication failed');
      return false;
    }
    
    return true;
  }

  /**
   * Handle rate limit errors (non-fatal but warning)
   * @private
   */
  async _handleRateLimitError(error, errorInfo) {
    console.warn('\n⚠️  RATE LIMIT ERROR:', error.message);
    
    try {
      await this._logWarn('Rate Limit Exceeded', errorInfo);
    } catch (logError) {
      console.error('Failed to log rate limit error:', logError.message);
    }
    
    return true; // Rate limit errors are not fatal
  }

  /**
   * Handle shutdown errors (always fatal)
   * @private
   */
  async _handleShutdownError(error, errorInfo) {
    console.error('\n💥 SHUTDOWN ERROR:', error.message);
    
    try {
      await this._logCriticalError('Forced Shutdown', error, errorInfo);
    } catch (logError) {
      console.error('Failed to log shutdown error:', logError.message);
    }
    
    this._forceExit(error.exitCode || 1, error.reason || 'Shutdown error occurred');
    return false;
  }

  /**
   * Handle logger-specific errors
   * @private
   */
  async _handleLoggerError(error, errorInfo) {
    console.error('\n📋 LOGGER ERROR:', error.message);
    
    // Don't try to log logger errors to avoid recursion
    console.error('Error details:', errorInfo);
    
    // Logger errors are generally not fatal unless critical
    if (this._isCriticalError(error)) {
      this._trackCriticalError();
      
      if (this._shouldExitOnCriticalErrors()) {
        this._scheduleExit(1, 'Too many critical logger errors');
        return false;
      }
    }
    
    return true;
  }

  /**
   * Handle generic errors
   * @private
   */
  async _handleGenericError(error, errorInfo) {
    console.error('\n⚠️  GENERIC ERROR:', error.message);
    
    try {
      await this._logError('Unexpected Error', errorInfo);
    } catch (logError) {
      console.error('Failed to log generic error:', logError.message);
    }
    
    // Generic errors are usually not fatal
    return true;
  }

  /**
   * Log critical error
   * @private
   */
  async _logCriticalError(message, error, context) {
    if (this.logger && this.logger.critical) {
      await this.logger.critical(message, {
        error: error.message,
        stack: error.stack,
        ...context
      }, null, false); // Don't auto-exit from this call
    }
  }

  /**
   * Log error
   * @private
   */
  async _logError(message, context) {
    if (this.logger && this.logger.error) {
      await this.logger.error(message, context);
    }
  }

  /**
   * Log warning
   * @private
   */
  async _logWarn(message, context) {
    if (this.logger && this.logger.warn) {
      await this.logger.warn(message, context);
    }
  }

  /**
   * Log info
   * @private
   */
  async _logInfo(message, context) {
    if (this.logger && this.logger.info) {
      await this.logger.info(message, context);
    }
  }

  /**
   * Check if error is critical
   * @private
   */
  _isCriticalError(error) {
    return error instanceof ApplicationError ||
           error instanceof AuthenticationError ||
           error instanceof ShutdownError ||
           (error.code && ['CRITICAL_ERROR', 'FATAL_ERROR'].includes(error.code));
  }

  /**
   * Track critical error occurrences
   * @private
   */
  _trackCriticalError() {
    const now = Date.now();
    this.criticalErrorTimes.push(now);
    
    // Remove errors outside the time window
    this.criticalErrorTimes = this.criticalErrorTimes.filter(
      time => now - time < this.criticalErrorWindow
    );
    
    this.criticalErrorCount = this.criticalErrorTimes.length;
  }

  /**
   * Check if should exit on critical errors
   * @private
   */
  _shouldExitOnCriticalErrors() {
    return this.criticalErrorCount >= this.maxCriticalErrors;
  }

  /**
   * Schedule graceful exit
   * @private
   */
  _scheduleExit(exitCode, reason) {
    if (this.isShuttingDown) {
      return;
    }
    
    this.isShuttingDown = true;
    console.log(`\n🚪 Scheduling application exit: ${reason}`);
    
    // Give time for final logs to be sent
    this.shutdownTimeout = setTimeout(() => {
      console.log('🔚 Application shutdown complete');
      process.exit(exitCode);
    }, 2000);
  }

  /**
   * Force immediate exit
   * @private
   */
  _forceExit(exitCode, reason) {
    if (this.isShuttingDown) {
      return;
    }
    
    this.isShuttingDown = true;
    console.error(`\n💥 FORCE EXIT: ${reason}`);
    console.error('Application will exit immediately...');
    
    // Clear any pending shutdown timeout
    if (this.shutdownTimeout) {
      clearTimeout(this.shutdownTimeout);
    }
    
    process.exit(exitCode);
  }

  /**
   * Cancel scheduled shutdown (for testing purposes)
   */
  cancelShutdown() {
    if (this.shutdownTimeout) {
      clearTimeout(this.shutdownTimeout);
      this.shutdownTimeout = null;
    }
    this.isShuttingDown = false;
  }

  /**
   * Get error handler statistics
   * @returns {Object} Error handler statistics
   */
  getStats() {
    return {
      isShuttingDown: this.isShuttingDown,
      criticalErrorCount: this.criticalErrorCount,
      criticalErrorWindow: this.criticalErrorWindow,
      maxCriticalErrors: this.maxCriticalErrors,
      recentCriticalErrors: this.criticalErrorTimes.length,
      hasGlobalHandlers: process.listenerCount('uncaughtException') > 0
    };
  }

  /**
   * Clean up error handler
   */
  cleanup() {
    // Remove global error listeners
    process.removeListener('uncaughtException', this.handleUncaughtException);
    process.removeListener('unhandledRejection', this.handleUnhandledRejection);
    process.removeListener('SIGTERM', this.handleShutdownSignal);
    process.removeListener('SIGINT', this.handleShutdownSignal);
    
    // Clear shutdown timeout
    if (this.shutdownTimeout) {
      clearTimeout(this.shutdownTimeout);
      this.shutdownTimeout = null;
    }
    
    this.isShuttingDown = false;
  }
}

module.exports = ErrorHandler;