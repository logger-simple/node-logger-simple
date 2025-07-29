/**
 * Custom Error Classes for Logger Simple
 * Provides specific error types for better error handling and debugging
 */

'use strict';

/**
 * Base Logger Error class
 * @extends Error
 */
class LoggerError extends Error {
  constructor(message, code = 'LOGGER_ERROR', details = {}) {
    super(message);
    this.name = 'LoggerError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LoggerError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Validation Error - thrown when input validation fails
 * @extends LoggerError
 */
class ValidationError extends LoggerError {
  constructor(message, field = null, value = null) {
    super(message, 'VALIDATION_ERROR', { field, value });
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * Network Error - thrown when API requests fail
 * @extends LoggerError
 */
class NetworkError extends LoggerError {
  constructor(message, statusCode = null, response = null, retryCount = 0) {
    super(message, 'NETWORK_ERROR', { statusCode, response, retryCount });
    this.name = 'NetworkError';
    this.statusCode = statusCode;
    this.response = response;
    this.retryCount = retryCount;
  }
}

/**
 * Rate Limit Error - thrown when rate limits are exceeded
 * @extends LoggerError
 */
class RateLimitError extends LoggerError {
  constructor(message, limit = null, remaining = null, resetTime = null) {
    super(message, 'RATE_LIMIT_ERROR', { limit, remaining, resetTime });
    this.name = 'RateLimitError';
    this.limit = limit;
    this.remaining = remaining;
    this.resetTime = resetTime;
  }
}

/**
 * Configuration Error - thrown when configuration is invalid
 * @extends LoggerError
 */
class ConfigurationError extends LoggerError {
  constructor(message, configKey = null, configValue = null) {
    super(message, 'CONFIGURATION_ERROR', { configKey, configValue });
    this.name = 'ConfigurationError';
    this.configKey = configKey;
    this.configValue = configValue;
  }
}

/**
 * Authentication Error - thrown when API authentication fails
 * @extends LoggerError
 */
class AuthenticationError extends LoggerError {
  constructor(message, appId = null) {
    super(message, 'AUTHENTICATION_ERROR', { appId });
    this.name = 'AuthenticationError';
    this.appId = appId;
  }
}

/**
 * Application Error - thrown when application category validation fails
 * @extends LoggerError
 */
class ApplicationError extends LoggerError {
  constructor(message, appId = null, expectedCategory = 'nodejs', actualCategory = null) {
    super(message, 'APPLICATION_ERROR', { appId, expectedCategory, actualCategory });
    this.name = 'ApplicationError';
    this.appId = appId;
    this.expectedCategory = expectedCategory;
    this.actualCategory = actualCategory;
  }
}

/**
 * Shutdown Error - thrown when a critical error requires application shutdown
 * @extends LoggerError
 */
class ShutdownError extends LoggerError {
  constructor(message, reason = 'CRITICAL_ERROR', exitCode = 1) {
    super(message, 'SHUTDOWN_ERROR', { reason, exitCode });
    this.name = 'ShutdownError';
    this.reason = reason;
    this.exitCode = exitCode;
  }
}

module.exports = {
  LoggerError,
  ValidationError,
  NetworkError,
  RateLimitError,
  ConfigurationError,
  AuthenticationError,
  ApplicationError,
  ShutdownError
};