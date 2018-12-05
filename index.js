const http = require('http');
const https = require('https');
const url = require('url');
const stringDecoder = require('string_decoder').StringDecoder;
const fs = require('fs');
const config = require('./lib/config');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

// http server config & start
const httpServer = http.createServer((req, res) => {
  unifiedServer(req, res);
});

httpServer.listen(config.httpPort, () => {
  console.log(`Server listening on port ${config.httpPort}`);
});

// https server config & start
const httpsOptions = {
  key: fs.readFileSync('./https/key.pem'),
  cert: fs.readFileSync('./https/cert.pem'),
};
const httpsServer = https.createServer(httpsOptions, (req, res) => {
  unifiedServer(req, res);
});

httpsServer.listen(config.httpsPort, () => {
  console.log(`Server listening on port ${config.httpsPort}`);
});

// Shared server logic
const unifiedServer = (req, res) => {
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
      typeof router[trimmedPath] !== 'undefined'
        ? router[trimmedPath]
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

      // log
      console.log('Response:', statusCode, payloadString);
    });
  });
};

// Request router
const router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
};
