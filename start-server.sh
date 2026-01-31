#!/bin/bash

# Simple HTTP server starter script
# Choose one of the options below

echo "Starting HTTP server..."
echo "Server will be available at http://localhost:8000"
echo "Press Ctrl+C to stop"
echo ""

# Option 1: Python 3 (most common, usually pre-installed)
python3 -m http.server 8000

# Option 2: Node.js (if you have it installed)
# npx http-server -p 8000

# Option 3: PHP (if you have it installed)
# php -S localhost:8000
