const { formatLogMessage, appendToLogFile } = require('../Functions/FileLoggerFunctions');

class FileLogger {
    constructor(options = {}) {
        this.logFilePath = options.logFilePath+".log" || 'default-log-file.log';
    }

    file = this.logFilePath;

    logError(errorMessage) {
        const logMessage = formatLogMessage('ERROR', errorMessage);
        appendToLogFile(file, logMessage);
    }

    logInfo(infoMessage) {
        const logMessage = formatLogMessage('INFO', infoMessage);
        appendToLogFile(file, logMessage);
    }

    logSucces(succesMessage) {
        const logMessage = formatLogMessage('SUCCES', succesMessage);
        appendToLogFile(file, logMessage);
    }
}

module.exports = { FileLogger };