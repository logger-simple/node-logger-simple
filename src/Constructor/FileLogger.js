const { formatLogMessage, appendToLogFile } = require('../Functions/FileLoggerFunctions');

class FileLogger {
    constructor(options = {}) {
        this.logFilePath = options.logFilePath+".log" || 'default-log-file.log';
    }

    logError(errorMessage) {
        const file = this.logFilePath;

        const logMessage = formatLogMessage('ERROR', errorMessage);
        appendToLogFile(file, logMessage);
    }

    logInfo(infoMessage) {
        const file = this.logFilePath;
        
        const logMessage = formatLogMessage('INFO', infoMessage);
        appendToLogFile(file, logMessage);
    }

    logSucces(succesMessage) {
        const file = this.logFilePath;
        
        const logMessage = formatLogMessage('SUCCES', succesMessage);
        appendToLogFile(file, logMessage);
    }
}

module.exports = { FileLogger };