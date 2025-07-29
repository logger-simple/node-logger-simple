/**
 * API Client for Logger Simple
 * Handles all communication with the Logger Simple API
 */

'use strict';

const axios = require('axios');
const { 
  NetworkError, 
  AuthenticationError, 
  RateLimitError,
  ValidationError 
} = require('./errors');

/**
 * API Client Class
 */
class ApiClient {
  /**
   * Create a new API Client
   * @param {Object} config - Configuration object
   */
  constructor(config) {
    this.config = config;
    this.retryDelays = [1000, 2000, 4000]; // Exponential backoff delays
    
    // Create axios instance with default configuration
    this.httpClient = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'User-Agent': config.userAgent,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor for debugging
    if (config.debug) {
      this.httpClient.interceptors.request.use(
        (config) => {
          console.log(`[Logger-Simple] API Request: ${config.method.toUpperCase()} ${config.url}`);
          if (config.data) {
            console.log(`[Logger-Simple] Request Data:`, config.data);
          }
          return config;
        },
        (error) => {
          console.error(`[Logger-Simple] Request Error:`, error);
          return Promise.reject(error);
        }
      );
    }

    // Add response interceptor for debugging and error handling
    this.httpClient.interceptors.response.use(
      (response) => {
        if (this.config.debug) {
          console.log(`[Logger-Simple] API Response:`, response.status, response.data);
        }
        return response;
      },
      (error) => {
        if (this.config.debug) {
          console.error(`[Logger-Simple] Response Error:`, error.response?.status, error.response?.data);
        }
        return Promise.reject(this._transformError(error));
      }
    );
  }

