/**
 * Configuration Validator for Logger Simple
 * Validates configuration options and application compatibility
 */

'use strict';

const validator = require('validator');
const { 
  ValidationError, 
  ConfigurationError, 
  ApplicationError 
} = require('./errors');

/**
 * Configuration Validator Class
 */
class ConfigValidator {
  /**
   * Valid log levels supported by the API
   */
  static VALID_LOG_LEVELS = ['success', 'info', 'warning', 'error', 'critical'];

  /**
   * Valid environments supported by the API
   */
  static VALID_ENVIRONMENTS = ['production', 'staging', 'development', 'testing'];

  /**
   * Required application category for this Node.js module
   */
  static REQUIRED_CATEGORY = 'nodejs';

  /**
   * Validate basic configuration options
   * @param {Object} config - Configuration object to validate
   * @throws {ValidationError} When validation fails
   */
  static validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new ValidationError('Configuration must be an object');
    }

    // Validate appId
    if (!config.appId || typeof config.appId !== 'string') {
      throw new ValidationError('appId is required and must be a string', 'appId', config.appId);
    }

    if (!config.appId.startsWith('app_') || config.appId.length < 12) {
      throw new ValidationError('appId must be a valid Logger Simple application ID', 'appId', config.appId);
    }

    // Validate apiKey
    if (!config.apiKey || typeof config.apiKey !== 'string') {
      throw new ValidationError('apiKey is required and must be a string', 'apiKey', config.apiKey);
    }

    if (!config.apiKey.startsWith('ls_') || config.apiKey.length < 20) {
      throw new ValidationError('apiKey must be a valid Logger Simple API key', 'apiKey', config.apiKey);
    }

    // Validate baseUrl if provided
    if (config.baseUrl && !validator.isURL(config.baseUrl, { require_protocol: true })) {
      throw new ValidationError('baseUrl must be a valid URL', 'baseUrl', config.baseUrl);
    }

    // Validate timeout
    if (config.timeout !== undefined) {
      if (!Number.isInteger(config.timeout) || config.timeout < 1000 || config.timeout > 60000) {
        throw new ValidationError('timeout must be an integer between 1000 and 60000', 'timeout', config.timeout);
      }
    }

    // Validate retries
    if (config.retries !== undefined) {
      if (!Number.isInteger(config.retries) || config.retries < 0 || config.retries > 10) {
        throw new ValidationError('retries must be an integer between 0 and 10', 'retries', config.retries);
      }
    }

    // Validate maxLogsPerHour
    if (config.maxLogsPerHour !== undefined) {
      if (!Number.isInteger(config.maxLogsPerHour) || config.maxLogsPerHour < 100 || config.maxLogsPerHour > 50000) {
        throw new ValidationError('maxLogsPerHour must be an integer between 100 and 50000', 'maxLogsPerHour', config.maxLogsPerHour);
      }
    }

    // Validate boolean options
    const booleanOptions = ['debug', 'exitOnCritical', 'enableRateLimiting'];
    booleanOptions.forEach(option => {
      if (config[option] !== undefined && typeof config[option] !== 'boolean') {
        throw new ValidationError(`${option} must be a boolean`, option, config[option]);
      }
    });
  }

  /**
   * Validate log entry data
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {*} context - Log context (optional)
   * @param {*} content - Log content (optional)
   * @throws {ValidationError} When validation fails
   */
  static validateLogEntry(level, message, context = null, content = null) {
    // Validate level
    if (!level || typeof level !== 'string') {
      throw new ValidationError('Log level is required and must be a string', 'level', level);
    }

    if (!this.VALID_LOG_LEVELS.includes(level.toLowerCase())) {
      throw new ValidationError(
        `Invalid log level. Must be one of: ${this.VALID_LOG_LEVELS.join(', ')}`,
        'level',
        level
      );
    }

    // Validate message
    if (!message || typeof message !== 'string') {
      throw new ValidationError('Log message is required and must be a string', 'message', message);
    }

    if (message.length > 2000) {
      throw new ValidationError('Log message must be less than 2000 characters', 'message', message);
    }

    // Validate context if provided
    if (context !== null && context !== undefined) {
      if (typeof context === 'object') {
        try {
          const contextString = JSON.stringify(context);
          if (contextString.length > 5000) {
            throw new ValidationError('Context object too large (max 5000 characters when serialized)', 'context', context);
          }
        } catch (error) {
          throw new ValidationError('Context object must be JSON serializable', 'context', context);
        }
      } else if (typeof context === 'string') {
        if (context.length > 2000) {
          throw new ValidationError('Context string must be less than 2000 characters', 'context', context);
        }
      } else {
        throw new ValidationError('Context must be an object, string, or null', 'context', context);
      }
    }

    // Validate content if provided
    if (content !== null && content !== undefined) {
      if (typeof content === 'string') {
        if (content.length > 10000) {
          throw new ValidationError('Content string must be less than 10000 characters', 'content', content);
        }
      } else {
        throw new ValidationError('Content must be a string or null', 'content', content);
      }
    }
  }

  /**
   * Validate application category compatibility
   * @param {Object} appInfo - Application information from API
   * @throws {ApplicationError} When application category is not nodejs
   */
  static validateApplicationCategory(appInfo) {
    if (!appInfo || typeof appInfo !== 'object') {
      throw new ApplicationError('Invalid application information received from API');
    }

    if (!appInfo.category) {
      throw new ApplicationError('Application category not found in API response', appInfo.app_id || 'unknown');
    }

    const actualCategory = appInfo.category.toLowerCase();
    if (actualCategory !== this.REQUIRED_CATEGORY) {
      throw new ApplicationError(
        `This Node.js module can only be used with Node.js applications. Application category is '${actualCategory}', expected '${this.REQUIRED_CATEGORY}'. Please use the appropriate client library for your programming language.`,
        appInfo.app_id || 'unknown',
        this.REQUIRED_CATEGORY,
        actualCategory
      );
    }

    // Additional validation for application status
    if (appInfo.is_active === false || appInfo.is_active === 0) {
      throw new ApplicationError(
        'Application is currently inactive. Please activate it in the Logger Simple dashboard.',
        appInfo.app_id || 'unknown'
      );
    }
  }

  /**
   * Validate tags array
   * @param {Array} tags - Array of tags
   * @throws {ValidationError} When validation fails
   */
  static validateTags(tags) {
    if (!Array.isArray(tags)) {
      throw new ValidationError('Tags must be an array', 'tags', tags);
    }

    if (tags.length > 20) {
      throw new ValidationError('Maximum 20 tags allowed', 'tags', tags);
    }

    tags.forEach((tag, index) => {
      if (typeof tag !== 'string') {
        throw new ValidationError(`Tag at index ${index} must be a string`, 'tags', tag);
      }

      if (tag.length > 50) {
        throw new ValidationError(`Tag at index ${index} must be less than 50 characters`, 'tags', tag);
      }

      if (!/^[a-zA-Z0-9\-_]+$/.test(tag)) {
        throw new ValidationError(`Tag at index ${index} can only contain letters, numbers, hyphens and underscores`, 'tags', tag);
      }
    });
  }

  /**
   * Validate metadata object
   * @param {Object} metadata - Metadata object
   * @throws {ValidationError} When validation fails
   */
  static validateMetadata(metadata) {
    if (typeof metadata !== 'object' || metadata === null) {
      throw new ValidationError('Metadata must be an object', 'metadata', metadata);
    }

    try {
      const metadataString = JSON.stringify(metadata);
      if (metadataString.length > 8000) {
        throw new ValidationError('Metadata object too large (max 8000 characters when serialized)', 'metadata', metadata);
      }
    } catch (error) {
      throw new ValidationError('Metadata object must be JSON serializable', 'metadata', metadata);
    }

    // Check for reserved keys
    const reservedKeys = ['id', 'app_id', 'created_at', 'updated_at', 'log_level', 'message'];
    const keys = Object.keys(metadata);
    
    for (const key of keys) {
      if (reservedKeys.includes(key)) {
        throw new ValidationError(`Metadata cannot contain reserved key: ${key}`, 'metadata', metadata);
      }

      if (typeof key !== 'string' || key.length > 100) {
        throw new ValidationError('Metadata keys must be strings with less than 100 characters', 'metadata', metadata);
      }
    }
  }

  /**
   * Sanitize and normalize configuration
   * @param {Object} config - Raw configuration
   * @returns {Object} Normalized configuration
   */
  static normalizeConfig(config) {
    const normalized = { ...config };

    // Set defaults
    normalized.baseUrl = normalized.baseUrl || 'https://api.logger-simple.com';
    normalized.timeout = normalized.timeout || 10000;
    normalized.retries = normalized.retries || 3;
    normalized.debug = normalized.debug !== undefined ? normalized.debug : false;
    normalized.exitOnCritical = normalized.exitOnCritical !== undefined ? normalized.exitOnCritical : true;
    normalized.maxLogsPerHour = normalized.maxLogsPerHour || 1000;
    normalized.enableRateLimiting = normalized.enableRateLimiting !== undefined ? normalized.enableRateLimiting : true;
    normalized.userAgent = normalized.userAgent || `node-logger-simple/${require('../package.json').version}`;

    // Normalize URLs
    normalized.baseUrl = normalized.baseUrl.replace(/\/$/, '');

    return normalized;
  }
}

module.exports = ConfigValidator;