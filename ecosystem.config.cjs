module.exports = {
  apps: [
    {
      name: "claw-temple",
      script: "server-simple.mjs",
      cwd: "/home/dp420/.openclaw/workspace/claw-temple",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOST: "0.0.0.0",
        DRAGONFLY_HOST: "127.0.0.1"
      },
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: 5000,
      kill_timeout: 5000,
      listen_timeout: 3000
    }
  ]
};