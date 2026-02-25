module.exports = {
  apps: [
    {
      name: 'swjtu-monitor',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: '/opt/swjtu-monitor',
      env: { NODE_ENV: 'production' },
      // 崩溃自动重启
      autorestart: true,
      max_restarts: 10,
    },
  ],
}
