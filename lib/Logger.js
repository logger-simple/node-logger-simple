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
      retries: options.retries || 3,
      retryDelay: options.retryDelay || 1000,
      ...options
    };

    // Ensure baseUrl ends with /
    if (!this.config.baseUrl.endsWith('/')) {
      this.config.baseUrl += '/';
    }

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
      this._debug('Initializing logger...');
      const response = await this._makeRequest('health');
      this.isInitialized = true;
      this._debug('Logger initialized successfully:', response.data);
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
   * Test API connectivity
   */
  async testConnection() {
    try {
      this._debug('Testing API connection...');
      const response = await this._makeRequest('health');
      this._debug('Connection test successful:', response);
      return { success: true, response };
    } catch (error) {
      this._debug('Connection test failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Make HTTP request to Logger Simple API with retry logic
   * @private
   */
  async _makeRequest(action, data = {}, attempt = 1) {
    try {
      return await this._performRequest(action, data);
    } catch (error) {
      if (attempt < this.config.retries) {
        this._debug(`Request failed (attempt ${attempt}/${this.config.retries}), retrying in ${this.config.retryDelay}ms...`);
        await this._sleep(this.config.retryDelay);
        return this._makeRequest(action, data, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Perform HTTP request to Logger Simple API
   * @private
   */
  async _performRequest(action, data = {}) {
    return new Promise((resolve, reject) => {
      // Construct the full URL
      const apiUrl = new URL(this.config.baseUrl);
      const isHttps = apiUrl.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      // Prepare request data
      const requestData = {
        action,
        app_id: this.config.appId,
        api_key: this.config.apiKey,
        ...data
      };

      const postData = new URLSearchParams(requestData).toString();

      this._debug(`Making ${action} request to: ${apiUrl.href}`);
      this._debug('Request data:', requestData);

      const options = {
        hostname: apiUrl.hostname,
        port: apiUrl.port || (isHttps ? 443 : 80),
        path: apiUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'node-logger-simple/2.0.1',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        timeout: this.config.timeout
      };

      // For HTTPS, ignore certificate errors in development
      if (isHttps) {
        options.rejectUnauthorized = true;
      }

      this._debug('Request options:', options);

      const req = httpModule.request(options, (res) => {
        let responseData = '';

        this._debug(`Response status: ${res.statusCode}`);
        this._debug('Response headers:', res.headers);

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          this._debug(`Raw response (${responseData.length} chars):`, responseData);

          // Check if response is empty
          if (!responseData || responseData.trim() === '') {
            reject(new Error('Empty response from API'));
            return;
          }

          // Check for HTML error pages
          if (responseData.trim().startsWith('<')) {
            this._debug('Received HTML response instead of JSON:', responseData.substring(0, 200) + '...');
            reject(new Error('Received HTML response instead of JSON - API endpoint may be incorrect'));
            return;
          }

          try {
            const parsedData = JSON.parse(responseData);
            this._debug('Parsed response:', parsedData);
            
            if (parsedData.success === false) {
              reject(new Error(parsedData.error || 'API request failed'));
            } else {
              resolve(parsedData);
            }
          } catch (parseError) {
            this._debug('JSON parse error:', parseError.message);
            this._debug('Response content type:', res.headers['content-type']);
            reject(new Error(`Invalid JSON response from API. Response was: ${responseData.substring(0, 200)}...`));
          }
        });
      });

      req.on('error', (error) => {
        this._debug('Request error:', error);
        reject(new Error(`Network error: ${error.message}`));
      });

      req.on('timeout', () => {
        this._debug('Request timeout');
        req.destroy();
        reject(new Error('Request timeout'));
      });

      // Write the request data
      this._debug('Sending request data:', postData);
      req.write(postData);
      req.end();
    });
  }

  /**
   * Sleep utility
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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