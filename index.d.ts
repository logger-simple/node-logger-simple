/**
 * Type definitions for node-logger-simple
 * Official Node.js client for Logger Simple
 */

export interface LoggerConfig {
  /** Application ID from Logger Simple dashboard */
  appId: string;
  /** API Key from Logger Simple dashboard */
  apiKey: string;
  /** API base URL (default: 'https://api.logger-simple.com') */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Number of retry attempts for failed requests (default: 3) */
  retries?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
  /** Exit process on critical errors (default: true) */
  exitOnCritical?: boolean;
  /** Client-side rate limit per hour (default: 1000) */
  maxLogsPerHour?: number;
  /** Enable client-side rate limiting (default: true) */
  enableRateLimiting?: boolean;
  /** Custom user agent string */
  userAgent?: string;
  /** Enable global error handling (default: true) */
  enableGlobalErrorHandling?: boolean;
  /** Exit on authentication errors (default: true) */
  exitOnAuthError?: boolean;
}

export interface LogContext {
  [key: string]: any;
}

export interface LogMetadata {
  [key: string]: any;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  code?: string;
}

export interface ApplicationInfo {
  app_id: string;
  name: string;
  description?: string;
  category: string;
  environment: string;
  is_active: boolean;
  max_logs_per_hour: number;
  created_at: string;
  updated_at: string;
}

export interface LogEntry {
  id: string;
  app_id: string;
  log_level: LogLevel;
  message: string;
  context?: string;
  content?: string;
  tags?: string[];
  metadata?: LogMetadata;
  created_at: string;
}

export interface LogsResponse {
  success: boolean;
  data: {
    logs: LogEntry[];
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
  };
}

export interface LogStatsResponse {
  success: boolean;
  data: {
    total_logs: number;
    logs_by_level: Record<LogLevel, number>;
    daily_counts: Array<{
      date: string;
      count: number;
    }>;
    error_rate: number;
    avg_logs_per_day: number;
  };
}

export interface RateLimitStatus {
  enabled: boolean;
  maxRequestsPerHour: number;
  burstSize: number;
  currentHourRequests: number;
  remainingRequests: number;
  availableTokens: number;
  utilizationPercent: number;
  resetTime: Date;
  stats: {
    totalRequests: number;
    blockedRequests: number;
    lastBlockedAt: Date | null;
    hourlyPeaks: Map<number, number>;
  };
}

export interface ClientStats {
  totalLogs: number;
  successfulLogs: number;
  failedLogs: number;
  rateLimitedLogs: number;
  startTime: number;
  lastLogTime: number | null;
  uptime_ms: number;
  uptime_human: string;
  success_rate: number;
  avg_logs_per_minute: number;
  is_initialized: boolean;
  app_info: {
    name: string;
    category: string;
    environment: string;
  } | null;
}

export interface HealthCheckResult {
  timestamp: string;
  api_connection: boolean;
  app_authenticated: boolean;
  app_category_valid: boolean;
  response_time: number | null;
  app_info: ApplicationInfo | null;
  error: string | null;
  client_stats: ClientStats;
  rate_limiter: RateLimitStatus;
  error_handler: {
    isShuttingDown: boolean;
    criticalErrorCount: number;
    criticalErrorWindow: number;
    maxCriticalErrors: number;
    recentCriticalErrors: number;
    hasGlobalHandlers: boolean;
  };
}

export interface LogQueryOptions {
  /** Filter by log level */
  level?: LogLevel;
  /** Maximum number of logs to return (default: 100, max: 1000) */
  limit?: number;
  /** Number of logs to skip */
  offset?: number;
  /** Search term to filter logs */
  search?: string;
  /** Start date for date range filtering */
  startDate?: string;
  /** End date for date range filtering */
  endDate?: string;
}

export interface PerformanceResult {
  duration: number;
  memoryDelta: {
    rss: number;
    heapUsed: number;
    external: number;
  };
}

export interface TimingRecommendation {
  canProceed: boolean;
  delay: number;
  batchSize: number;
  batches?: number;
  totalTime?: number;
  recommendation: string;
}

export type LogLevel = 'success' | 'info' | 'warning' | 'error' | 'critical';

export type Environment = 'production' | 'staging' | 'development' | 'testing';

// Error Classes
export declare class LoggerError extends Error {
  code: string;
  details: any;
  timestamp: string;
  
  constructor(message: string, code?: string, details?: any);
  toJSON(): object;
}

export declare class ValidationError extends LoggerError {
  field: string | null;
  value: any;
  
  constructor(message: string, field?: string | null, value?: any);
}

export declare class NetworkError extends LoggerError {
  statusCode: number | null;
  response: any;
  retryCount: number;
  
  constructor(message: string, statusCode?: number | null, response?: any, retryCount?: number);
}

export declare class RateLimitError extends LoggerError {
  limit: number | null;
  remaining: number | null;
  resetTime: Date | null;
  
