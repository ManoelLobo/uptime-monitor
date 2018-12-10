const http = require('http');
const https = require('https');
const url = require('url');
const stringDecoder = require('string_decoder').StringDecoder;
const fs = require('fs');
const path = require('path');
const util = require('util');
const config = require('./config');
const handlers = require('./handlers');
const helpers = require('./helpers');

// Only show console msg if started with NODE_DEBUG=server
const debug = util.debuglog('server');

const server = {};

// http server config
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});

// https server config
server.httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem')),
};

server.httpsServer = https.createServer(server.httpsOptions, (req, res) => {
  server.unifiedServer(req, res);
});

// Shared server logic
server.unifiedServer = (req, res) => {
  // parse url
  const parsedUrl = url.parse(req.url, true);

  // get path
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // get query string (object)
  const queryStringObject = parsedUrl.query;

  // get method
  const method = req.method.toLowerCase();

  // get headers (object)
  const headers = req.headers;

  // get payload
  const decoder = new stringDecoder('utf-8');
  let buffer = '';
  req.on('data', data => (buffer += decoder.write(data)));
  req.on('end', () => {
    buffer += decoder.end();

    // handle request
    const chosenHandler =
      typeof server.router[trimmedPath] !== 'undefined'
        ? server.router[trimmedPath]
        : handlers.notFound;

    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer),
    };

    // route request
    chosenHandler(data, (statusCode, payload) => {
      statusCode = typeof statusCode === 'number' ? statusCode : 200;
      payload = typeof payload === 'object' ? payload : {};

      const payloadString = JSON.stringify(payload);

      // send response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      // log conditionaly on statusCode
      if (statusCode === 200) {
        debug(
          '\x1b[32m%s\x1b[0m',
          `${method.toUpperCase()} /${trimmedPath} ${statusCode}`,
        );
      } else {
        debug(
          '\x1b[31m%s\x1b[0m',
          `${method.toUpperCase()} /${trimmedPath} ${statusCode}`,
        );
      }
    });
  });
};

// Request router
server.router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks,
};

server.init = () => {
  // http server start
  server.httpServer.listen(config.httpPort, () => {
    // console log formatting
    console.log(
      '\x1b[34m%s\x1b[0m',
      `Server listening on port ${config.httpsPort}`,
    );
  });

  // https server start
  server.httpsServer.listen(config.httpsPort, () => {
    // console log formatting
    console.log(
      '\x1b[35m%s\x1b[0m',
      `Server listening on port ${config.httpsPort}`,
    );
  });
};

module.exports = server;
