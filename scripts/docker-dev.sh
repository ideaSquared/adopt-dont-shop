#!/bin/bash

# Development Docker Environment Setup Script

set -e

echo "🐋 Starting Adopt Don't Shop Development Environment"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example"
    cp .env.example .env
    echo "✅ Please edit .env file with your configuration"
fi

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations (if needed)
echo "🗄️  Running database setup..."
docker-compose exec service-backend npm run migrate || echo "⚠️  Migration failed or not needed"
docker-compose exec service-backend npm run seed || echo "⚠️  Seeding failed or not needed"

echo "✅ Development environment is ready!"
echo ""
echo "🌐 Services available at:"
echo "   • Client App:    http://localhost (or directly http://localhost:3000)"
echo "   • Admin App:     http://admin.localhost"
echo "   • Rescue App:    http://rescue.localhost"
echo "   • Backend API:   http://api.localhost (or directly http://localhost:5000)"
echo "   • Database:      localhost:5432"
echo "   • Redis:         localhost:6379"
echo ""
echo "📊 View logs with: docker-compose logs -f [service-name]"
echo "🛑 Stop with: docker-compose down" 