  constructor(message: string, limit?: number | null, remaining?: number | null, resetTime?: Date | null);
}

export declare class ApplicationError extends LoggerError {
  appId: string | null;
  expectedCategory: string;
  actualCategory: string | null;
  
  constructor(message: string, appId?: string | null, expectedCategory?: string, actualCategory?: string | null);
}

export declare class AuthenticationError extends LoggerError {
  appId: string | null;
  
  constructor(message: string, appId?: string | null);
}

export declare class ShutdownError extends LoggerError {
  reason: string;
  exitCode: number;
  
  constructor(message: string, reason?: string, exitCode?: number);
}

// Context Logger Interface
export interface ContextLogger {
  success(message: string, context?: LogContext | null, content?: string | null, tags?: string[], metadata?: LogMetadata): Promise<ApiResponse>;
  info(message: string, context?: LogContext | null, content?: string | null, tags?: string[], metadata?: LogMetadata): Promise<ApiResponse>;
  warn(message: string, context?: LogContext | null, content?: string | null, tags?: string[], metadata?: LogMetadata): Promise<ApiResponse>;
  error(message: string, context?: LogContext | null, content?: string | null, tags?: string[], metadata?: LogMetadata): Promise<ApiResponse>;
  critical(message: string, context?: LogContext | null, content?: string | null, exitOnCritical?: boolean | null, tags?: string[], metadata?: LogMetadata): Promise<ApiResponse>;
  log(level: LogLevel, message: string, context?: LogContext | null, content?: string | null, exitOnCritical?: boolean | null, tags?: string[], metadata?: LogMetadata): Promise<ApiResponse>;
  timeOperation<T>(operation: () => Promise<T>, operationName: string, level?: LogLevel): Promise<T>;
  subContext(subName: string): ContextLogger;
}

// Main Logger Class
export declare class Logger {
  constructor(options: LoggerConfig);
  
  /** Initialize the logger and validate application */
  initialize(): Promise<boolean>;
  
  /** Log a message with the specified level */
  log(
    level: LogLevel, 
    message: string, 
    context?: LogContext | null, 
    content?: string | null, 
    exitOnCritical?: boolean | null, 
    tags?: string[], 
    metadata?: LogMetadata
  ): Promise<ApiResponse>;
  
  /** Log success message */
  success(message: string, context?: LogContext | null, content?: string | null, tags?: string[], metadata?: LogMetadata): Promise<ApiResponse>;
  
  /** Log info message */
  info(message: string, context?: LogContext | null, content?: string | null, tags?: string[], metadata?: LogMetadata): Promise<ApiResponse>;
  
  /** Log warning message */
  warn(message: string, context?: LogContext | null, content?: string | null, tags?: string[], metadata?: LogMetadata): Promise<ApiResponse>;
  
  /** Log error message */
  error(message: string, context?: LogContext | null, content?: string | null, tags?: string[], metadata?: LogMetadata): Promise<ApiResponse>;
  
  /** Log critical message (triggers alerts and potential shutdown) */
  critical(message: string, context?: LogContext | null, content?: string | null, exitOnCritical?: boolean | null, tags?: string[], metadata?: LogMetadata): Promise<ApiResponse>;
  
  /** Create a context-aware logger */
  context(contextName: string): ContextLogger;
  
  /** Monitor the performance of an operation */
  timeOperation<T>(operation: () => Promise<T>, operationName: string, level?: LogLevel): Promise<T>;
  
  /** Force exit the application with a critical log */
  forceExit(message: string, context?: LogContext | null): Promise<never>;
  
  /** Graceful shutdown with logging */
  gracefulShutdown(reason?: string, exitCode?: number): Promise<never>;
  
  /** Get logs from the API */
  getLogs(options?: LogQueryOptions): Promise<LogsResponse>;
  
  /** Get log statistics */
  getLogStats(days?: number): Promise<LogStatsResponse>;
  
  /** Get platform statistics */
  getStats(): Promise<ApiResponse>;
  
  /** Test connection and perform health check */
  healthCheck(): Promise<HealthCheckResult>;
  
  /** Get client-side statistics */
  getClientStats(): ClientStats;
  
  /** Set default context for all logs */
  setDefaultContext(context: LogContext): void;
  
  /** Get current configuration (sanitized) */
  getConfig(): object;
  
  /** Clean up logger resources */
  cleanup(): void;
}

// Factory function
declare function createLogger(options: LoggerConfig): Logger;

// Default export
export default createLogger;

// Named exports
export { createLogger };

// Constants
export declare const LOG_LEVELS: {
  SUCCESS: 'success';
  INFO: 'info';
  WARNING: 'warning';
  ERROR: 'error';
  CRITICAL: 'critical';
};

export declare const ENVIRONMENTS: {
  PRODUCTION: 'production';
  STAGING: 'staging';
  DEVELOPMENT: 'development';
  TESTING: 'testing';
};

export declare const VERSION: string;