#!/bin/bash

# Startup script for Internship Tracker
# This script handles full setup and startup including:
# - Virtual environment creation/activation
# - Git submodule initialization
# - Dependency installation
# - Data parsing and database population (on first run)
# - Backend server startup

set -e  # Exit on error

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "Shutting down servers..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    echo "Servers stopped"
    exit 0
}

# Set up signal handlers for Ctrl+C
trap cleanup SIGINT SIGTERM

echo "Internship Tracker Setup & Startup"
echo "======================================"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -q -r backend/requirements.txt

# Check and initialize git submodule if needed
echo "Checking git submodule status..."
if [ ! -d "data/internships" ] || [ -z "$(ls -A data/internships 2>/dev/null)" ]; then
    echo "Submodule directory missing or empty"
    echo "Cloning git submodule..."
    git clone --init submodule --depth 1
    echo "Submodule cloned"
else
    echo "Submodule already exists, pulling latest changes..."
    cd data/internships
    git pull origin dev
    cd ../..
    echo "Submodule updated"
fi

# Check if database exists, if not, run setup
if [ ! -f "data.db" ]; then
    echo ""
    echo "Database not found - running first-time setup"
    echo "======================================"

    # Create parsed directory if it doesn't exist
    mkdir -p data/parsed

    # Run parser
    echo "Parsing internship data..."
    python3 data/parser/parse_internships.py > /dev/null
    if [ $? -eq 0 ]; then
        echo "CSV files generated"
    else
        echo "Parser failed - check data/internships submodule"
        exit 1
    fi

    # Populate database
    echo "Populating database..."
    python3 update_db.py
    echo "Database populated"
    echo ""
else
    echo "Database exists - skipping initial setup"
fi

# Check if resumes directory exists
if [ ! -d "resumes" ]; then
    echo "Creating resumes directory..."
    mkdir -p resumes
fi

# Start the backend server
echo ""
echo "Starting backend server on http://localhost:8000"
echo "======================================"

cd backend
python main.py &
BACKEND_PID=$!

# Start frontend server
echo "Starting frontend server on http://localhost:5173"
cd ../frontend
python3 -m http.server 5173 &
FRONTEND_PID=$!

echo ""
echo "DONE - Go to http://localhost:5173 in your browser"
echo ""
echo "Server logs:"
echo "============"

# Wait for both servers and show logs
wait $BACKEND_PID $FRONTEND_PID