  /**
   * Make a request to the Logger Simple API
   * @param {string} action - API action to perform
   * @param {Object} params - Request parameters
   * @param {number} retryCount - Current retry count
   * @returns {Promise<Object>} API response
   */
  async makeRequest(action, params = {}, retryCount = 0) {
    try {
      // Build request parameters
      const requestParams = {
        action,
        app_id: this.config.appId,
        api_key: this.config.apiKey,
        ...params
      };

      // Make the request
      const response = await this.httpClient.get('/api.php', {
        params: requestParams
      });

      // Validate response structure
      if (!response.data || typeof response.data !== 'object') {
        throw new NetworkError('Invalid response format from API');
      }

      // Check for API-level errors
      if (response.data.success === false) {
        throw this._handleApiError(response.data);
      }

      return response.data;

    } catch (error) {
      // Handle retries for network-related errors
      if (this._shouldRetry(error, retryCount)) {
        const delay = this.retryDelays[retryCount] || 4000;
        
        if (this.config.debug) {
          console.log(`[Logger-Simple] Retrying request in ${delay}ms (attempt ${retryCount + 1}/${this.config.retries + 1})`);
        }
        
        await this._delay(delay);
        return this.makeRequest(action, params, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Log a message to the API
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {*} context - Log context
   * @param {*} content - Log content
   * @param {Array} tags - Log tags
   * @param {Object} metadata - Log metadata
   * @returns {Promise<Object>} API response
   */
  async log(level, message, context = null, content = null, tags = [], metadata = {}) {
    const params = {
      level,
      message
    };

    // Add optional parameters
    if (context !== null) {
      params.context = typeof context === 'object' ? JSON.stringify(context) : String(context);
    }

    if (content !== null) {
      params.content = String(content);
    }

    if (tags && tags.length > 0) {
      params.tags = JSON.stringify(tags);
    }

    if (metadata && Object.keys(metadata).length > 0) {
      params.metadata = JSON.stringify(metadata);
    }

    return this.makeRequest('log', params);
  }

  /**
   * Get application information
   * @returns {Promise<Object>} Application information
   */
  async getAppInfo() {
    const response = await this.makeRequest('app_info');
    return response.data || response;
  }

  /**
   * Get logs for the application
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Logs and metadata
   */
  async getLogs(options = {}) {
    const params = {};
    
    if (options.level) params.level = options.level;
    if (options.limit) params.limit = options.limit;
    if (options.offset) params.offset = options.offset;
    if (options.search) params.search = options.search;
    if (options.startDate) params.start_date = options.startDate;
    if (options.endDate) params.end_date = options.endDate;

    return this.makeRequest('logs', params);
  }

  /**
   * Get log statistics
   * @param {number} days - Number of days to analyze
   * @returns {Promise<Object>} Log statistics
   */
  async getLogStats(days = 7) {
    return this.makeRequest('log_stats', { days: Math.min(days, 30) });
  }

  /**
   * Get general platform statistics
   * @returns {Promise<Object>} Platform statistics
   */
  async getStats() {
    return this.makeRequest('stats');
  }

  /**
   * Test API connection and authentication
   * @returns {Promise<boolean>} Whether connection is successful
   */
  async testConnection() {
    try {
      await this.getStats();
      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error('[Logger-Simple] Connection test failed:', error.message);
      }
      return false;
    }
  }

  /**
   * Perform a comprehensive health check
   * @returns {Promise<Object>} Health check results
   */
  async healthCheck() {
    const result = {
      timestamp: new Date().toISOString(),
      api_connection: false,
      app_authenticated: false,
      app_category_valid: false,
      response_time: null,
      app_info: null,
      error: null
    };

    const startTime = Date.now();

    try {
      // Test basic API connection
      const statsResponse = await this.getStats();
      result.api_connection = statsResponse.success === true;
      result.response_time = Date.now() - startTime;

      // Test app authentication and get app info
      try {
        const appInfo = await this.getAppInfo();
        result.app_authenticated = true;
        result.app_info = appInfo;

        // Check if application category is nodejs
        if (appInfo.category && appInfo.category.toLowerCase() === 'nodejs') {
          result.app_category_valid = true;
        } else {
          result.error = `Application category is '${appInfo.category}', expected 'nodejs'`;
        }

      } catch (authError) {
        result.app_authenticated = false;
        result.error = authError.message;
      }

    } catch (error) {
      result.error = error.message;
    }

    return result;
  }

  /**
   * Handle API-level errors from response
   * @private
   */
  _handleApiError(responseData) {
    const errorMessage = responseData.error || responseData.message || 'Unknown API error';
    const errorCode = responseData.code || responseData.error_code;

    // Handle specific error types
    switch (errorCode) {
      case 'AUTHENTICATION_FAILED':
      case 'INVALID_API_KEY':
      case 'INVALID_APP_ID':
        return new AuthenticationError(errorMessage, this.config.appId);
      
      case 'RATE_LIMIT_EXCEEDED':
        return new RateLimitError(
          errorMessage,
          responseData.limit,
          responseData.remaining,
          responseData.reset_time ? new Date(responseData.reset_time) : null
        );
      
      case 'VALIDATION_ERROR':
        return new ValidationError(errorMessage, responseData.field, responseData.value);
      
      default:
        return new NetworkError(errorMessage, responseData.status_code || 400, responseData);
    }
  }

  /**
   * Transform axios errors into logger-simple errors
   * @private
   */
  _transformError(error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, data } = error.response;
      
      if (data && typeof data === 'object' && data.success === false) {
        return this._handleApiError(data);
      }
      
      return new NetworkError(
        `HTTP ${status}: ${data?.message || error.message}`,
        status,
        data
      );
    } else if (error.request) {
      // The request was made but no response was received
      return new NetworkError(
        'No response received from API server. Please check your internet connection.',
        null,
        null
      );
    } else {
      // Something happened in setting up the request that triggered an Error
      return new NetworkError(`Request setup error: ${error.message}`);
    }
  }

  /**
   * Determine if a request should be retried
   * @private
   */
  _shouldRetry(error, retryCount) {
    // Don't retry if we've exceeded the retry limit
    if (retryCount >= this.config.retries) {
      return false;
    }

    // Don't retry authentication errors
    if (error instanceof AuthenticationError) {
      return false;
    }

    // Don't retry validation errors
    if (error instanceof ValidationError) {
      return false;
    }

    // Don't retry rate limit errors (they should be handled by rate limiter)
    if (error instanceof RateLimitError) {
      return false;
    }

    // Retry network errors and 5xx server errors
    if (error instanceof NetworkError) {
      const statusCode = error.statusCode;
      
      // Retry on network timeouts or no response
      if (!statusCode) {
        return true;
      }
      
      // Retry on 5xx server errors
      if (statusCode >= 500) {
        return true;
      }
      
      // Retry on specific 4xx errors
      if (statusCode === 429) { // Too Many Requests
        return true;
      }
    }

    return false;
  }

  /**
   * Delay execution for the specified time
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update client configuration
   * @param {Object} newConfig - New configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Update axios instance if needed
    if (newConfig.baseUrl || newConfig.timeout || newConfig.userAgent) {
      this.httpClient.defaults.baseURL = this.config.baseUrl;
      this.httpClient.defaults.timeout = this.config.timeout;
      this.httpClient.defaults.headers['User-Agent'] = this.config.userAgent;
    }
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration (sanitized)
   */
  getConfig() {
    return {
      baseUrl: this.config.baseUrl,
      timeout: this.config.timeout,
      retries: this.config.retries,
      userAgent: this.config.userAgent,
      debug: this.config.debug,
      appId: this.config.appId ? '***' + this.config.appId.slice(-4) : null,
      apiKey: this.config.apiKey ? '***' + this.config.apiKey.slice(-4) : null
    };
  }
}

module.exports = ApiClient;