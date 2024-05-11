const Service = require('node-windows').Service;
const svc = new Service({
  name: 'OSDnD Bot',
  description: 'OSDnD Discord bot service for DMTools.',
  script: 'D:\\dev\\DMTools\\bot.js'
});
svc.on('install', () => {
  svc.start();
});
svc.install();