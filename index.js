/**
 * Node Logger Simple - Official Node.js Client
 * Complete logging solution with error tracking, performance monitoring, and real-time analytics
 * 
 * @version 2.0.0
 * @author Logger Simple Team <contact@valloic.dev>
 * @license MIT
 */

'use strict';

const Logger = require('./lib/Logger');
const { LoggerError, ValidationError, NetworkError, RateLimitError } = require('./lib/errors');

/**
 * Create a new Logger instance
 * @param {Object} options - Configuration options
 * @param {string} options.appId - Application ID from Logger Simple dashboard
 * @param {string} options.apiKey - API Key from Logger Simple dashboard
 * @param {string} [options.baseUrl='https://api.logger-simple.com'] - API base URL
 * @param {number} [options.timeout=10000] - Request timeout in milliseconds
 * @param {number} [options.retries=3] - Number of retry attempts for failed requests
 * @param {boolean} [options.debug=false] - Enable debug logging
 * @param {boolean} [options.exitOnCritical=true] - Exit process on critical errors
 * @param {number} [options.maxLogsPerHour=1000] - Client-side rate limit
 * @param {boolean} [options.enableRateLimiting=true] - Enable client-side rate limiting
 * @param {string} [options.userAgent] - Custom user agent string
 * @returns {Logger} Logger instance
 * 
 * @example
 * const createLogger = require('node-logger-simple');
 * 
 * const logger = createLogger({
 *   appId: 'your-app-id',
 *   apiKey: 'your-api-key',
 *   debug: true
 * });
 * 
 * // Basic logging
 * await logger.info('Application started successfully');
 * await logger.error('Database connection failed', { error: 'Connection timeout' });
 * 
 * // Context-aware logging
 * const userLogger = logger.context('UserService');
 * await userLogger.warn('Invalid login attempt', { userId: 12345, ip: '192.168.1.1' });
 * 
 * // Performance monitoring
 * const result = await logger.timeOperation(async () => {
 *   return await someExpensiveOperation();
 * }, 'ExpensiveOperation');
 */
function createLogger(options = {}) {
  return new Logger(options);
}

// Export the factory function as default
module.exports = createLogger;

// Named exports for advanced usage
module.exports.Logger = Logger;
module.exports.createLogger = createLogger;

// Export error classes for instanceof checks
module.exports.LoggerError = LoggerError;
module.exports.ValidationError = ValidationError;
module.exports.NetworkError = NetworkError;
module.exports.RateLimitError = RateLimitError;

// Export constants
module.exports.LOG_LEVELS = {
  SUCCESS: 'success',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

module.exports.ENVIRONMENTS = {
  PRODUCTION: 'production',
  STAGING: 'staging',
  DEVELOPMENT: 'development',
  TESTING: 'testing'
};

// Version info
module.exports.VERSION = require('./package.json').version;