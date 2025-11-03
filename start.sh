#!/bin/bash

# Startup script for Internship Tracker
# This script handles full setup and startup including:
# - Virtual environment creation/activation
# - Git submodule initialization
# - Dependency installation
# - Data parsing and database population (on first run)
# - Backend server startup

set -e  # Exit on error

echo "🚀 Internship Tracker Setup & Startup"
echo "======================================"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -q -r backend/requirements.txt

# Check and initialize git submodule if needed
echo "📚 Checking git submodule status..."
SUBMODULE_STATUS=$(git submodule status data/internships 2>/dev/null | cut -c1)

if [ "$SUBMODULE_STATUS" = "-" ] || [ "$SUBMODULE_STATUS" = "+" ]; then
    echo "⚠️  Git submodule not initialized or out of date"
    echo "🔄 Initializing git submodule..."
    git submodule update --init --recursive --depth 1
    echo "✅ Submodule initialized"
elif [ ! -d "data/internships" ] || [ -z "$(ls -A data/internships 2>/dev/null)" ]; then
    echo "⚠️  Submodule directory missing or empty"
    echo "🔄 Initializing git submodule..."
    git submodule update --init --recursive --depth 1
    echo "✅ Submodule initialized"
else
    echo "✅ Submodule already initialized"
fi

# Check if database exists, if not, run setup
if [ ! -f "data.db" ]; then
    echo ""
    echo "🗄️  Database not found - running first-time setup"
    echo "======================================"
    
    # Create parsed directory if it doesn't exist
    mkdir -p data/parsed
    
    # Run parser
    echo "📊 Parsing internship data..."
    python3 data/parser/parse_internships.py > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ CSV files generated"
    else
        echo "❌ Parser failed - check data/internships submodule"
        exit 1
    fi
    
    # Populate database
    echo "💾 Populating database..."
    python3 update_db.py
    echo "✅ Database populated"
    echo ""
else
    echo "✅ Database exists - skipping initial setup"
fi

# Check if resumes directory exists
if [ ! -d "resumes" ]; then
    echo "📁 Creating resumes directory..."
    mkdir -p resumes
fi

# Start the backend server
echo ""
echo "🔥 Starting backend server on http://localhost:8000"
echo "======================================"
echo "Press Ctrl+C to stop"
echo ""

cd backend
python main.py
