/**
 * Logger Simple - Node.js Client Library
 * Complete client library for Logger Simple API
 * Version: 1.0.0
 */

const https = require('https');
const http = require('http');
const querystring = require('querystring');
const { URL } = require('url');

class LoggerSimple {
    constructor(options = {}) {
        this.config = {
            baseUrl: 'https://logger-simple.com/api.php', // Fixed API URL
            appId: options.appId || null,
            apiKey: options.apiKey || null,
            timeout: options.timeout || 10000,
            retries: options.retries || 3,
            userAgent: options.userAgent || 'Logger-Simple-NodeJS/6.1.0',
            exitOnCritical: options.exitOnCritical !== false, // Default: true
            autoExit: options.autoExit !== false, // Default: true
            debug: options.debug !== false // Default: true (show debug messages)
        };

        this.validLevels = ['success', 'info', 'warn', 'error', 'critical'];
        this.autoCatchEnabled = false;
    }

    /**
     * Internal debug logging
     * @private
     */
    _debug(level, message, ...args) {
        if (!this.config.debug) return;
        
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [Logger-Simple] [${level.toUpperCase()}]`;
        
        switch (level) {
            case 'error':
                console.error(`${prefix} ${message}`, ...args);
                break;
            case 'warn':
                console.warn(`${prefix} ${message}`, ...args);
                break;
            case 'info':
            case 'success':
            default:
                console.log(`${prefix} ${message}`, ...args);
                break;
        }
    }

    /**
     * Set application credentials
     * @param {string} appId - Application ID
     * @param {string} apiKey - API Key
     */
    setCredentials(appId, apiKey) {
        this.config.appId = appId;
        this.config.apiKey = apiKey;
        this._debug('info', 'Credentials updated');
    }

    /**
     * Enable or disable debug mode
     * @param {boolean} enabled - Enable debug logging
     */
    setDebug(enabled) {
        this.config.debug = enabled;
        this._debug('info', `Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Make HTTP request to API
     * @private
     */
    async _makeRequest(params, retryCount = 0) {
        return new Promise((resolve, reject) => {
            const url = new URL(this.config.baseUrl);
            const queryParams = querystring.stringify(params);
            const fullUrl = `${url.protocol}//${url.host}${url.pathname}?${queryParams}`;
            
            const requestUrl = new URL(fullUrl);
            const isHttps = requestUrl.protocol === 'https:';
            const client = isHttps ? https : http;
            
            const options = {
                hostname: requestUrl.hostname,
                port: requestUrl.port || (isHttps ? 443 : 80),
                path: `${requestUrl.pathname}${requestUrl.search}`,
                method: 'GET',
                timeout: this.config.timeout,
                headers: {
                    'User-Agent': this.config.userAgent,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            };

            const req = client.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(response);
                        } else {
                            const error = new Error(`HTTP ${res.statusCode}: ${response.error || 'Unknown error'}`);
                            error.statusCode = res.statusCode;
                            error.response = response;
                            reject(error);
                        }
                    } catch (parseError) {
                        reject(new Error(`Invalid JSON response: ${parseError.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                if (retryCount < this.config.retries) {
                    setTimeout(() => {
                        this._makeRequest(params, retryCount + 1)
                            .then(resolve)
                            .catch(reject);
                    }, Math.pow(2, retryCount) * 1000); // Exponential backoff
                } else {
                    const enhancedError = new Error(`Request failed after ${this.config.retries + 1} attempts: ${error.message}`);
                    enhancedError.originalError = error;
                    reject(enhancedError);
                }
            });

            req.on('timeout', () => {
                req.destroy();
                if (retryCount < this.config.retries) {
                    this._makeRequest(params, retryCount + 1)
                        .then(resolve)
                        .catch(reject);
                } else {
                    reject(new Error(`Request timeout after ${this.config.retries + 1} attempts`));
                }
            });

            req.end();
        });
    }

    /**
     * Validate log level
     * @private
     */
    _validateLevel(level) {
        if (!this.validLevels.includes(level)) {
            throw new Error(`Invalid log level: ${level}. Valid levels: ${this.validLevels.join(', ')}`);
        }
    }

    /**
     * Validate app credentials
     * @private
     */
    _validateCredentials() {
        if (!this.config.appId || !this.config.apiKey) {
            throw new Error('App ID and API Key are required. Use setCredentials() or pass them in constructor.');
        }
    }

    // ==================== LOGGING METHODS ====================

    /**
     * Add a log entry
     * @param {string} level - Log level (success, info, warn, error, critical)
     * @param {string} message - Log message
     * @param {Object|string} context - Additional context data
     * @param {string} content - Optional content
     * @param {boolean} exitOnCritical - Exit process on critical (default: from config)
     * @returns {Promise<Object>} API response
     */
    async log(level, message, context = null, content = null, exitOnCritical = null) {
        this._validateCredentials();
        this._validateLevel(level);

        if (!message || typeof message !== 'string') {
            throw new Error('Message is required and must be a string');
        }

        const params = {
            action: 'log',
            app_id: this.config.appId,
            api_key: this.config.apiKey,
            level: level,
            message: message
        };

        if (context !== null) {
            params.context = typeof context === 'object' ? JSON.stringify(context) : String(context);
        }

        if (content !== null) {
            params.content = String(content);
        }

        try {
            const response = await this._makeRequest(params);
            
            // Handle critical logs
            if (level === 'critical') {
                const shouldExit = exitOnCritical !== null ? exitOnCritical : this.config.exitOnCritical;
                
                if (shouldExit) {
                    this._debug('error', `🚨 CRITICAL ERROR LOGGED: ${message}`);
                    this._debug('error', 'Application will exit in 1 second...');
                    
                    // Give time for the log to be sent and processed
                    setTimeout(() => {
                        process.exit(1);
                    }, 1000);
                }
            }
            
            return response;
        } catch (error) {
            // If logging fails for a critical error, still exit if configured to do so
            if (level === 'critical' && (exitOnCritical !== null ? exitOnCritical : this.config.exitOnCritical)) {
                this._debug('error', `🚨 CRITICAL ERROR (logging failed): ${message}`);
                this._debug('error', `Logging error: ${error.message}`);
                this._debug('error', 'Application will exit immediately...');
                process.exit(1);
            }
            throw error;
        }
    }

    /**
     * Log success message
     */
    async success(message, context = null, content = null) {
        return await this.log('success', message, context, content);
    }

    /**
     * Log info message
     */
    async info(message, context = null, content = null) {
        return await this.log('info', message, context, content);
    }

    /**
     * Log warning message
     */
    async warn(message, context = null, content = null) {
        return await this.log('warn', message, context, content);
    }

    /**
     * Log error message
     */
    async error(message, context = null, content = null) {
        return await this.log('error', message, context, content);
    }

    /**
     * Log critical message (triggers email notification)
     */
    async critical(message, context = null, content = null) {
        return await this.log('critical', message, context, content);
    }

    // ==================== DATA RETRIEVAL METHODS ====================

    /**
     * Get logs for the application
     * @param {Object} options - Query options
     * @param {string} options.level - Filter by log level
     * @param {number} options.limit - Maximum number of logs (default: 100, max: 1000)
     * @returns {Promise<Object>} Logs and statistics
     */
    async getLogs(options = {}) {
        this._validateCredentials();

        const params = {
            action: 'logs',
            app_id: this.config.appId,
            limit: options.limit || 100
        };

        if (options.level) {
            this._validateLevel(options.level);
            params.level = options.level;
        }

        return await this._makeRequest(params);
    }

    /**
     * Get log statistics
     * @param {number} days - Number of days to analyze (default: 7, max: 30)
     * @returns {Promise<Object>} Detailed statistics
     */
    async getLogStats(days = 7) {
        this._validateCredentials();

        const params = {
            action: 'log_stats',
            app_id: this.config.appId,
            days: Math.min(days, 30)
        };

        return await this._makeRequest(params);
    }

    /**
     * Get general platform statistics (public endpoint)
     * @returns {Promise<Object>} Platform statistics
     */
    async getStats() {
        const params = { action: 'stats' };
        return await this._makeRequest(params);
    }

    /**
     * Get applications list
     * @param {string} userId - Optional user ID filter
     * @returns {Promise<Object>} Applications list
     */
    async getApps(userId = null) {
        const params = { action: 'apps' };
        if (userId) {
            params.user_id = userId;
        }
        return await this._makeRequest(params);
    }

    // ==================== HELP CENTER METHODS ====================

    /**
     * Get help center posts
     * @param {Object} options - Query options
     * @param {string} options.categoryId - Filter by category
     * @param {number} options.limit - Maximum posts (default: 20, max: 100)
     * @returns {Promise<Object>} Posts list
     */
    async getPosts(options = {}) {
        const params = {
            action: 'posts',
            limit: options.limit || 20
        };

        if (options.categoryId) {
            params.category_id = options.categoryId;
        }

        return await this._makeRequest(params);
    }

    /**
     * Get specific post with replies
     * @param {string|number} postId - Post ID
     * @returns {Promise<Object>} Post details with replies
     */
    async getPost(postId) {
        if (!postId) {
            throw new Error('Post ID is required');
        }

        const params = {
            action: 'post',
            id: postId
        };

        return await this._makeRequest(params);
    }

    /**
     * Get error tips
     * @param {number} limit - Maximum tips (default: 20, max: 100)
     * @returns {Promise<Object>} Tips list
     */
    async getTips(limit = 20) {
        const params = {
            action: 'tips',
            limit: Math.min(limit, 100)
        };

        return await this._makeRequest(params);
    }

    /**
     * Search error tips
     * @param {string} query - Search query
     * @param {number} limit - Maximum results (default: 10, max: 50)
     * @returns {Promise<Object>} Search results
     */
    async searchTips(query, limit = 10) {
        if (!query || typeof query !== 'string') {
            throw new Error('Search query is required and must be a string');
        }

        const params = {
            action: 'search_tips',
            q: query,
            limit: Math.min(limit, 50)
        };

        return await this._makeRequest(params);
    }

    // ==================== ADMIN METHODS (requires master key) ====================

    /**
     * Get users list (admin only)
     * @param {string} masterKey - Master API key
     * @param {number} limit - Maximum users (default: 50, max: 200)
     * @returns {Promise<Object>} Users list
     */
    async getUsers(masterKey, limit = 50) {
        if (!masterKey) {
            throw new Error('Master key is required for admin operations');
        }

        const params = {
            action: 'users',
            api_key: masterKey,
            limit: Math.min(limit, 200)
        };

        return await this._makeRequest(params);
    }

    /**
     * Create new user (admin only)
     * @param {string} masterKey - Master API key
     * @param {Object} userData - User data
     * @param {string} userData.username - Username
     * @param {string} userData.email - Email
     * @param {string} userData.password - Password
     * @param {string} userData.role - User role (default: 'user')
     * @returns {Promise<Object>} Created user info
     */
    async createUser(masterKey, userData) {
        if (!masterKey) {
            throw new Error('Master key is required for admin operations');
        }

        if (!userData.username || !userData.email || !userData.password) {
            throw new Error('Username, email, and password are required');
        }

        const params = {
            action: 'create_user',
            api_key: masterKey,
            username: userData.username,
            email: userData.email,
            password: userData.password,
            role: userData.role || 'user'
        };

        return await this._makeRequest(params);
    }

    /**
     * Create new application (admin only)
     * @param {string} masterKey - Master API key
     * @param {Object} appData - Application data
     * @param {string} appData.name - Application name
     * @param {string} appData.userId - Owner user ID
     * @param {string} appData.description - Optional description
     * @returns {Promise<Object>} Created app info with credentials
     */
    async createApp(masterKey, appData) {
        if (!masterKey) {
            throw new Error('Master key is required for admin operations');
        }

        if (!appData.name || !appData.userId) {
            throw new Error('Application name and user ID are required');
        }

        const params = {
            action: 'create_app',
            api_key: masterKey,
            name: appData.name,
            user_id: appData.userId
        };

        if (appData.description) {
            params.description = appData.description;
        }

        return await this._makeRequest(params);
    }

    /**
     * Get specific user (admin only)
     * @param {string} masterKey - Master API key
     * @param {string|number} userId - User ID
     * @returns {Promise<Object>} User details
     */
    async getUser(masterKey, userId) {
        if (!masterKey) {
            throw new Error('Master key is required for admin operations');
        }
        if (!userId) {
            throw new Error('User ID is required');
        }

        const params = {
            action: 'user',
            api_key: masterKey,
            id: userId
        };

        return await this._makeRequest(params);
    }

    /**
     * Update user (admin only)
     * @param {string} masterKey - Master API key
     * @param {string|number} userId - User ID
     * @param {Object} updateData - Data to update
     * @param {string} updateData.username - New username
     * @param {string} updateData.email - New email
     * @param {string} updateData.role - New role
     * @returns {Promise<Object>} Update result
     */
    async updateUser(masterKey, userId, updateData) {
        if (!masterKey) {
            throw new Error('Master key is required for admin operations');
        }
        if (!userId) {
            throw new Error('User ID is required');
        }
        if (!updateData || Object.keys(updateData).length === 0) {
            throw new Error('Update data is required');
        }

        const params = {
            action: 'update_user',
            api_key: masterKey,
            id: userId,
            ...updateData
        };

        return await this._makeRequest(params);
    }

    /**
     * Delete/deactivate user (admin only)
     * @param {string} masterKey - Master API key
     * @param {string|number} userId - User ID
     * @returns {Promise<Object>} Delete result
     */
    async deleteUser(masterKey, userId) {
        if (!masterKey) {
            throw new Error('Master key is required for admin operations');
        }
        if (!userId) {
            throw new Error('User ID is required');
        }

        const params = {
            action: 'delete_user',
            api_key: masterKey,
            id: userId
        };

        return await this._makeRequest(params);
    }

    /**
     * Update application (admin only)
     * @param {string} masterKey - Master API key
     * @param {string|number} appId - Application ID
     * @param {Object} updateData - Data to update
     * @param {string} updateData.name - New name
     * @param {string} updateData.description - New description
     * @param {boolean} updateData.is_active - Active status
     * @returns {Promise<Object>} Update result
     */
    async updateApp(masterKey, appId, updateData) {
        if (!masterKey) {
            throw new Error('Master key is required for admin operations');
        }
        if (!appId) {
            throw new Error('App ID is required');
        }
        if (!updateData || Object.keys(updateData).length === 0) {
            throw new Error('Update data is required');
        }

        const params = {
            action: 'update_app',
            api_key: masterKey,
            id: appId,
            ...updateData
        };

        return await this._makeRequest(params);
    }

    /**
     * Delete/deactivate application (admin only)
     * @param {string} masterKey - Master API key
     * @param {string|number} appId - Application ID
     * @returns {Promise<Object>} Delete result
     */
    async deleteApp(masterKey, appId) {
        if (!masterKey) {
            throw new Error('Master key is required for admin operations');
        }
        if (!appId) {
            throw new Error('App ID is required');
        }

        const params = {
            action: 'delete_app',
            api_key: masterKey,
            id: appId
        };

        return await this._makeRequest(params);
    }

    /**
     * Create new post (requires auth)
     * @param {string} apiKey - API key or master key
     * @param {Object} postData - Post data
     * @param {string|number} postData.userId - User ID
     * @param {string|number} postData.categoryId - Category ID
     * @param {string} postData.title - Post title
     * @param {string} postData.content - Post content
     * @returns {Promise<Object>} Created post info
     */
    async createPost(apiKey, postData) {
        if (!apiKey) {
            throw new Error('API key is required');
        }
        if (!postData.userId || !postData.categoryId || !postData.title || !postData.content) {
            throw new Error('User ID, category ID, title, and content are required');
        }

        const params = {
            action: 'create_post',
            api_key: apiKey,
            user_id: postData.userId,
            category_id: postData.categoryId,
            title: postData.title,
            content: postData.content
        };

        return await this._makeRequest(params);
    }

    /**
     * Reply to post (requires auth)
     * @param {string} apiKey - API key or master key
     * @param {Object} replyData - Reply data
     * @param {string|number} replyData.postId - Post ID
     * @param {string|number} replyData.userId - User ID
     * @param {string} replyData.content - Reply content
     * @param {boolean} replyData.isSolution - Mark as solution (default: false)
     * @returns {Promise<Object>} Created reply info
     */
    async replyPost(apiKey, replyData) {
        if (!apiKey) {
            throw new Error('API key is required');
        }
        if (!replyData.postId || !replyData.userId || !replyData.content) {
            throw new Error('Post ID, user ID, and content are required');
        }

        const params = {
            action: 'reply_post',
            api_key: apiKey,
            post_id: replyData.postId,
            user_id: replyData.userId,
            content: replyData.content,
            is_solution: replyData.isSolution ? 1 : 0
        };

        return await this._makeRequest(params);
    }

    /**
     * Get admin logs (admin only)
     * @param {string} masterKey - Master API key
     * @param {number} limit - Maximum logs (default: 50, max: 200)
     * @returns {Promise<Object>} Admin logs
     */
    async getAdminLogs(masterKey, limit = 50) {
        if (!masterKey) {
            throw new Error('Master key is required for admin operations');
        }

        const params = {
            action: 'admin_logs',
            api_key: masterKey,
            limit: Math.min(limit, 200)
        };

        return await this._makeRequest(params);
    }

    /**
     * Update system setting (admin only)
     * @param {string} masterKey - Master API key
     * @param {string} key - Setting key
     * @param {string} value - Setting value
     * @returns {Promise<Object>} Update result
     */
    async updateSetting(masterKey, key, value) {
        if (!masterKey) {
            throw new Error('Master key is required for admin operations');
        }
        if (!key || value === undefined || value === null) {
            throw new Error('Setting key and value are required');
        }

        const params = {
            action: 'update_setting',
            api_key: masterKey,
            key: key,
            value: String(value)
        };

        return await this._makeRequest(params);
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Test connection to Logger Simple API
     * @returns {Promise<boolean>} Connection status
     */
    async testConnection() {
        try {
            const response = await this.getStats();
            return response.success === true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Comprehensive health check
     * @returns {Promise<Object>} Detailed health information
     */
    async healthCheck() {
        const health = {
            timestamp: new Date().toISOString(),
            api_connection: false,
            app_authenticated: false,
            response_time: null,
            error: null
        };

        try {
            const start = Date.now();
            
            // Test basic API connection
            const statsResponse = await this.getStats();
            health.api_connection = statsResponse.success === true;
            health.response_time = Date.now() - start;

            // Test app authentication if credentials are set
            if (this.config.appId && this.config.apiKey) {
                try {
                    await this.info('Health check - Connection test', { 
                        timestamp: health.timestamp,
                        source: 'health_check'
                    });
                    health.app_authenticated = true;
                } catch (authError) {
                    health.app_authenticated = false;
                    health.auth_error = authError.message;
                }
            }

        } catch (error) {
            health.error = error.message;
        }

        return health;
    }

    /**
     * Get valid log levels
     * @returns {Array<string>} Valid log levels
     */
    getValidLevels() {
        return [...this.validLevels];
    }

    /**
     * Get current configuration (sanitized)
     * @returns {Object} Current configuration without sensitive data
     */
    getConfig() {
        return {
            baseUrl: this.config.baseUrl,
            appId: this.config.appId ? '***' + this.config.appId.slice(-4) : null,
            apiKey: this.config.apiKey ? '***' + this.config.apiKey.slice(-4) : null,
            timeout: this.config.timeout,
            retries: this.config.retries,
            userAgent: this.config.userAgent,
            exitOnCritical: this.config.exitOnCritical,
            autoExit: this.config.autoExit,
            debug: this.config.debug,
            autoCatchEnabled: this.autoCatchEnabled
        };
    }

    /**
     * Force exit application with critical log
     * @param {string} message - Exit message
     * @param {Object} context - Additional context
     */
    async forceExit(message, context = null) {
        this._debug('error', `🚨 FORCE EXIT: ${message}`);
        
        try {
            await this.critical(message, {
                forced_exit: true,
                timestamp: new Date().toISOString(),
                pid: process.pid,
                memory: process.memoryUsage(),
                uptime: process.uptime(),
                ...context
            }, null, false);
        } catch (error) {
            this._debug('error', 'Failed to log force exit:', error.message);
        }
        
        this._debug('error', 'Application will exit immediately...');
        process.exit(1);
    }

    /**
     * Graceful shutdown with logging
     * @param {string} reason - Shutdown reason
     * @param {number} exitCode - Exit code (default: 0)
     */
    async gracefulShutdown(reason = 'Graceful shutdown requested', exitCode = 0) {
        this._debug('info', `🔄 GRACEFUL SHUTDOWN: ${reason}`);
        
        try {
            await this.info(`Application shutting down: ${reason}`, {
                graceful_shutdown: true,
                exit_code: exitCode,
                timestamp: new Date().toISOString(),
                pid: process.pid,
                uptime: process.uptime()
            });
        } catch (error) {
            this._debug('error', 'Failed to log graceful shutdown:', error.message);
        }
        
        this._debug('info', 'Shutdown complete.');
        process.exit(exitCode);
    }

    /**
     * Create performance monitor wrapper
     * @param {string} operationName - Name of the operation to monitor
     * @returns {Object} Performance monitor with start/end methods
     */
    createPerformanceMonitor(operationName) {
        let startTime;
        let startMemory;
        
        return {
            start: () => {
                startTime = process.hrtime.bigint();
                startMemory = process.memoryUsage();
            },
            
            end: async (level = 'info', additionalContext = {}) => {
                if (!startTime) {
                    throw new Error('Performance monitor not started');
                }
                
                const endTime = process.hrtime.bigint();
                const endMemory = process.memoryUsage();
                const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
                
                const context = {
                    operation: operationName,
                    duration_ms: Math.round(duration * 100) / 100,
                    memory_delta: {
                        rss: endMemory.rss - startMemory.rss,
                        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                        external: endMemory.external - startMemory.external
                    },
                    final_memory: endMemory,
                    ...additionalContext
                };
                
                await this.log(level, `Performance: ${operationName} completed`, context);
                
                return {
                    duration: duration,
                    memoryDelta: context.memory_delta
                };
            }
        };
    }

    /**
     * Log with automatic performance timing
     * @param {Function} operation - Async operation to monitor
     * @param {string} operationName - Name for logging
     * @param {string} level - Log level (default: 'info')
     * @returns {Promise<any>} Operation result
     */
    async timeOperation(operation, operationName, level = 'info') {
        const monitor = this.createPerformanceMonitor(operationName);
        monitor.start();
        
        try {
            const result = await operation();
            await monitor.end(level, { success: true });
            return result;
        } catch (error) {
            await monitor.end('error', { 
                success: false, 
                error: error.message,
                stack: error.stack 
            });
            throw error;
        }
    }

    /**
     * Enable/disable automatic error catching
     * @param {boolean} enabled - Enable automatic error catching
     * @param {boolean} exitOnError - Exit process on caught errors (default: true)
     */
    enableAutoCatch(enabled = true, exitOnError = true) {
        if (enabled && !this.autoCatchEnabled) {
            // Catch unhandled exceptions
            process.on('uncaughtException', async (error) => {
                this._debug('error', '🚨 UNCAUGHT EXCEPTION DETECTED:', error.message);
                
                try {
                    await this.critical('Uncaught Exception - Application will exit', {
                        error: error.message,
                        stack: error.stack,
                        timestamp: new Date().toISOString(),
                        pid: process.pid,
                        memory: process.memoryUsage(),
                        uptime: process.uptime()
                    }, null, false); // Don't auto-exit from this call
                } catch (logError) {
                    this._debug('error', 'Failed to log uncaught exception:', logError.message);
                }
                
                if (exitOnError) {
                    this._debug('error', 'Process will exit now...');
                    process.exit(1);
                }
            });

            // Catch unhandled promise rejections
            process.on('unhandledRejection', async (reason, promise) => {
                this._debug('error', '🚨 UNHANDLED PROMISE REJECTION DETECTED:', reason);
                
                try {
                    await this.critical('Unhandled Promise Rejection', {
                        reason: reason instanceof Error ? reason.message : String(reason),
                        stack: reason instanceof Error ? reason.stack : undefined,
                        timestamp: new Date().toISOString(),
                        pid: process.pid,
                        memory: process.memoryUsage(),
                        uptime: process.uptime()
                    }, null, false); // Don't auto-exit from this call
                } catch (logError) {
                    this._debug('error', 'Failed to log unhandled rejection:', logError.message);
                }
                
                if (exitOnError) {
                    this._debug('error', 'Process will exit now...');
                    process.exit(1);
                }
            });

            // Catch SIGTERM
            process.on('SIGTERM', async () => {
                this._debug('info', 'SIGTERM received, shutting down gracefully...');
                try {
                    await this.info('Application received SIGTERM - Graceful shutdown', {
                        timestamp: new Date().toISOString(),
                        pid: process.pid,
                        uptime: process.uptime()
                    });
                } catch (logError) {
                    this._debug('error', 'Failed to log SIGTERM:', logError.message);
                }
                process.exit(0);
            });

            // Catch SIGINT (Ctrl+C)
            process.on('SIGINT', async () => {
                this._debug('info', 'SIGINT received, shutting down gracefully...');
                try {
                    await this.info('Application received SIGINT - Graceful shutdown', {
                        timestamp: new Date().toISOString(),
                        pid: process.pid,
                        uptime: process.uptime()
                    });
                } catch (logError) {
                    this._debug('error', 'Failed to log SIGINT:', logError.message);
                }
                process.exit(0);
            });

            this.autoCatchEnabled = true;
            this._debug('success', '🛡️ Logger Simple auto-catch enabled - all errors will be logged and may cause process exit');
        } else if (!enabled && this.autoCatchEnabled) {
            // Remove listeners (Note: this removes ALL listeners, be careful in complex apps)
            process.removeAllListeners('uncaughtException');
            process.removeAllListeners('unhandledRejection');
            process.removeAllListeners('SIGTERM');
            process.removeAllListeners('SIGINT');
            this.autoCatchEnabled = false;
            this._debug('warn', '🚫 Logger Simple auto-catch disabled');
        }
    }

    /**
     * Create a context-aware logger for specific module/function
     * @param {string} contextName - Context name (e.g., 'UserService', 'DatabaseManager')
     * @returns {Object} Context logger with all log methods
     */
    context(contextName) {
        const self = this;
        
        return {
            success: (message, context = null, content = null) => 
                self.success(message, { context: contextName, ...context }, content),
                
            info: (message, context = null, content = null) => 
                self.info(message, { context: contextName, ...context }, content),
                
            warn: (message, context = null, content = null) => 
                self.warn(message, { context: contextName, ...context }, content),
                
            error: (message, context = null, content = null) => 
                self.error(message, { context: contextName, ...context }, content),
                
            critical: (message, context = null, content = null) => 
                self.critical(message, { context: contextName, ...context }, content),
                
            log: (level, message, context = null, content = null) => 
                self.log(level, message, { context: contextName, ...context }, content),

            // Performance monitoring for this context
            timeOperation: (operation, operationName, level = 'info') => 
                self.timeOperation(operation, `${contextName}::${operationName}`, level),

            // Force exit with context
            forceExit: (message, context = null) => 
                self.forceExit(`[${contextName}] ${message}`, { context: contextName, ...context }),

            // Create sub-context
            subContext: (subName) => self.context(`${contextName}::${subName}`)
        };
    }

    /**
     * Create a batch logger for multiple operations
     * @param {number} maxBatchSize - Maximum number of logs to batch (default: 10)
     * @param {number} maxWaitTime - Maximum time to wait before sending batch in ms (default: 5000)
     * @returns {Object} Batch logger
     */
    createBatchLogger(maxBatchSize = 10, maxWaitTime = 5000) {
        const batch = [];
        let batchTimer = null;
        const self = this;

        const processBatch = async () => {
            if (batch.length === 0) return;

            const currentBatch = batch.splice(0, batch.length);
            
            try {
                // Send all logs in parallel
                await Promise.all(currentBatch.map(logData => 
                    self.log(logData.level, logData.message, logData.context, logData.content)
                ));
            } catch (error) {
                console.error('Batch logging failed:', error.message);
                // Re-add failed logs to batch for retry (optional)
            }

            if (batchTimer) {
                clearTimeout(batchTimer);
                batchTimer = null;
            }
        };

        return {
            add: (level, message, context = null, content = null) => {
                batch.push({ level, message, context, content });

                if (batch.length >= maxBatchSize) {
                    processBatch();
                } else if (!batchTimer) {
                    batchTimer = setTimeout(processBatch, maxWaitTime);
                }
            },

            flush: () => processBatch(),

            size: () => batch.length
        };
    }

    /**
     * Initialize Logger Simple with startup logging
     * @param {string} appName - Application name
     * @param {string} version - Application version
     * @param {Object} additionalInfo - Additional startup information
     */
    async initialize(appName, version, additionalInfo = {}) {
        const startupInfo = {
            app_name: appName,
            app_version: version,
            node_version: process.version,
            platform: process.platform,
            arch: process.arch,
            pid: process.pid,
            startup_time: new Date().toISOString(),
            memory: process.memoryUsage(),
            debug_mode: this.config.debug,
            ...additionalInfo
        };

        try {
            await this.success(`🚀 ${appName} v${version} started successfully`, startupInfo);
            this._debug('success', `✅ Logger Simple initialized for ${appName} v${version}`);
            return true;
        } catch (error) {
            this._debug('error', '❌ Failed to initialize Logger Simple:', error.message);
            return false;
        }
    }

    /**
     * Get debug status
     * @returns {boolean} Current debug status
     */
    isDebugEnabled() {
        return this.config.debug;
    }
}

module.exports = { Logger };