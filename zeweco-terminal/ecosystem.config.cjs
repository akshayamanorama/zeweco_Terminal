// PM2 ecosystem file for Zeweco Terminal (used on VPS deploy)
module.exports = {
  apps: [{
    name: 'zeweco-terminal',
    cwd: '/var/www/zeweco-terminal/server',
    script: 'dist/src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
  }],
};
