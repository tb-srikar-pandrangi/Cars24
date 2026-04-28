#!/bin/bash
set -e

echo "Starting Vercel build script..."
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

echo "Installing dependencies..."
npm ci --include=dev

echo "Building shared package..."
cd packages/shared
npm run build
cd ../..

echo "Building agents package..."
cd packages/agents
npm run build
cd ../..

echo "Building orchestrator package..."
cd packages/orchestrator
npm run build
cd ../..

echo "Building UI package..."
cd packages/ui
npm run build
cd ../..

echo "Build completed successfully!"
echo "Output directory contents:"
ls -la packages/ui/.next | head -20
