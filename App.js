const axios = require('axios');

class Logger {
  constructor({ app_id, api_key }) {
    if (!app_id || !api_key) {
      throw new Error("app_id and api_key are required.");
    }
    this.app_id = app_id;
    this.api_key = api_key;
    this.apiUrl = "https://api.node-ls.app/";
    this.heartbeatIntervalId = null;
    this.startOnlineStatusCheck(5000);
    this.setupCrashLogging();
  }

  async sendLog(logLevel, message) {
    const url = `${this.apiUrl}?action=logger&request=new_log&app_id=${encodeURIComponent(this.app_id)}&api_key=${encodeURIComponent(this.api_key)}&logLevel=${encodeURIComponent(logLevel)}&message=${encodeURIComponent(message)}`;
    try {
      const response = await axios.get(url);
      if (response.data && response.data.success) {
        return response.data.log;
      } else {
        throw new Error(response.data && response.data.error 
          ? response.data.error 
          : "API response error: " + JSON.stringify(response.data));
      }
    } catch (error) {
      throw error;
    }
  }

  logSuccess(message) {
    return this.sendLog("success", message);
  }

  logInfo(message) {
    return this.sendLog("info", message);
  }

  logError(message) {
    return this.sendLog("error", message);
  }

  logCritical(message) {
    return this.sendLog("critical", message);
  }

  startOnlineStatusCheck(interval = 5000) {
    if (this.heartbeatIntervalId) {
      return;
    }
    this.heartbeatIntervalId = setInterval(() => {
      this.sendHeartbeat().catch(err => {
      });
    }, interval);
  }

  async sendHeartbeat() {
    const url = `${this.apiUrl}?action=logger&request=heartbeat&app_id=${encodeURIComponent(this.app_id)}&api_key=${encodeURIComponent(this.api_key)}`;
    try {
      const response = await axios.get(url);
      if (response.data && response.data.success) {
        return response.data;
      } else {
        throw new Error(response.data && response.data.error 
          ? response.data.error 
          : "API response error (heartbeat): " + JSON.stringify(response.data));
      }
    } catch (error) {
      throw error;
    }
  }

  stopOnlineStatusCheck() {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  setupCrashLogging() {
    process.on('uncaughtException', async (err) => {
      try {
        await this.logCritical("CRITICAL : Uncaught Exception - " + err.stack);
      } catch (e) {
        console.error("Failed to log critical error:", e);
      }
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      try {
        await this.logCritical("CRITICAL : Unhandled Rejection - " + reason);
      } catch (e) {
        console.error("Failed to log critical error:", e);
      }
      process.exit(1);
    });
  }
}

module.exports = { Logger };
