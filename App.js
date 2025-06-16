const https = require('https');
const http = require('http');
const { URL } = require('url');
const EventEmitter = require('events');

/**
 * Logger Simple - Module Node.js Simplifié
 * Version 6.1.0 - Approche simplifiée sans dépendances externes
 */
class Logger extends EventEmitter {
  constructor(config) {
    super();
    
    if (!config || !config.app_id || !config.api_key) {
      throw new Error('app_id and api_key are required');
    }
    
    this.app_id = config.app_id;
    this.api_key = config.api_key;
    this.apiUrl = 'https://api.logger-simple.com/'; // URL fixe
    
    // Options par défaut
    this.options = {
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      enableCrashLogging: config.enableCrashLogging !== false,
      enableGracefulShutdown: config.enableGracefulShutdown !== false,
      autoHeartbeat: config.autoHeartbeat !== false,
      heartbeatInterval: config.heartbeatInterval || 300000,
      batchSize: config.batchSize || 100,
      flushInterval: config.flushInterval || 5000,
      maxLogLength: config.maxLogLength || 10000,
      ...config.options
    };
    
    // État interne
    this.isConnected = false;
    this.isShuttingDown = false;
    this.heartbeatTimer = null;
    this.batchTimer = null;
    this.logQueue = [];
    this.metrics = {
      logsSent: 0,
      logsSuccess: 0,
      logsError: 0,
      startTime: new Date(),
      lastHeartbeat: null
    };
    
    // Initialisation
    this.init();
  }
  
  /**
   * Initialisation du logger
   */
  init() {
    try {
      // Configuration de la détection de crash
      if (this.options.enableCrashLogging) {
        this.setupCrashDetection();
      }
      
      // Configuration de l'arrêt gracieux
      if (this.options.enableGracefulShutdown) {
        this.setupGracefulShutdown();
      }
      
      // Démarrage du heartbeat
      if (this.options.autoHeartbeat) {
        this.startHeartbeat();
      }
      
      // Démarrage du traitement en lot
      this.startBatchProcessing();
      
      // Test de connexion initial
      this.testConnection()
        .then(() => {
          this.isConnected = true;
          this.emit('ready');
          this.emit('connected');
          console.log('[Logger] Ready and connected');
        })
        .catch((error) => {
          this.emit('error', error);
          console.error('[Logger] Connection failed:', error.message);
        });
        
    } catch (error) {
      this.emit('error', error);
      console.error('[Logger] Initialization failed:', error.message);
    }
  }
  
