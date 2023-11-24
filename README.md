# Logger Module
A simple <a href="https://nodejs.org/en" target="_blank"><strong>Node.Js</strong></a> module with configurable options.

# Installation
```bash
npm install node-logger-simple
```

# Usage
```js
const { FileLogger } = require('node-logger-simple');

// With personalised file
const logger = new Logger({
  logFilePath: "my-log-file"
});

// With default file
const logger = new Logger();

logger.logError('An error has occurred.');
logger.logInfo('Important information.');
logger.logSucces('Succes message.')
```

# Options
Initialize the Logger with the following options:
- `logFilePath` (optional): The path to the log file. Default is 'default-log-file.log'.

# Methods
- `logError('An error has occurred.')` - Logs an error message to the configured log file.
- `logSucces('Succes message.')` - Logs an succes message to the configured log file.
- `logInfo('Important information.')` - Logs an info message to the configured log file.
