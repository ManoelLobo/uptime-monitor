const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
  // parse url
  const parsedUrl = url.parse(req.url, true);

  // get path
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // get method
  const method = req.method.toLowerCase();

  // send response
  res.end('I hear you!\n');

  // log
  console.log(
    `Request received on path < ${trimmedPath} > with method < ${method} >`,
  );
});

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});
