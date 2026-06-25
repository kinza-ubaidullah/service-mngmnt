// cPanel: Setup Node.js App > Run JS script > select this file > Run
try { require('dotenv').config(); } catch (_) {}
require('./ensure-prisma.js')();
console.log('Done! Click RESTART on Node.js app, then try login again.');
