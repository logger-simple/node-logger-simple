const axios = require('axios');

class Logger {
  constructor({ app_id, api_key, apiUrl }) {
    if (!app_id || !api_key) {
      throw new Error("app_id and api_key are required.");
    }
    this.app_id = app_id;
    this.api_key = api_key;
    this.apiUrl = apiUrl || "https://api.valloic.dev/";
  }

  async sendLog(logLevel, message) {
    const url = `${this.apiUrl}?action=logger&request=new_log&app_id=${encodeURIComponent(this.app_id)}&api_key=${encodeURIComponent(this.api_key)}&logLevel=${encodeURIComponent(logLevel)}&message=${encodeURIComponent(message)}`;
    try {
      const response = await axios.get(url);
      if (response.data && response.data.success) {
        return response.data.log;
      } else {
        throw new Error(response.data.error || "Unknown error");
      }
    } catch (error) {
      console.error(`Error sending ${logLevel} log:`, error.response ? error.response.data : error.message);
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
}

module.exports = { Logger };
