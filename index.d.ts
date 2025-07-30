/**
 * Type definitions for node-logger-simple
 * Definitions TypeScript pour une meilleure expérience de développement
 */

declare module 'node-logger-simple' {
  export interface LoggerConfig {
    appId: string;
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    debug?: boolean;
  }

  export interface LogContext {
    [key: string]: any;
  }

  export interface LogResponse {
    success: boolean;
    error?: string;
    data?: any;
  }

  export interface LoggerStats {
    totalLogs: number;
    successfulLogs: number;
    failedLogs: number;
    isInitialized: boolean;
    successRate: number;
  }

  export interface ContextLogger {
    success(message: string, context?: LogContext): Promise<LogResponse>;
    info(message: string, context?: LogContext): Promise<LogResponse>;
    warn(message: string, context?: LogContext): Promise<LogResponse>;
    error(message: string, context?: LogContext): Promise<LogResponse>;
    critical(message: string, context?: LogContext): Promise<LogResponse>;
    log(level: string, message: string, context?: LogContext): Promise<LogResponse>;
    subContext(name: string): ContextLogger;
  }

  export class Logger {
    constructor(config: LoggerConfig);
    
    initialize(): Promise<boolean>;
    
    success(message: string, context?: LogContext): Promise<LogResponse>;
    info(message: string, context?: LogContext): Promise<LogResponse>;
    warn(message: string, context?: LogContext): Promise<LogResponse>;
    error(message: string, context?: LogContext): Promise<LogResponse>;
    critical(message: string, context?: LogContext): Promise<LogResponse>;
    log(level: string, message: string, context?: LogContext): Promise<LogResponse>;
    
    context(name: string): ContextLogger;
    getStats(): LoggerStats;
  }

  export const LOG_LEVELS: {
    SUCCESS: 'success';
    INFO: 'info';
    WARNING: 'warning';
    ERROR: 'error';
    CRITICAL: 'critical';
  };

  export const VERSION: string;

  export function createLogger(config: LoggerConfig): Logger;

  function nodeLoggerSimple(config: LoggerConfig): Logger;
  export = nodeLoggerSimple;
}