# Logger Module
A simple <a href="" target=""><strong>Node.Js</strong></a> module with configurable options.

# Installation
```bash
npm install logger
```

# Usage
```js
const Logger = require('logger');

const options = {
  logFilePath: 'my-log-file.log'
};

const logger = new Logger(options);

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