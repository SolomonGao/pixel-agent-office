#!/bin/bash
# Auto-start script for Pixel Office Server
# Kills any process using port 3001 before starting

PORT=3001

echo "Checking port $PORT..."

# Find and kill process using the port
PID=$(lsof -ti:$PORT 2>/dev/null || netstat -tlnp 2>/dev/null | grep ":$PORT " | awk '{print $7}' | cut -d'/' -f1)

if [ -n "$PID" ]; then
    echo "Killing orphaned process on port $PORT (PID: $PID)"
    kill -9 $PID 2>/dev/null || true
    sleep 0.5
fi

# Check if port is still occupied
if lsof -ti:$PORT >/dev/null 2>&1; then
    echo "WARNING: Port $PORT is still occupied after cleanup"
else
    echo "Port $PORT is free, starting server..."
fi

# Start the server
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/index.js"
