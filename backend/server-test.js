// Minimal test — NO npm packages. cPanel startup: server-test.js
const http = require('http');
const PORT = Number(process.env.PORT) || 5000;

const server = http.createServer((req, res) => {
  const body = JSON.stringify({
    status: 'ok',
    message: 'Bare Node test works',
    path: req.url,
    mode: 'server-test-v2',
    port: PORT,
    time: new Date().toISOString(),
  });
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(body);
});

server.listen(PORT, () => {
  console.log('server-test-v2 listening on port', PORT);
});

module.exports = server;
