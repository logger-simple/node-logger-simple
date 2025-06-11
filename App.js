const axios = require('axios');
const EventEmitter = require('events');

/**
 * Logger Simple - Module Node.js amélioré
 * Version 2.0 avec plus de fonctionnalités et de robustesse
 */
class Logger extends EventEmitter {
  constructor({ app_id, api_key, apiUrl, options = {} }) {
    super();
    
    if (!app_id || !api_key) {
      throw new Error("app_id and api_key are required.");
    }
    
    // Configuration principale
    this.app_id = app_id;
    this.api_key = api_key;
    this.apiUrl = apiUrl || "http://localhost/api.logger-simple/api.php";
    
    // Options avancées
    this.options = {
      autoHeartbeat: options.autoHeartbeat !== false,
      heartbeatInterval: options.heartbeatInterval || 300000, // 5 minutes
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      timeout: options.timeout || 30000,
      enableCrashLogging: options.enableCrashLogging !== false,
      enableMetrics: options.enableMetrics !== false,
      maxLogLength: options.maxLogLength || 10000,
      batchSize: options.batchSize || 100,
      flushInterval: options.flushInterval || 5000,
      ...options
    };
    
    // État interne
    this.heartbeatIntervalId = null;
    this.isConnected = false;
    this.logQueue = [];
    this.batchTimer = null;
    this.metrics = {
      logsSent: 0,
      logsSuccess: 0,
      logsError: 0,
      lastHeartbeat: null,
      connectionErrors: 0,
      averageResponseTime: 0
    };
    
    // Configuration d'axios
    this.httpClient = axios.create({
      timeout: this.options.timeout,
      headers: {
        'User-Agent': 'Logger-Simple-NodeJS/2.0',
        'Content-Type': 'application/json'
      }
    });
    
    // Initialisation
    this.init();
  }
  
  /**
   * Initialisation du logger
   */
  async init() {
    try {
      // Test de connexion initial
      await this.testConnection();
      
      // Démarrer le heartbeat automatique
      if (this.options.autoHeartbeat) {
        this.startHeartbeat();
      }
      
      // Configurer la gestion d'erreurs
      if (this.options.enableCrashLogging) {
        this.setupCrashLogging();
      }
      
      // Démarrer le batch processing
      this.startBatchProcessing();
      
      this.emit('ready');
      console.log(`[Logger] Initialized successfully for app: ${this.app_id}`);
      
    } catch (error) {
      this.emit('error', error);
      console.error('[Logger] Initialization failed:', error.message);
    }
  }
  
  /**
   * Test de connexion à l'API
   */
  async testConnection() {
    try {
      const response = await this.makeRequest('health', {}, 'GET');
      this.isConnected = true;
      this.metrics.connectionErrors = 0;
      this.emit('connected');
      return response;
    } catch (error) {
      this.isConnected = false;
      this.metrics.connectionErrors++;
      this.emit('disconnected', error);
      throw error;
    }
  }
  
