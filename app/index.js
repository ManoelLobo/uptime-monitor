const http = require('http');
const url = require('url');

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

  // send response
  res.end('I hear you!\n');

  // log
  console.log('Request headers:', headers);
});

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});
