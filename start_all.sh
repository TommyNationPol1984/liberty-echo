#!/bin/bash
# LibertyEcho - Start all services

echo "Starting TTS Engine on port 8000..."
python run_tts_engine.py &
TTS_PID=$!

echo "Starting Node.js application on port 5000..."
npm run dev &
NODE_PID=$!

echo "Both services started."
echo "  - TTS Engine: http://localhost:8000"
echo "  - Web App: http://localhost:5000"

# Wait for both processes
wait $TTS_PID $NODE_PID
