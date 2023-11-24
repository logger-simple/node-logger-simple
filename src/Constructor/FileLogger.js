const { formatLogMessage, appendToLogFile } = require('../Functions/FileLoggerFunctions');

class FileLogger {
    constructor(options = {}) {
        if (!options.logFilePath) {
            throw new Error('Please set the "logFilePath" option! (https://github.com/Cut0x/node-logger-simple#usage"')
        }

        this.logFilePath = options.logFilePath+".log";
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