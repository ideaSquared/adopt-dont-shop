#!/bin/bash

# Production Docker Environment Setup Script

set -e

echo "🚀 Deploying Adopt Don't Shop Production Environment"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file is required for production deployment"
    exit 1
fi

# Validate required environment variables
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-super-secret-jwt-key-change-in-production" ]; then
    echo "❌ JWT_SECRET must be set to a secure value in production"
    exit 1
fi

# Pull latest images and build
echo "📦 Building production images..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache

# Start services
echo "🔨 Starting production services..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 15

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose exec service-backend npm run migrate

echo "✅ Production environment deployed successfully!"
echo ""
echo "🌐 Services available at:"
echo "   • Main Site:     http://localhost"
echo "   • Admin:         http://admin.localhost"
echo "   • Rescue:        http://rescue.localhost"
echo "   • API:           http://api.localhost"
echo ""
echo "📊 View logs with: docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f [service-name]"
echo "🛑 Stop with: docker-compose -f docker-compose.yml -f docker-compose.prod.yml down" 