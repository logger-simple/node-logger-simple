const fs = require("fs");

function appendToLogFile(logFilePath, logMessage) {
    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) {
            throw new Error(`Error writing to log file : ${err}`);
        }
    });
}

function formatLogMessage(logLevel, message) {
    const formattedDate = getCurrentDateTime();
    return `[${logLevel}] ${formattedDate} ${message}\n`;
}

function getCurrentDateTime() {
    const now = new Date();
    return now.toISOString().replace(/T/, ' ').replace(/\..+/, '');
}

module.exports = {
    formatLogMessage,
    appendToLogFile
};