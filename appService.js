const Service = require('node-windows').Service;
const svc = new Service({
  name: 'DMTools App',
  description: 'DMTools node app',
  script: 'D:\\dev\\DMTools\\app.js'
});
svc.on('install', () => {
  svc.start();
});
svc.install();