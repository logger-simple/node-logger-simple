const https = require('https');
const http = require('http');
const os = require('os');
const crypto = require('crypto');
const { URL } = require('url');

class Logger {
    constructor(config = {}) {
        // Configuration par défaut
        this.config = {
            api_key: config.api_key || null,
            app_id: config.app_id || null,
            endpoint: config.endpoint || 'localhost:8080',
            protocol: config.protocol || 'http', // http ou https
            path: config.path || '/api/logs',
            timeout: config.timeout || 5000,
            retries: config.retries || 3,
            batchSize: config.batchSize || 10,
            flushInterval: config.flushInterval || 2000,
            enableBatching: config.enableBatching !== false,
            enableMetrics: config.enableMetrics !== false,
            silent: config.silent || false,
            local: config.local !== false // Par défaut en mode local
        };

        // Validation des paramètres requis
        if (!this.config.api_key || !this.config.app_id) {
            throw new Error('API key and App ID are required');
        }

        // Système de batch pour optimiser les performances
        this.logQueue = [];
        this.isProcessing = false;
        this.metrics = {
            sent: 0,
            failed: 0,
            queued: 0,
            totalRequests: 0,
            averageResponseTime: 0
        };

        // Informations système (collectées une seule fois)
        this.systemInfo = this._collectSystemInfo();

        // Démarrage du processus de flush automatique
        if (this.config.enableBatching) {
            this._startBatchProcessor();
        }

        // Gestion propre de l'arrêt
        process.on('SIGINT', () => this._gracefulShutdown());
        process.on('SIGTERM', () => this._gracefulShutdown());

        // Log de connexion
        if (!this.config.silent) {
            console.log(`[Logger] Connected to ${this.config.protocol}://${this.config.endpoint}${this.config.path}`);
        }
    }

    /**
     * Log d'information
     */
    async logInfo(message, metadata = {}) {
        return this._log('info', message, metadata);
    }

    /**
     * Log d'erreur
     */
    async logError(message, metadata = {}) {
        return this._log('error', message, metadata);
    }

    /**
     * Log de succès
     */
    async logSuccess(message, metadata = {}) {
        return this._log('success', message, metadata);
    }

    /**
     * Log de debug
     */
    async logDebug(message, metadata = {}) {
        return this._log('debug', message, metadata);
    }

    /**
     * Log de warning
     */
    async logWarn(message, metadata = {}) {
        return this._log('warn', message, metadata);
    }

    /**
     * Méthode principale de logging
     */
    async _log(level, message, metadata = {}) {
        try {
            const logEntry = this._createLogEntry(level, message, metadata);

            if (this.config.enableBatching) {
                this._addToQueue(logEntry);
                return Promise.resolve();
            } else {
                return this._sendLog(logEntry);
            }
        } catch (error) {
            if (!this.config.silent) {
                console.error('[Logger] Error creating log entry:', error.message);
            }
            throw error;
        }
    }

    /**
     * Création d'une entrée de log structurée
     */
    _createLogEntry(level, message, metadata) {
        const timestamp = new Date().toISOString();
        const id = this._generateId();

        return {
            id,
            timestamp,
            level: level.toLowerCase(),
            message: String(message),
            metadata: this._sanitizeMetadata(metadata),
            system: this.systemInfo,
            app_id: this.config.app_id,
            version: '2.0.0'
        };
    }

    /**
     * Ajout à la queue de batch
     */
    _addToQueue(logEntry) {
        this.logQueue.push(logEntry);
        this.metrics.queued++;

        // Force le flush si la queue est pleine
        if (this.logQueue.length >= this.config.batchSize) {
            this._flushQueue();
        }
    }

    /**
     * Processeur de batch automatique
     */
    _startBatchProcessor() {
        this.batchInterval = setInterval(() => {
            if (this.logQueue.length > 0 && !this.isProcessing) {
                this._flushQueue();
            }
        }, this.config.flushInterval);
    }

