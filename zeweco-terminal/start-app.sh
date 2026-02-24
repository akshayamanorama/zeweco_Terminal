#!/bin/bash
# Start backend
cd server
npm start &
BACKEND_PID=$!

# Start frontend
cd ..
npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT
