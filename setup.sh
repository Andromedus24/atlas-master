#!/bin/bash

# Atlas Setup Script
# This script sets up the Atlas AI desktop assistant development environment

set -e

echo "🚀 Setting up Atlas AI Desktop Assistant..."
echo

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js 20+"
    exit 1
fi
echo "✅ Node.js $(node -v) found"

# Check PNPM
if ! command -v pnpm &> /dev/null; then
    echo "❌ PNPM is not installed. Installing PNPM..."
    npm install -g pnpm@9
fi

PNPM_VERSION=$(pnpm -v | cut -d '.' -f 1)
if [ "$PNPM_VERSION" -lt 9 ]; then
    echo "❌ PNPM version $PNPM_VERSION is too old. Please install PNPM 9+"
    exit 1
fi
echo "✅ PNPM $(pnpm -v) found"

# Check Git
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git"
    exit 1
fi
echo "✅ Git found"

echo
echo "📦 Installing dependencies..."

# Install root dependencies
echo "Installing root dependencies..."
pnpm install

# Build shared packages first
echo "Building shared packages..."
pnpm run build:packages

echo
echo "🔧 Setting up development environment..."

# Create necessary directories
echo "Creating data directories..."
mkdir -p ~/.atlas/{data,logs,plugins}

# Copy environment template if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env 2>/dev/null || echo "No .env.example found, creating basic .env..."
    cat > .env << EOF
# Atlas Configuration
NODE_ENV=development

# AI Provider Configuration (choose one)
ATLAS_AI_PROVIDER=anthropic
ATLAS_AI_API_KEY=your-api-key-here
ATLAS_AI_MODEL=claude-3-5-sonnet-20241022

# Alternative providers (uncomment to use)
# ATLAS_AI_PROVIDER=openai
# ATLAS_AI_API_KEY=your-openai-key-here
# ATLAS_AI_MODEL=gpt-4

# ATLAS_AI_PROVIDER=google
# ATLAS_AI_API_KEY=your-gemini-key-here
# ATLAS_AI_MODEL=gemini-pro

# Dashboard Configuration
ATLAS_DASHBOARD_PORT=3000
ATLAS_DASHBOARD_THEME=system

# Security Configuration
ATLAS_TRUSTED_PATHS=$(pwd)/plugins
ATLAS_ENABLE_AUDIT_LOG=true

# Storage Configuration
ATLAS_DATA_PATH=$(pwd)/.atlas/data
ATLAS_MAX_STORAGE_SIZE=1073741824
EOF
fi

# Install Electron dependencies
echo "Installing Electron dependencies..."
cd apps/electron-host
npm install
cd ../..

echo
echo "✅ Setup complete!"
echo
echo "🔑 Next steps:"
echo "1. Edit .env file and add your AI provider API key"
echo "2. Start the development servers:"
echo "   pnpm run dev:all"
echo
echo "🌐 Dashboard will be available at: http://localhost:3000"
echo "📱 Electron app will start automatically"
echo
echo "📚 For more information, see CLAUDE.md"
echo