    /**
     * Flush de la queue
     */
    async _flushQueue() {
        if (this.isProcessing || this.logQueue.length === 0) {
            return;
        }

        this.isProcessing = true;
        const batch = this.logQueue.splice(0, this.config.batchSize);

        try {
            await this._sendBatch(batch);
            this.metrics.sent += batch.length;
            this.metrics.queued -= batch.length;
        } catch (error) {
            this.metrics.failed += batch.length;
            this.metrics.queued -= batch.length;
            
            if (!this.config.silent) {
                console.error('[Logger] Failed to send batch:', error.message);
            }
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Envoi d'un batch de logs
     */
    async _sendBatch(batch) {
        const payload = {
            lang: 'nodejs',
            app_id: this.config.app_id,
            api_key: this.config.api_key,
            batch: true,
            logs: batch,
            count: batch.length
        };

        return this._makeRequest(payload);
    }

    /**
     * Envoi d'un log unique
     */
    async _sendLog(logEntry) {
        const payload = {
            lang: 'nodejs',
            app_id: this.config.app_id,
            api_key: this.config.api_key,
            batch: false,
            ...logEntry
        };

        try {
            await this._makeRequest(payload);
            this.metrics.sent++;
        } catch (error) {
            this.metrics.failed++;
            throw error;
        }
    }

    /**
     * Requête HTTP vers l'API
     */
    _makeRequest(payload, retryCount = 0) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const postData = JSON.stringify(payload);
            
            // Parse de l'endpoint
            const url = new URL(`${this.config.protocol}://${this.config.endpoint}${this.config.path}`);
            
            const options = {
                hostname: url.hostname,
                port: url.port || (this.config.protocol === 'https' ? 443 : 80),
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'User-Agent': `logger-simple-nodejs/2.0.0`,
                    'X-API-Key': this.config.api_key,
                    'X-App-ID': this.config.app_id
                },
                timeout: this.config.timeout
            };

            // Choix du module HTTP
            const httpModule = this.config.protocol === 'https' ? https : http;

            const req = httpModule.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    const responseTime = Date.now() - startTime;
                    this._updateMetrics(responseTime);

                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const response = JSON.parse(data || '{}');
                            resolve(response);
                        } catch (e) {
                            resolve({ success: true });
                        }
                    } else {
                        const error = new Error(`HTTP ${res.statusCode}: ${data}`);
                        error.statusCode = res.statusCode;
                        reject(error);
                    }
                });
            });

            req.on('error', (error) => {
                if (retryCount < this.config.retries) {
                    setTimeout(() => {
                        this._makeRequest(payload, retryCount + 1)
                            .then(resolve)
                            .catch(reject);
                    }, Math.pow(2, retryCount) * 1000); // Exponential backoff
                } else {
                    reject(error);
                }
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
     * Collecte des informations système
     */
    _collectSystemInfo() {
        return {
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version,
            pid: process.pid,
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            cpus: os.cpus().length,
            loadavg: os.loadavg()
        };
    }

    /**
     * Génération d'ID unique
     */
    _generateId() {
        return crypto.randomBytes(16).toString('hex');
    }

    /**
     * Nettoyage des métadonnées
     */
    _sanitizeMetadata(metadata) {
        try {
            // Supprime les fonctions et autres objets non sérialisables
            return JSON.parse(JSON.stringify(metadata));
        } catch (error) {
            return { error: 'Failed to serialize metadata' };
        }
    }

    /**
     * Mise à jour des métriques
     */
    _updateMetrics(responseTime) {
        this.metrics.totalRequests++;
        this.metrics.averageResponseTime = 
            (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) 
            / this.metrics.totalRequests;
    }

    /**
     * Arrêt propre
     */
    async _gracefulShutdown() {
        console.log('[Logger] Graceful shutdown initiated...');
        
        // Arrêt du batch processor
        if (this.batchInterval) {
            clearInterval(this.batchInterval);
        }
        
        // Flush de la queue restante
        if (this.logQueue.length > 0) {
            await this._flushQueue();
        }
        
        console.log('[Logger] All logs flushed. Goodbye!');
    }

    /**
     * Obtenir les métriques
     */
    getMetrics() {
        return {
            ...this.metrics,
            queueSize: this.logQueue.length,
            uptime: process.uptime(),
            config: {
                endpoint: `${this.config.protocol}://${this.config.endpoint}${this.config.path}`,
                batchSize: this.config.batchSize,
                flushInterval: this.config.flushInterval,
                enableBatching: this.config.enableBatching
            }
        };
    }

    /**
     * Flush manuel
     */
    async flush() {
        return this._flushQueue();
    }

    /**
     * Test de connexion
     */
    async testConnection() {
        try {
            await this.logInfo('Connection test', { test: true });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Obtenir les logs depuis l'API
     */
    async getLogs(options = {}) {
        const params = new URLSearchParams({
            page: options.page || 1,
            limit: options.limit || 50,
            ...(options.level && { level: options.level }),
            ...(options.from && { from: options.from }),
            ...(options.to && { to: options.to }),
            ...(options.search && { search: options.search })
        });

        const url = new URL(`${this.config.protocol}://${this.config.endpoint}${this.config.path}?${params}`);

        return new Promise((resolve, reject) => {
            const httpModule = this.config.protocol === 'https' ? https : http;
            
            const options = {
                hostname: url.hostname,
                port: url.port || (this.config.protocol === 'https' ? 443 : 80),
                path: url.pathname + url.search,
                method: 'GET',
                headers: {
                    'X-API-Key': this.config.api_key,
                    'X-App-ID': this.config.app_id
                }
            };

            const req = httpModule.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Invalid JSON response'));
                    }
                });
            });

            req.on('error', reject);
            req.end();
        });
    }

    /**
     * Supprimer des logs
     */
    async deleteLogs(options = {}) {
        let params = '';
        if (options.logId) {
            params = `?log_id=${options.logId}`;
        } else if (options.olderThan) {
            params = `?older_than=${options.olderThan}`;
        }

        const url = new URL(`${this.config.protocol}://${this.config.endpoint}${this.config.path}${params}`);

        return new Promise((resolve, reject) => {
            const httpModule = this.config.protocol === 'https' ? https : http;
            
            const options = {
                hostname: url.hostname,
                port: url.port || (this.config.protocol === 'https' ? 443 : 80),
                path: url.pathname + url.search,
                method: 'DELETE',
                headers: {
                    'X-API-Key': this.config.api_key,
                    'X-App-ID': this.config.app_id
                }
            };

            const req = httpModule.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Invalid JSON response'));
                    }
                });
            });

            req.on('error', reject);
            req.end();
        });
    }
}

