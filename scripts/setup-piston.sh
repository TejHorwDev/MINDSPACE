#!/usr/bin/env bash
# MINDSPACE — Piston Setup & Language Package Installer for Oracle VM
set -e

echo "=========================================================="
echo "  MINDSPACE — Setting up isolated Piston execution engine "
echo "=========================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Spin up Piston container
echo "1. Starting Piston container via docker-compose.piston.yml..."
docker compose -f docker-compose.piston.yml up -d

echo "2. Waiting for Piston API to become ready on port 2000..."
until curl -s http://localhost:2000/api/v2/runtimes > /dev/null; do
    echo "   Waiting for Piston service..."
    sleep 2
done

echo "3. Installing core language runtimes inside Piston container..."
# Using piston-cli inside the container to install common language runtimes
LANGUAGES=("python" "gcc" "mono" "java" "node" "go" "rust")

for lang in "${LANGUAGES[@]}"; do
    echo "   -> Installing $lang..."
    docker exec mindspace-piston piston-cli install "$lang" || true
done

echo ""
echo "4. Checking installed runtimes:"
curl -s http://localhost:2000/api/v2/runtimes | grep -o '"language":"[^"]*"' | sort -u || true

echo ""
echo "=========================================================="
echo "  Piston Sandbox Ready at http://localhost:2000/api/v2   "
echo "  Execution timeout: 10s | Output limit: 64KB             "
echo "=========================================================="
