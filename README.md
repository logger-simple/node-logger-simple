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
<ul>
    `logFilePath` (optional): The path to the log file. Default is 'default-log-file.log'.
</ul>

# Methods
<ul>
    <li>`logError` - Logs an error message to the configured log file.</li>
    <li>`logSucces` - Logs an succes message to the configured log file.</li>
    <li>`logInfo` - Logs an info message to the configured log file.</li>
</ul>