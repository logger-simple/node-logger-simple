/**
 * Utility functions for Logger Simple
 * Provides helper functions for common operations
 */

'use strict';

/**
 * Utility class with static helper methods
 */
class Utils {
  /**
   * Safely stringify an object, handling circular references
   * @param {*} obj - Object to stringify
   * @param {number} maxDepth - Maximum depth to traverse
   * @returns {string} JSON string representation
   */
  static safeStringify(obj, maxDepth = 10) {
    const seen = new WeakSet();
    let depth = 0;
    
    const replacer = (key, value) => {
      depth++;
      
      if (depth > maxDepth) {
        return '[Max Depth Reached]';
      }
      
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      
      // Handle special types
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack
        };
      }
      
      if (value instanceof Date) {
        return value.toISOString();
      }
      
      if (typeof value === 'function') {
        return '[Function]';
      }
      
      if (typeof value === 'undefined') {
        return '[Undefined]';
      }
      
      depth--;
      return value;
    };
    
    try {
      return JSON.stringify(obj, replacer, 2);
    } catch (error) {
      return `[Stringify Error: ${error.message}]`;
    }
  }

  /**
   * Sanitize sensitive data from objects
   * @param {*} obj - Object to sanitize
   * @param {Array<string>} sensitiveKeys - Keys to sanitize
   * @returns {*} Sanitized object
   */
  static sanitizeSensitiveData(obj, sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth']) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeSensitiveData(item, sensitiveKeys));
    }
    
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sensitiveKey => 
        lowerKey.includes(sensitiveKey.toLowerCase())
      );
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeSensitiveData(value, sensitiveKeys);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Deep merge two objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged object
   */
  static deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (this.isObject(source[key]) && this.isObject(target[key])) {
          result[key] = this.deepMerge(target[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  /**
   * Check if value is a plain object
   * @param {*} value - Value to check
   * @returns {boolean} Whether value is a plain object
   */
  static isObject(value) {
    return value !== null && 
           typeof value === 'object' && 
           !Array.isArray(value) && 
           !(value instanceof Date) && 
           !(value instanceof Error);
  }

  /**
   * Truncate string to specified length
   * @param {string} str - String to truncate
   * @param {number} maxLength - Maximum length
   * @param {string} suffix - Suffix to add when truncated
   * @returns {string} Truncated string
   */
  static truncateString(str, maxLength = 100, suffix = '...') {
    if (typeof str !== 'string') {
      str = String(str);
    }
    
    if (str.length <= maxLength) {
      return str;
    }
    
    return str.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Generate a unique correlation ID
   * @returns {string} Unique correlation ID
   */
  static generateCorrelationId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `${timestamp}-${random}`;
  }

  /**
   * Format file size in human-readable format
   * @param {number} bytes - Size in bytes
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted size
   */
  static formatFileSize(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Format duration in human-readable format
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  static formatDuration(ms) {
    if (ms < 1000) {
      return `${Math.round(ms)}ms`;
    }
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    }
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    
    return `${seconds}s`;
  }

  /**
   * Retry a function with exponential backoff
   * @param {Function} fn - Function to retry
   * @param {Object} options - Retry options
   * @returns {Promise<*>} Function result
   */
  static async retry(fn, options = {}) {
    const {
      retries = 3,
      delay = 1000,
      backoff = 2,
      maxDelay = 10000,
      shouldRetry = () => true
    } = options;
    
    let lastError;
    let currentDelay = delay;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn(attempt);
      } catch (error) {
        lastError = error;
        
        if (attempt === retries || !shouldRetry(error, attempt)) {
          throw error;
        }
        
        await this.delay(Math.min(currentDelay, maxDelay));
        currentDelay *= backoff;
      }
    }
    
    throw lastError;
  }

  /**
   * Delay execution for specified time
   * @param {number} ms - Delay in milliseconds
   * @returns {Promise<void>} Promise that resolves after delay
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Debounce a function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @param {boolean} immediate - Execute immediately on first call
   * @returns {Function} Debounced function
   */
  static debounce(func, wait, immediate = false) {
    let timeout;
    
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func.apply(this, args);
      };
      
      const callNow = immediate && !timeout;
      
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      
      if (callNow) func.apply(this, args);
    };
  }

  /**
   * Throttle a function
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {Function} Throttled function
   */
  static throttle(func, limit) {
    let inThrottle;
    
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Get system information
   * @returns {Object} System information
   */
  static getSystemInfo() {
    const os = require('os');
    
    return {
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      loadavg: os.loadavg(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      cpus: os.cpus().length,
      node_version: process.version,
      pid: process.pid,
      memory_usage: process.memoryUsage(),
      process_uptime: process.uptime()
    };
  }

  /**
   * Extract error information
   * @param {Error} error - Error object
   * @returns {Object} Extracted error information
   */
  static extractErrorInfo(error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      path: error.path,
      details: error.details,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} Whether email is valid
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} Whether URL is valid
   */
  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get environment variable with default value
   * @param {string} key - Environment variable key
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Environment variable value or default
   */
  static getEnv(key, defaultValue = null) {
    const value = process.env[key];
    
    if (value === undefined) {
      return defaultValue;
    }
    
    // Try to parse as JSON for complex values
    if (typeof defaultValue === 'object' || defaultValue === null) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    
    // Convert to appropriate type based on default value
    if (typeof defaultValue === 'boolean') {
      return value.toLowerCase() === 'true';
    }
    
    if (typeof defaultValue === 'number') {
      const parsed = Number(value);
      return isNaN(parsed) ? defaultValue : parsed;
    }
    
    return value;
  }

  /**
   * Create a simple hash from string
   * @param {string} str - String to hash
   * @returns {string} Hash value
   */
  static simpleHash(str) {
    let hash = 0;
    
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if running in development environment
   * @returns {boolean} Whether in development
   */
  static isDevelopment() {
    return process.env.NODE_ENV === 'development';
  }

  /**
   * Check if running in production environment
   * @returns {boolean} Whether in production
   */
  static isProduction() {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Get current timestamp in various formats
   * @param {string} format - Format type ('iso', 'unix', 'ms')
   * @returns {string|number} Formatted timestamp
   */
  static getTimestamp(format = 'iso') {
    const now = new Date();
    
    switch (format) {
      case 'unix':
        return Math.floor(now.getTime() / 1000);
      case 'ms':
        return now.getTime();
      case 'iso':
      default:
        return now.toISOString();
    }
  }
}

module.exports = Utils;