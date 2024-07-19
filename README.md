# Logger Module
A simple <a href="https://nodejs.org/en" target="_blank"><strong>Node.Js</strong></a> module with configurable options.

# 📥 Installation
```bash
npm install node-logger-simple
```

# ✏️ Usage
```js
const { FileLogger } = require('node-logger-simple');

// personalised file is required
const logger = new FileLogger({
  logFilePath: "my-log-file"
});

logger.logError('An error has occurred.');
logger.logInfo('Important information.');
logger.logSucces('Succes message.')
```

# 📣 Options
Initialize the Logger with the following options:
- `logFilePath` : Allows you to choose the file name.

# 📜 Methods
- `logError('An error has occurred.')` - Logs an error message to the configured log file.
- `logSucces('Succes message.')` - Logs an succes message to the configured log file.
- `logInfo('Important information.')` - Logs an info message to the configured log file.
