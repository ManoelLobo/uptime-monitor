const http = require('http');
const url = require('url');
const stringDecoder = require('string_decoder').StringDecoder;

const server = http.createServer((req, res) => {
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
        : router.notFound;

    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: buffer,
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
});

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});

// Handlers
const handlers = {};

handlers.test = (data, cb) => {
  // callback: HTTP status + payload
  cb(406, { name: 'test handler' });
};

handlers.notFound = (data, cb) => {
  cb(404);
};

// Request router
const router = {
  test: handlers.test,
  notFound: handlers.notFound,
};
