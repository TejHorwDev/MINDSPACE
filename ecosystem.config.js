/**
 * PM2 Ecosystem Configuration for MINDSPACE Production Deployment
 * Runs Next.js in cluster mode with one worker process per CPU core.
 */
module.exports = {
  apps: [
    {
      name: "mindspace-web",
      script: ".next/standalone/server.js",
      instances: "max", // Automatically scales to all available CPU cores
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "1G", // Auto-restart if a worker leaks memory
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      exp_backoff_restart_delay: 100,
      listen_timeout: 10000,
      kill_timeout: 5000,
      merge_logs: true,
      time: true,
    },
  ],
};