  /**
   * Test de connexion à l'API
   */
  async testConnection() {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        action: 'logger',
        request: 'health',
        app_id: this.app_id,
        api_key: this.api_key
      });
      
      const parsedUrl = new URL(this.apiUrl);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'User-Agent': 'Logger-Simple-NodeJS/6.1.0'
        },
        timeout: this.options.timeout
      };
      
      const req = protocol.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(responseData);
            if (response.success) {
              resolve(response);
            } else {
              reject(new Error(response.error || 'API request failed'));
            }
          } catch (error) {
            reject(new Error('Invalid JSON response'));
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
      
      req.write(data);
      req.end();
    });
  }
  
  /**
   * Envoyer un log
   */
  async sendLog(logLevel, message, context = null) {
    if (this.isShuttingDown) {
      console.warn('[Logger] Skipping log during shutdown');
      return null;
    }
    
    try {
      // Validation
      const validLevels = ['success', 'info', 'warning', 'error', 'critical'];
      if (!validLevels.includes(logLevel)) {
        throw new Error(`Invalid log level: ${logLevel}`);
      }
      
      if (!message || typeof message !== 'string') {
        throw new Error('Message must be a non-empty string');
      }
      
      // Limitation de taille
      if (message.length > this.options.maxLogLength) {
        message = message.substring(0, this.options.maxLogLength) + '... [TRUNCATED]';
      }
      
      // Préparer les données
      const logData = {
        action: 'logger',
        request: 'new_log',
        app_id: this.app_id,
        api_key: this.api_key,
        logLevel: logLevel,
        message: message
      };
      
      if (context) {
        logData.context = typeof context === 'string' ? context : JSON.stringify(context);
      }
      
      // Envoyer avec retry
      const result = await this.makeRequestWithRetry(logData);
      
      // Mise à jour des métriques
      this.metrics.logsSent++;
      this.metrics.logsSuccess++;
      
      this.emit('logSent', { level: logLevel, message, result });
      return result;
      
    } catch (error) {
      this.metrics.logsError++;
      this.emit('logError', { level: logLevel, message, error });
      console.error(`[Logger] Failed to send ${logLevel} log:`, error.message);
      throw error;
    }
  }
  
  /**
   * Méthodes de logging simplifiées
   */
  async logSuccess(message, context = null) {
    return this.sendLog('success', message, context);
  }
  
  async logInfo(message, context = null) {
    return this.sendLog('info', message, context);
  }
  
  async logWarning(message, context = null) {
    return this.sendLog('warning', message, context);
  }
  
  async logError(message, context = null) {
    return this.sendLog('error', message, context);
  }
  
  async logCritical(message, context = null) {
    return this.sendLog('critical', message, context);
  }
  
  /**
   * Envoyer un heartbeat
   */
  async sendHeartbeat() {
    try {
      const data = {
        action: 'logger',
        request: 'heartbeat',
        app_id: this.app_id,
        api_key: this.api_key
      };
      
      const result = await this.makeRequest(data);
      this.metrics.lastHeartbeat = new Date();
      this.isConnected = true;
      this.emit('heartbeat', result);
      return result;
      
    } catch (error) {
      this.isConnected = false;
      this.emit('heartbeatError', error);
      console.error('[Logger] Heartbeat failed:', error.message);
      throw error;
    }
  }
  
  /**
   * Démarrer le heartbeat automatique
   */
  startHeartbeat() {
    if (this.heartbeatTimer) return;
    
    this.heartbeatTimer = setInterval(async () => {
      if (!this.isShuttingDown) {
        try {
          await this.sendHeartbeat();
        } catch (error) {
          // Heartbeat failed, will retry next time
        }
      }
    }, this.options.heartbeatInterval);
    
    console.log('[Logger] Heartbeat started');
  }
  
  /**
   * Arrêter le heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      console.log('[Logger] Heartbeat stopped');
    }
  }
  
  /**
   * Logging en lot
   */
  queueLog(logLevel, message, context = null) {
    if (this.isShuttingDown) return;
    
    this.logQueue.push({ logLevel, message, context, timestamp: Date.now() });
    
    if (this.logQueue.length >= this.options.batchSize) {
      this.flushLogs();
    }
  }
  
  /**
   * Vider la queue de logs
   */
  async flushLogs() {
    if (this.logQueue.length === 0) return;
    
    const logsToSend = this.logQueue.splice(0, this.options.batchSize);
    
    try {
      const promises = logsToSend.map(log => 
        this.sendLog(log.logLevel, log.message, log.context).catch(() => {})
      );
      
      await Promise.allSettled(promises);
      this.emit('batchProcessed', { count: logsToSend.length });
      
    } catch (error) {
      this.emit('batchError', error);
      console.error('[Logger] Batch processing failed:', error.message);
    }
  }
  
  /**
   * Démarrer le traitement en lot
   */
  startBatchProcessing() {
    this.batchTimer = setInterval(() => {
      if (!this.isShuttingDown) {
        this.flushLogs();
      }
    }, this.options.flushInterval);
  }
  
  /**
   * Obtenir les métriques
   */
  getMetrics() {
    return {
      ...this.metrics,
      isConnected: this.isConnected,
      queueSize: this.logQueue.length,
      uptime: Math.round((Date.now() - this.metrics.startTime.getTime()) / 1000),
      isShuttingDown: this.isShuttingDown
    };
  }
  
  /**
   * Configuration de la détection de crash
   */
  setupCrashDetection() {
    // Exceptions non gérées
    process.on('uncaughtException', async (error) => {
      console.error('[Logger] Uncaught Exception:', error.message);
      
      try {
        await this.sendLog('critical', 'Uncaught Exception - Application will exit', {
          error: error.message,
          stack: error.stack,
          pid: process.pid,
          timestamp: new Date().toISOString()
        });
        
        await this.flushLogs();
      } catch (e) {
        console.error('[Logger] Failed to log uncaught exception');
      }
      
      setTimeout(() => process.exit(1), 1000);
    });
    
    // Rejets de promesses non gérés
    process.on('unhandledRejection', async (reason) => {
      console.error('[Logger] Unhandled Promise Rejection:', reason);
      
      try {
        await this.sendLog('critical', 'Unhandled Promise Rejection', {
          reason: reason?.toString() || 'Unknown reason',
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        console.error('[Logger] Failed to log unhandled rejection');
      }
    });
  }
  
  /**
   * Configuration de l'arrêt gracieux
   */
  setupGracefulShutdown() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        if (this.isShuttingDown) {
          process.exit(1);
        }
        
        console.log(`[Logger] Received ${signal}, shutting down gracefully...`);
        await this.shutdown();
        process.exit(0);
      });
    });
  }
  
  /**
   * Requête HTTP avec retry
   */
  async makeRequestWithRetry(data) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
      try {
        return await this.makeRequest(data);
      } catch (error) {
        lastError = error;
        
        if (attempt < this.options.retryAttempts) {
          const delay = this.options.retryDelay * attempt;
          console.warn(`[Logger] Request failed (attempt ${attempt}), retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * Faire une requête HTTP
   */
  async makeRequest(data) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(data);
      const parsedUrl = new URL(this.apiUrl);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'Logger-Simple-NodeJS/6.1.0'
        },
        timeout: this.options.timeout
      };
      
      const req = protocol.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(responseData);
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              if (response.success) {
                resolve(response.data || response);
              } else {
                reject(new Error(response.error || 'API request failed'));
              }
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${response.error || 'Request failed'}`));
            }
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${responseData}`));
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
   * Utilitaire pour attendre
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Arrêt gracieux
   */
  async shutdown() {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    console.log('[Logger] Starting graceful shutdown...');
    
    try {
      // Arrêter les timers
      this.stopHeartbeat();
      if (this.batchTimer) {
        clearInterval(this.batchTimer);
      }
      
      // Vider les logs en attente
      await this.flushLogs();
      
      // Log final
      await this.sendLog('info', 'Logger shutdown completed', {
        totalLogs: this.metrics.logsSent,
        successfulLogs: this.metrics.logsSuccess,
        errors: this.metrics.logsError
      });
      
      this.emit('shutdown', { graceful: true });
      console.log('[Logger] Graceful shutdown completed');
      
    } catch (error) {
      this.emit('shutdown', { graceful: false, error });
      console.error('[Logger] Error during shutdown:', error.message);
    }
  }
  
  /**
   * Obtenir les logs depuis l'API
   */
  async getLogs(filters = {}) {
    const data = {
      action: 'logger',
      request: 'get_logs',
      app_id: this.app_id,
      api_key: this.api_key,
      ...filters
    };
    
    return this.makeRequest(data);
  }
  
  /**
   * Obtenir les statistiques
   */
  async getStats(days = 7) {
    const data = {
      action: 'logger',
      request: 'stats',
      app_id: this.app_id,
      api_key: this.api_key,
      days: days
    };
    
    return this.makeRequest(data);
  }
}

// Export du module
module.exports = { Logger };