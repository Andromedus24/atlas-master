#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Atlas production build...');

try {
  // Ensure we're in the project root
  process.chdir(path.join(__dirname, '..'));

  // Check if .env exists, if not copy from .env.example
  if (!fs.existsSync('.env')) {
    console.log('📋 Creating .env from .env.example...');
    if (fs.existsSync('.env.example')) {
      fs.copyFileSync('.env.example', '.env');
      console.log('✅ .env file created');
    } else {
      console.log('⚠️  .env.example not found, skipping .env creation');
    }
  }

  // Set production environment
  process.env.NODE_ENV = 'production';

  // Build packages first
  console.log('🔨 Building shared packages...');
  execSync('pnpm run build:packages', { stdio: 'inherit' });

  // Build dashboard
  console.log('🏗️  Building Next.js dashboard...');
  execSync('pnpm run build:dashboard', { stdio: 'inherit' });

  // Build Electron app
  console.log('📦 Building Electron application...');
  execSync('pnpm run build:electron', { stdio: 'inherit' });

  // Create production package
  console.log('🎁 Creating production package...');
  execSync('pnpm run package', { stdio: 'inherit' });

  console.log('✅ Atlas production build completed successfully!');
  console.log('');
  console.log('Built files are available in:');
  console.log('- dist/ (Electron packages)');
  console.log('- apps/dashboard/.next/ (Next.js build)');
  console.log('- apps/electron-host/dist/ (Electron build)');

} catch (error) {
  console.error('❌ Production build failed:', error.message);
  process.exit(1);
}