  /**
   * Envoyer un log avec gestion des erreurs et retry
   */
  async sendLog(logLevel, message, context = null, options = {}) {
    const startTime = Date.now();
    
    try {
      // Validation
      if (!['success', 'info', 'warning', 'error', 'critical'].includes(logLevel)) {
        throw new Error(`Invalid log level: ${logLevel}`);
      }
      
      if (typeof message !== 'string' || message.length === 0) {
        throw new Error('Message must be a non-empty string');
      }
      
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
      
      // Métriques
      this.metrics.logsSent++;
      this.metrics.logsSuccess++;
      this.updateAverageResponseTime(Date.now() - startTime);
      
      this.emit('logSent', { level: logLevel, message, result });
      return result;
      
    } catch (error) {
      this.metrics.logsError++;
      this.emit('logError', { level: logLevel, message, error });
      
      if (options.throwOnError !== false) {
        throw error;
      }
      
      console.error(`[Logger] Failed to send ${logLevel} log:`, error.message);
      return null;
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
   * Logging en batch (pour les gros volumes)
   */
  queueLog(logLevel, message, context = null) {
    this.logQueue.push({ logLevel, message, context, timestamp: Date.now() });
    
    if (this.logQueue.length >= this.options.batchSize) {
      this.flushLogs();
    }
  }
  
  async flushLogs() {
    if (this.logQueue.length === 0) return;
    
    const logsToSend = this.logQueue.splice(0, this.options.batchSize);
    
    try {
      const promises = logsToSend.map(log => 
        this.sendLog(log.logLevel, log.message, log.context, { throwOnError: false })
      );
      
      await Promise.allSettled(promises);
      this.emit('batchProcessed', { count: logsToSend.length });
      
    } catch (error) {
      this.emit('batchError', error);
      console.error('[Logger] Batch processing failed:', error.message);
    }
  }
  
  /**
   * Heartbeat amélioré
   */
  async sendHeartbeat() {
    try {
      const data = {
        action: 'logger',
        request: 'heartbeat',
        app_id: this.app_id,
        api_key: this.api_key
      };
      
      const result = await this.makeRequest('heartbeat', data);
      this.metrics.lastHeartbeat = new Date();
      this.isConnected = true;
      this.emit('heartbeat', result);
      
      return result;
      
    } catch (error) {
      this.isConnected = false;
      this.emit('heartbeatError', error);
      throw error;
    }
  }
  
  /**
   * Démarrer le heartbeat automatique
   */
  startHeartbeat() {
    if (this.heartbeatIntervalId) {
      return;
    }
    
    this.heartbeatIntervalId = setInterval(async () => {
      try {
        await this.sendHeartbeat();
      } catch (error) {
        console.error('[Logger] Heartbeat failed:', error.message);
      }
    }, this.options.heartbeatInterval);
    
    console.log(`[Logger] Heartbeat started (interval: ${this.options.heartbeatInterval}ms)`);
  }
  
  /**
   * Arrêter le heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
      console.log('[Logger] Heartbeat stopped');
    }
  }
  
  /**
   * Démarrer le traitement en batch
   */
  startBatchProcessing() {
    this.batchTimer = setInterval(() => {
      this.flushLogs();
    }, this.options.flushInterval);
  }
  
  /**
   * Récupérer les logs
   */
  async getLogs(filters = {}) {
    const data = {
      action: 'logger',
      request: 'get_logs',
      app_id: this.app_id,
      api_key: this.api_key,
      ...filters
    };
    
    return this.makeRequest('get_logs', data);
  }
  
  /**
   * Récupérer les statistiques
   */
  async getStats(days = 7) {
    const data = {
      action: 'logger',
      request: 'stats',
      app_id: this.app_id,
      api_key: this.api_key,
      days: days
    };
    
    return this.makeRequest('stats', data);
  }
  
  /**
   * Obtenir les métriques locales
   */
  getMetrics() {
    return {
      ...this.metrics,
      isConnected: this.isConnected,
      queueSize: this.logQueue.length,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }
  
  /**
   * Configuration de la gestion d'erreurs
   */
  setupCrashLogging() {
    // Exceptions non capturées
    process.on('uncaughtException', async (error) => {
      try {
        await this.logCritical('Uncaught Exception', {
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        console.error('[Logger] Failed to log uncaught exception:', e.message);
      }
      
      // Attendre un peu pour que le log soit envoyé
      setTimeout(() => process.exit(1), 1000);
    });
    
    // Rejets de promesses non gérés
    process.on('unhandledRejection', async (reason, promise) => {
      try {
        await this.logCritical('Unhandled Promise Rejection', {
          reason: reason?.toString() || 'Unknown reason',
          promise: promise?.toString() || 'Unknown promise',
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        console.error('[Logger] Failed to log unhandled rejection:', e.message);
      }
    });
    
    // Signaux de terminaison
    ['SIGTERM', 'SIGINT', 'SIGUSR2'].forEach(signal => {
      process.on(signal, async () => {
        try {
          await this.logInfo(`Process terminating with signal: ${signal}`);
          await this.shutdown();
        } catch (e) {
          console.error('[Logger] Error during shutdown:', e.message);
        }
        process.exit(0);
      });
    });
  }
  
  /**
   * Requête HTTP avec retry
   */
  async makeRequestWithRetry(data, method = 'POST') {
    let lastError;
    
    for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
      try {
        return await this.makeRequest(data.request, data, method);
      } catch (error) {
        lastError = error;
        
        if (attempt < this.options.retryAttempts) {
          const delay = this.options.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.warn(`[Logger] Request failed (attempt ${attempt}), retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * Requête HTTP de base
   */
  async makeRequest(endpoint, data, method = 'POST') {
    const startTime = Date.now();
    
    try {
      let response;
      
      if (method === 'GET') {
        const params = new URLSearchParams(data);
        response = await this.httpClient.get(`${this.apiUrl}?${params}`);
      } else {
        response = await this.httpClient.post(this.apiUrl, data);
      }
      
      this.updateAverageResponseTime(Date.now() - startTime);
      
      if (response.data?.success) {
        return response.data.data || response.data;
      } else {
        throw new Error(response.data?.error || 'API request failed');
      }
      
    } catch (error) {
      if (error.response) {
        throw new Error(`HTTP ${error.response.status}: ${error.response.data?.error || error.message}`);
      } else if (error.request) {
        throw new Error('Network error: No response received');
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Utilitaires
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  updateAverageResponseTime(responseTime) {
    if (this.metrics.averageResponseTime === 0) {
      this.metrics.averageResponseTime = responseTime;
    } else {
      this.metrics.averageResponseTime = (this.metrics.averageResponseTime + responseTime) / 2;
    }
  }
  
  /**
   * Arrêt propre
   */
  async shutdown() {
    console.log('[Logger] Shutting down...');
    
    // Arrêter les timers
    this.stopHeartbeat();
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    // Vider la queue
    await this.flushLogs();
    
    this.emit('shutdown');
    console.log('[Logger] Shutdown complete');
  }
  
  /**
   * Factory method pour créer une instance facilement
   */
  static create(app_id, api_key, apiUrl, options = {}) {
    return new Logger({ app_id, api_key, apiUrl, options });
  }
}

module.exports = { Logger };