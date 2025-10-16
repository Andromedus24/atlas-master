#!/bin/bash

set -e

echo "🚀 Setting up Atlas (free-cluely) development environment..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ and try again."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version $NODE_VERSION is not supported. Please use Node.js 20+."
    exit 1
fi

# Check PNPM version
if ! command -v pnpm &> /dev/null; then
    echo "❌ PNPM is not installed. Please install PNPM 9+ and try again."
    exit 1
fi

PNPM_VERSION=$(pnpm -v | cut -d '.' -f 1)
if [ "$PNPM_VERSION" -lt 9 ]; then
    echo "❌ PNPM version $PNPM_VERSION is not supported. Please use PNPM 9+."
    exit 1
fi

echo "✅ Node.js $(node -v) and PNPM $(pnpm -v) are compatible"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build packages
echo "🔨 Building shared packages..."
pnpm run build:packages

# Setup environment files
if [ ! -f .env ]; then
    echo "📋 Creating .env file from template..."
    cp .env.example .env 2>/dev/null || echo "⚠️  .env.example not found, you'll need to create .env manually"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p apps/dashboard/public
mkdir -p apps/electron-host/src
mkdir -p packages
mkdir -p plugins

echo ""
echo "✅ Atlas setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure your environment variables in .env"
echo "2. Start development with: pnpm run dev:all"
echo ""
echo "Required environment variables:"
echo "- ANTHROPIC_API_KEY (for Claude AI)"
echo "- GOOGLE_AI_API_KEY (for Gemini AI, optional)"
echo "- OLLAMA_BASE_URL (for local Ollama, optional)"
echo ""
echo "Happy coding! 🎉"