const fs = require('fs');
const path = require('path');

class Logger {
    constructor(options = {}) {
        this.logFilePath = options.logFilePath+".log" || 'default-log-file.log';

        if (!fs.existsSync(this.logFilePath)) {
            fs.writeFileSync(this.logFilePath, '', { flag: 'wx' });
        }
    }

    logError(errorMessage) {
        const logMessage = this.formatLogMessage('ERROR', errorMessage);
        this.appendToLogFile(logMessage);
    }

    logInfo(infoMessage) {
        const logMessage = this.formatLogMessage('INFO', infoMessage);
        this.appendToLogFile(logMessage);
    }

    logSucces(infoMessage) {
        const logMessage = this.formatLogMessage('SUCCES', infoMessage);
        this.appendToLogFile(logMessage);
    }

    appendToLogFile(logMessage) {
        fs.appendFile(this.logFilePath, logMessage, (err) => {
            if (err) {
                console.error('Error writing to log file:', err);
            }
        });
    }

    formatLogMessage(logLevel, message) {
        const formattedDate = this.getCurrentDateTime();
        return `[${logLevel}] ${formattedDate} ${message}\n`;
    }

    getCurrentDateTime() {
        const now = new Date();
        return now.toISOString().replace(/T/, ' ').replace(/\..+/, '');
    }
}

module.exports = Logger;