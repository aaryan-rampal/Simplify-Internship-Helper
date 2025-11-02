#!/bin/bash

# Startup script for Internship Tracker

echo "Starting Internship Tracker..."

# Activate conda environment
echo "Activating conda environment..."
#eval "$(/opt/homebrew/Caskroom/miniconda/base/bin/conda shell.bash hook)"
#conda activate internship-tracker
source venv/bin/activate

# Start the backend server
echo "Starting backend server on http://localhost:8000"
cd backend
python main.py
