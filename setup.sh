#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
npm install

# Create directories if they don't exist
mkdir -p public
mkdir -p src/services

# Build the TypeScript code
echo "Building TypeScript code..."
npm run build

# Start the server
echo "Starting server..."
echo "Visit http://localhost:3000 to use the chat interface"
npm start 