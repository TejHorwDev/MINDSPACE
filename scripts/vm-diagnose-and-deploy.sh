#!/usr/bin/env bash
# MINDSPACE — VM Resource Diagnosis & Production Deployment Script
set -e

echo "=========================================================="
echo "  MINDSPACE — Performance & Resource Diagnosis Tool       "
echo "=========================================================="

echo ""
echo "1. System Memory & Swap:"
free -h || vm_stat || true

echo ""
echo "2. CPU Load & Core Count:"
uptime
nproc 2>/dev/null && echo "CPU Cores: $(nproc)" || true

echo ""
echo "3. Disk Usage:"
df -h /

echo ""
echo "4. Docker Container Resource Stats:"
if command -v docker &> /dev/null; then
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}" || echo "No running containers"
else
    echo "Docker not installed on this host"
fi

echo ""
echo "5. PM2 Cluster Status:"
if command -v pm2 &> /dev/null; then
    pm2 status || true
else
    echo "PM2 not installed globally (run: npm install -g pm2)"
fi

echo ""
echo "6. Checking for accidental 'next dev' processes:"
DEV_PROCS=$(pgrep -f "next dev" || true)
if [ -n "$DEV_PROCS" ]; then
    echo "  [WARNING] Detected 'next dev' running (PID: $DEV_PROCS)! Dev mode causes severe lag and high CPU/RAM."
    echo "  -> To fix: stop the dev process and run production mode via PM2:"
    echo "     pm2 start ecosystem.config.js --env production"
else
    echo "  [OK] No 'next dev' processes detected."
fi

echo ""
echo "=========================================================="
echo "  Production Build & Launch Command:                      "
echo "  npm run build && pm2 reload ecosystem.config.js         "
echo "=========================================================="
