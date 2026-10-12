// scripts/start.js
// Production startup runner for MindSpace standalone server on Render/Docker
process.env.NODE_ENV = 'production';
process.env.HOSTNAME = '0.0.0.0';

const path = require('path');
const serverPath = path.resolve(__dirname, '..', '.next', 'standalone', 'server.js');

console.log(`[MINDSPACE] Launching production server on 0.0.0.0:${process.env.PORT || 3000}...`);
require(serverPath);
