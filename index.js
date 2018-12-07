const server = require('./lib/server');

const app = {};

app.init = () => {
  // start server
  server.init();
  // start workers
  // @TODO
};

// execute
app.init();

module.exports = app;
