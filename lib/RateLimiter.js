/**
 * Rate Limiter for Logger Simple
 * Prevents API spam and manages request throttling
 */

'use strict';

const { RateLimitError } = require('./errors');

/**
 * Rate Limiter Class
 * Implements token bucket algorithm for smooth rate limiting
 */
class RateLimiter {
  /**
   * Create a new RateLimiter instance
   * @param {Object} options - Rate limiter options
   * @param {number} options.maxRequests - Maximum requests per hour
   * @param {number} [options.burstSize] - Maximum burst size (defaults to 10% of max requests)
   * @param {boolean} [options.enabled=true] - Whether rate limiting is enabled
   */
  constructor(options = {}) {
    this.maxRequests = options.maxRequests || 1000;
    this.burstSize = options.burstSize || Math.max(10, Math.floor(this.maxRequests * 0.1));
    this.enabled = options.enabled !== false;
    
    // Token bucket implementation
    this.tokens = this.burstSize;
    this.lastRefill = Date.now();
    this.refillRate = this.maxRequests / (60 * 60 * 1000); // tokens per millisecond
    
    // Request tracking
    this.requestCounts = new Map(); // hour -> count
    this.lastCleanup = Date.now();
    
    // Warnings
    this.warningThreshold = 0.8; // Warn at 80% of limit
    this.hasWarned = false;
    
    // Statistics
    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      lastBlockedAt: null,
      hourlyPeaks: new Map()
    };
  }

  /**
   * Check if a request is allowed
   * @param {number} [cost=1] - Cost of the request in tokens
   * @returns {boolean} Whether the request is allowed
   * @throws {RateLimitError} When rate limit is exceeded
   */
  checkRequest(cost = 1) {
    if (!this.enabled) {
      this.stats.totalRequests++;
      return true;
    }

    const now = Date.now();
    
    // Refill tokens based on time passed
    this._refillTokens(now);
    
    // Clean up old hourly counts
    this._cleanupOldCounts(now);
    
    // Check hourly limit
    const currentHour = Math.floor(now / (60 * 60 * 1000));
    const currentHourCount = this.requestCounts.get(currentHour) || 0;
    
    if (currentHourCount >= this.maxRequests) {
      this.stats.blockedRequests++;
      this.stats.lastBlockedAt = now;
      
      const resetTime = new Date((currentHour + 1) * 60 * 60 * 1000);
      throw new RateLimitError(
        `Hourly rate limit of ${this.maxRequests} requests exceeded. Limit resets at ${resetTime.toISOString()}`,
        this.maxRequests,
        this.maxRequests - currentHourCount,
        resetTime
      );
    }
    
    // Check burst limit (token bucket)
    if (this.tokens < cost) {
      this.stats.blockedRequests++;
      this.stats.lastBlockedAt = now;
      
      throw new RateLimitError(
        `Burst rate limit exceeded. Please slow down your requests. Available tokens: ${Math.floor(this.tokens)}/${this.burstSize}`,
        this.burstSize,
        Math.floor(this.tokens),
        new Date(now + (cost - this.tokens) / this.refillRate)
      );
    }
    
    // Consume tokens and increment counters
    this.tokens -= cost;
    this.requestCounts.set(currentHour, currentHourCount + 1);
    this.stats.totalRequests++;
    
    // Update hourly peak tracking
    const currentPeak = this.stats.hourlyPeaks.get(currentHour) || 0;
    if (currentHourCount + 1 > currentPeak) {
      this.stats.hourlyPeaks.set(currentHour, currentHourCount + 1);
    }
    
    // Check if warning should be issued
    this._checkWarningThreshold(currentHourCount + 1);
    
    return true;
  }

  /**
   * Get current rate limit status
   * @returns {Object} Rate limit status information
   */
  getStatus() {
    const now = Date.now();
    this._refillTokens(now);
    
    const currentHour = Math.floor(now / (60 * 60 * 1000));
    const currentHourCount = this.requestCounts.get(currentHour) || 0;
    
    return {
      enabled: this.enabled,
      maxRequestsPerHour: this.maxRequests,
      burstSize: this.burstSize,
      currentHourRequests: currentHourCount,
      remainingRequests: this.maxRequests - currentHourCount,
      availableTokens: Math.floor(this.tokens),
      utilizationPercent: Math.round((currentHourCount / this.maxRequests) * 100),
      resetTime: new Date((currentHour + 1) * 60 * 60 * 1000),
      stats: { ...this.stats }
    };
  }

  /**
   * Reset rate limiter state
   */
  reset() {
    this.tokens = this.burstSize;
    this.lastRefill = Date.now();
    this.requestCounts.clear();
    this.hasWarned = false;
    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      lastBlockedAt: null,
      hourlyPeaks: new Map()
    };
  }

  /**
   * Update rate limiter configuration
   * @param {Object} options - New configuration options
   */
  updateConfig(options = {}) {
    if (options.maxRequests !== undefined) {
      this.maxRequests = options.maxRequests;
      this.refillRate = this.maxRequests / (60 * 60 * 1000);
    }
    
    if (options.burstSize !== undefined) {
      this.burstSize = options.burstSize;
      // Adjust current tokens if needed
      this.tokens = Math.min(this.tokens, this.burstSize);
    }
    
    if (options.enabled !== undefined) {
      this.enabled = options.enabled;
    }
    
    // Reset warning flag when configuration changes
    this.hasWarned = false;
  }

  /**
   * Get recommendations for optimal usage
   * @returns {Array<string>} Array of recommendation strings
   */
  getRecommendations() {
    const status = this.getStatus();
    const recommendations = [];
    
    if (status.utilizationPercent > 90) {
      recommendations.push('Consider increasing your rate limit or reducing log frequency');
    }
    
    if (status.availableTokens < 5) {
      recommendations.push('Slow down requests to avoid burst limit violations');
    }
    
    if (this.stats.blockedRequests > 0) {
      const blockRate = (this.stats.blockedRequests / this.stats.totalRequests) * 100;
      if (blockRate > 5) {
        recommendations.push(`${blockRate.toFixed(1)}% of requests are being blocked. Consider implementing backoff strategies`);
      }
    }
    
    const averageHourlyUsage = Array.from(this.stats.hourlyPeaks.values()).reduce((sum, peak) => sum + peak, 0) / this.stats.hourlyPeaks.size;
    if (averageHourlyUsage < this.maxRequests * 0.5) {
      recommendations.push('You have plenty of rate limit headroom available');
    }
    
    return recommendations;
  }

  /**
   * Refill tokens based on elapsed time
   * @private
   */
  _refillTokens(now) {
    const timePassed = now - this.lastRefill;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.burstSize, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Clean up old hourly request counts
   * @private
   */
  _cleanupOldCounts(now) {
    // Only cleanup every 10 minutes to avoid excessive work
    if (now - this.lastCleanup < 10 * 60 * 1000) {
      return;
    }
    
    const currentHour = Math.floor(now / (60 * 60 * 1000));
    const cutoffHour = currentHour - 24; // Keep last 24 hours
    
    for (const hour of this.requestCounts.keys()) {
      if (hour < cutoffHour) {
        this.requestCounts.delete(hour);
      }
    }
    
    // Also cleanup hourly peaks
    for (const hour of this.stats.hourlyPeaks.keys()) {
      if (hour < cutoffHour) {
        this.stats.hourlyPeaks.delete(hour);
      }
    }
    
    this.lastCleanup = now;
  }

  /**
   * Check if warning should be issued for high usage
   * @private
   */
  _checkWarningThreshold(currentCount) {
    if (!this.hasWarned && currentCount >= this.maxRequests * this.warningThreshold) {
      this.hasWarned = true;
      
      // Note: The warning will be emitted by the logger itself
      // This method just tracks the warning state
      return true;
    }
    
    return false;
  }

  /**
   * Calculate optimal request timing
   * @param {number} requestCount - Number of requests to make
   * @returns {Object} Timing recommendations
   */
  calculateOptimalTiming(requestCount) {
    const status = this.getStatus();
    const safeRequestsRemaining = Math.min(status.remainingRequests, status.availableTokens);
    
    if (requestCount <= safeRequestsRemaining) {
      return {
        canProceed: true,
        delay: 0,
        batchSize: requestCount,
        recommendation: 'All requests can be sent immediately'
      };
    }
    
    // Calculate batching strategy
    const optimalBatchSize = Math.floor(safeRequestsRemaining * 0.8); // Leave some buffer
    const batches = Math.ceil(requestCount / optimalBatchSize);
    const delayBetweenBatches = Math.ceil(optimalBatchSize / this.refillRate); // Time to refill tokens
    
    return {
      canProceed: false,
      delay: delayBetweenBatches,
      batchSize: optimalBatchSize,
      batches: batches,
      totalTime: batches * delayBetweenBatches,
      recommendation: `Split into ${batches} batches of ${optimalBatchSize} requests with ${Math.round(delayBetweenBatches / 1000)}s delays`
    };
  }
}

module.exports = RateLimiter;