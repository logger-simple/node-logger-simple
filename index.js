/**
 * Node Logger Simple - Official Node.js Client
 * Simple logging solution with error tracking and real-time analytics
 * 
 * @version 2.0.1
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
 * @param {number} [options.retries=3] - Number of retry attempts for failed requests
 * @param {number} [options.retryDelay=1000] - Delay between retries in milliseconds
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
 * 
 * // Test connection
 * const result = await logger.testConnection();
 * console.log('Connection test:', result.success);
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

module.exports.VERSION = '2.0.1';

// Export utility functions
module.exports.utils = {
  /**
   * Test if the API is reachable
   * @param {string} baseUrl - API base URL
   * @param {number} [timeout=5000] - Timeout in milliseconds
   * @returns {Promise<boolean>} True if API is reachable
   */
  async testApiReachability(baseUrl = 'https://loggersimple.com/api/', timeout = 5000) {
    try {
      const testLogger = createLogger({
        appId: 'test',
        apiKey: 'test',
        baseUrl,
        timeout,
        debug: false
      });
      
      // Try to make a health check without auth (should return error but valid JSON)
      await testLogger._performRequest('health');
      return true;
    } catch (error) {
      // If we get a JSON parse error, the API is not reachable or not working
      if (error.message.includes('Invalid JSON response')) {
        return false;
      }
      // Other errors mean the API is reachable but returned an error (which is expected for test credentials)
      return true;
    }
  },

  /**
   * Validate API credentials
   * @param {string} appId - Application ID
   * @param {string} apiKey - API Key
   * @param {string} [baseUrl='https://loggersimple.com/api/'] - API base URL
   * @returns {Promise<Object>} Validation result
   */
  async validateCredentials(appId, apiKey, baseUrl = 'https://loggersimple.com/api/') {
    try {
      const testLogger = createLogger({
        appId,
        apiKey,
        baseUrl,
        debug: false
      });
      
      const result = await testLogger.testConnection();
      return {
        valid: result.success,
        error: result.error || null,
        response: result.response || null
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        response: null
      };
    }
  }
};