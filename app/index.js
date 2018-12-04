const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
  // parse url
  const parsedUrl = url.parse(req.url, true);

  // get path
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // send response
  res.end('I hear you!\n');

  // log
  console.log('Request received on path ' + trimmedPath);
});

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});
