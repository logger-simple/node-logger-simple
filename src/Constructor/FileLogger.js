const { formatLogMessage, appendToLogFile } = require('../Functions/FileLoggerFunctions');

class FileLogger {
    constructor(options = {}) {
        this.logFilePath = options.logFilePath+".log" || 'default-log-file.log';
    }

    logError(errorMessage) {
        const logMessage = formatLogMessage('ERROR', errorMessage);
        appendToLogFile(this.logFilePath, logMessage);
    }

    logInfo(infoMessage) {
        const logMessage = formatLogMessage('INFO', infoMessage);
        appendToLogFile(this.logFilePath, logMessage);
    }

    logSucces(succesMessage) {
        const logMessage = formatLogMessage('SUCCES', succesMessage);
        appendToLogFile(this.logFilePath, logMessage);
    }
}

module.exports = { FileLogger };