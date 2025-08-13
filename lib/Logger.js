/**
 * Main Logger Class for Logger Simple
 * Simple and efficient logging with API integration
 */

'use strict';

const https = require('https');
const http = require('http');
const { URL } = require('url');

class Logger {
  constructor(options = {}) {
    // Validate required options
    if (!options.appId || !options.apiKey) {
      throw new Error('appId and apiKey are required');
    }

    this.config = {
      appId: options.appId,
      apiKey: options.apiKey,
      baseUrl: options.baseUrl || 'https://loggersimple.com/api/',
      timeout: options.timeout || 10000,
      debug: options.debug || false,
      ...options
    };

    this.isInitialized = false;
    this.requestQueue = [];
    this.stats = {
      totalLogs: 0,
      successfulLogs: 0,
      failedLogs: 0
    };

    if (this.config.debug) {
      console.log('[Logger-Simple] Logger created with config:', {
        appId: this.config.appId.substring(0, 8) + '...',
        baseUrl: this.config.baseUrl,
        debug: this.config.debug
      });
    }
  }

  /**
   * Initialize the logger
   */
  async initialize() {
    if (this.isInitialized) return true;

    try {
      const response = await this._makeRequest('stats');
      this.isInitialized = true;
      this._debug('Logger initialized successfully');
      return true;
    } catch (error) {
      this._debug('Logger initialization failed:', error.message);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Log a success message
   */
  async success(message, context = null) {
    return this.log('success', message, context);
  }

  /**
   * Log an info message
   */
  async info(message, context = null) {
    return this.log('info', message, context);
  }

  /**
   * Log a warning message
   */
  async warn(message, context = null) {
    return this.log('warning', message, context);
  }

  /**
   * Log an error message
   */
  async error(message, context = null) {
    return this.log('error', message, context);
  }

  /**
   * Log a critical message
   */
  async critical(message, context = null) {
    return this.log('critical', message, context);
  }

  /**
   * Main logging method
   */
  async log(level, message, context = null) {
    try {
      // Validate inputs
      if (!level || typeof level !== 'string') {
        throw new Error('Log level is required and must be a string');
      }

      if (!message || typeof message !== 'string') {
        throw new Error('Log message is required and must be a string');
      }

      const validLevels = ['success', 'info', 'warning', 'error', 'critical'];
      if (!validLevels.includes(level.toLowerCase())) {
        throw new Error(`Invalid log level: ${level}`);
      }

      // Prepare log data
      const logData = {
        level: level.toLowerCase(),
        message: message,
        timestamp: new Date().toISOString()
      };

      if (context) {
        logData.context = typeof context === 'object' ? JSON.stringify(context) : String(context);
      }

      // Send log
      const response = await this._makeRequest('log', logData);
      
      this.stats.totalLogs++;
      this.stats.successfulLogs++;

      this._debug(`Log sent: ${level.toUpperCase()} - ${message.substring(0, 50)}...`);
      
      return response;

    } catch (error) {
      this.stats.totalLogs++;
      this.stats.failedLogs++;
      this._debug('Log failed:', error.message);
      
      // Don't throw error to prevent application crashes
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a context-aware logger
   */
  context(contextName) {
    return {
      success: (message, context = null) => this.success(message, { context: contextName, ...context }),
      info: (message, context = null) => this.info(message, { context: contextName, ...context }),
      warn: (message, context = null) => this.warn(message, { context: contextName, ...context }),
      error: (message, context = null) => this.error(message, { context: contextName, ...context }),
      critical: (message, context = null) => this.critical(message, { context: contextName, ...context })
    };
  }

  /**
   * Get logger statistics
   */
  getStats() {
    return {
      ...this.stats,
      isInitialized: this.isInitialized,
      successRate: this.stats.totalLogs > 0 ? 
        Math.round((this.stats.successfulLogs / this.stats.totalLogs) * 100) : 0
    };
  }

  /**
   * Make HTTP request to Logger Simple API
   * @private
   */
  async _makeRequest(action, data = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL('/index.php', this.config.baseUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      // Prepare request data
      const requestData = {
        action,
        app_id: this.config.appId,
        api_key: this.config.apiKey,
        ...data
      };

      const postData = new URLSearchParams(requestData).toString();

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'node-logger-simple/2.0.0'
        },
        timeout: this.config.timeout
      };

      const req = httpModule.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsedData = JSON.parse(responseData);
            
            if (parsedData.success === false) {
              reject(new Error(parsedData.error || 'API request failed'));
            } else {
              resolve(parsedData);
            }
          } catch (error) {
            reject(new Error('Invalid JSON response from API'));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Network error: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Debug logging
   * @private
   */
  _debug(message, ...args) {
    if (this.config.debug) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [Logger-Simple] ${message}`, ...args);
    }
  }
}

module.exports = Logger;