const net = require('net');

const client = new net.Socket();
client.connect(5000, '127.0.0.1', () => {
  console.log('Successfully connected to port 5000!');
  client.destroy();
});
client.on('error', (err) => {
  console.error('Failed to connect to port 5000:', err.message);
});