// Classe helper pour la configuration rapide
class QuickLogger {
    /**
     * Configuration locale rapide
     */
    static local(appId, apiKey, options = {}) {
        return new Logger({
            app_id: appId,
            api_key: apiKey,
            endpoint: options.endpoint || 'localhost:8080',
            protocol: 'http',
            ...options
        });
    }

    /**
     * Configuration cloud rapide
     */
    static cloud(appId, apiKey, options = {}) {
        return new Logger({
            app_id: appId,
            api_key: apiKey,
            endpoint: options.endpoint || 'api.logger-simple.com',
            protocol: 'https',
            ...options
        });
    }
}

// Export des classes
module.exports = { Logger, QuickLogger };

// Exemple d'utilisation complète si le fichier est exécuté directement
if (require.main === module) {
    console.log('🚀 Logger Simple - Example Usage\n');

    // Configuration pour API locale
    const logger = QuickLogger.local('app_demo123456789', 'lsk_demo123456789abcdef123456789abcdef12345678', {
        enableBatching: true,
        batchSize: 5,
        flushInterval: 3000
    });

    async function runExamples() {
        try {
            console.log('📡 Testing connection...');
            const connected = await logger.testConnection();
            console.log(`Connection: ${connected ? '✅ Success' : '❌ Failed'}\n`);

            console.log('📝 Sending various log levels...');
            await logger.logInfo('Application started', { version: '1.0.0', environment: 'development' });
            await logger.logDebug('Debug information', { component: 'auth', action: 'login' });
            await logger.logWarn('High memory usage', { memory: '85%', threshold: '80%' });
            await logger.logError('Database connection failed', { error: 'Connection timeout', retry: 3 });
            await logger.logSuccess('User authenticated', { userId: 12345, method: 'oauth' });

            console.log('📊 Sending batch logs...');
            for (let i = 0; i < 12; i++) {
                await logger.logInfo(`Batch message ${i + 1}`, { 
                    batchTest: true, 
                    messageId: i + 1,
                    timestamp: new Date().toISOString()
                });
            }

            // Attendre que tous les logs soient envoyés
            setTimeout(async () => {
                await logger.flush();
                
                console.log('\n📈 Current metrics:');
                console.log(JSON.stringify(logger.getMetrics(), null, 2));

                console.log('\n📋 Retrieving recent logs...');
                try {
                    const logs = await logger.getLogs({ limit: 5 });
                    console.log('Recent logs:', JSON.stringify(logs, null, 2));
                } catch (error) {
                    console.log('❌ Failed to retrieve logs:', error.message);
                }

                console.log('\n✅ Example completed!');
            }, 5000);

        } catch (error) {
            console.error('❌ Error in example:', error.message);
        }
    }

    runExamples();
}