# Logger Module
A simple <a href="https://nodejs.org/en" target="_blank"><strong>Node.Js</strong></a> module with configurable options.

# 📥 Installation
```bash
npm install node-logger-simple
```

[x] Head to [nodels.valloic.dev](https://nodels.valloic.dev/) to retrieve the required information, and to view the logs.

# ✏️ Usage
```js
const { Logger } = require('node-logger-simple');

const logger = new Logger({
  app_id: 'app_CODE', // https://panel.node-ls.app/app.php
  api_key: 'API_KEY', // https://panel.node-ls.app/app.php
});

async function runTests() {
  try {
    await logger.logInfo("Info test from test.js");

    await logger.logError("Error test from test.js");

    await logger.logSucces("Success test from test.js");
  } catch (err) {
    console.error("An error occurred during the tests:", err);
  }
}

runTests();

// Or just
logger.logSucces("Success test from test.js");
```

# 📣 Options
Initialize the Logger with the following options:
- `app_id` : Your application ID *(required)*.
- `api_key`: Your application key *(required)*.

# 📜 Methods
- `logError('An error has occurred.')` - Logs an error message to the configured log file.
- `logSucces('Succes message.')` - Logs an succes message to the configured log file.
- `logInfo('Important information.')` - Logs an info message to the configured log file.
