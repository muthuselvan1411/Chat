#!/bin/bash
# Startup script for RealTime Chat App

echo "🚀 Starting RealTime Chat Application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if Python is installed
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo "❌ Python is not installed. Please install Python first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Start backend in background
echo "🔧 Starting backend server..."
cd backend
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python -m venv venv || python3 -m venv venv
fi

source venv/bin/activate 2>/dev/null || venv\Scripts\activate 2>/dev/null

pip install -r requirements.txt > /dev/null 2>&1
python main.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

cd ../frontend

# Install frontend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo "🌐 Starting frontend server..."
npm run dev &
FRONTEND_PID=$!

echo "✅ Application started successfully!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend: https://mumegle.up.railway.app"
echo "Press Ctrl+C to stop all servers"

# Wait for user to stop
wait $FRONTEND_PID $BACKEND_PID
