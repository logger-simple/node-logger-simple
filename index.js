/**
 * Node Logger Simple - Official Node.js Client
 * Simple logging solution with error tracking and real-time analytics
 * 
 * @version 2.0.0
 * @author Logger Simple Team <contact@valloic.dev>
 * @license MIT
 */

'use strict';

const Logger = require('./lib/Logger');

/**
 * Create a new Logger instance
 * @param {Object} options - Configuration options
 * @param {string} options.appId - Application ID from Logger Simple dashboard
 * @param {string} options.apiKey - API Key from Logger Simple dashboard
 * @param {string} [options.baseUrl='https://loggersimple.com/api/'] - API base URL
 * @param {number} [options.timeout=10000] - Request timeout in milliseconds
 * @param {boolean} [options.debug=false] - Enable debug logging
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
 * logger.info('Application started successfully');
 * logger.error('Database connection failed', { error: 'Connection timeout' });
 */
function createLogger(options = {}) {
  return new Logger(options);
}

// Export the factory function as default
module.exports = createLogger;

// Named exports for advanced usage
module.exports.Logger = Logger;
module.exports.createLogger = createLogger;

// Export constants
module.exports.LOG_LEVELS = {
  SUCCESS: 'success',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

module.exports.VERSION = '7.2.0';