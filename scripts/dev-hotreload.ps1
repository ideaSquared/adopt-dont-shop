#!/usr/bin/env pwsh

# 🚀 Adopt Don't Shop - Development Hot Reload Setup
# This script starts all libraries in watch mode and apps with hot reloading

Write-Host "🚀 Starting Adopt Don't Shop Development Environment..." -ForegroundColor Green
Write-Host "📚 Libraries will rebuild automatically on changes" -ForegroundColor Cyan
Write-Host "🔥 Apps will hot reload when library changes are detected" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

# Install dependencies if node_modules doesn't exist
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "🏗️  Starting libraries in watch mode and apps with hot reload..." -ForegroundColor Green

# Use the new dev:full script that runs libraries in watch mode and apps
npm run dev:full
