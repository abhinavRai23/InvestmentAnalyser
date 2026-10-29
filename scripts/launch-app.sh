#!/bin/bash

# Navigate to project workspace directory
PROJECT_DIR="/Users/abhinavrai/Developer/InvestmentAnalyser"
PORT=3850
URL="http://localhost:${PORT}"

cd "$PROJECT_DIR" || exit 1

# Check if server is already running on port 3850
if lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚡ Investment Analyser server is already running on port ${PORT}."
else
    # Smart change detection: Check if source code or data files were modified since last build
    if [ ! -f ".next/BUILD_ID" ] || [ -n "$(find src data package.json -newer .next/BUILD_ID 2>/dev/null)" ]; then
        echo "📦 Code or data changes detected! Building fresh production bundle..."
        npm run build
    else
        echo "✅ Production build is up-to-date."
    fi
    
    echo "🚀 Starting optimized Production server on port ${PORT}..."
    nohup npm run start > /tmp/investment_analyser_prod.log 2>&1 &
    
    # Wait until server responds on port 3850
    for i in {1..30}; do
        if lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1 ; then
            echo "✅ Production server started successfully!"
            break
        fi
        sleep 0.5
    done
fi

# Open default browser
echo "🌐 Opening Investment Analyser in browser..."
open "$URL"

exit 0
