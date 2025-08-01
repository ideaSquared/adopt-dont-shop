# Hybrid Development Mode
# Run backend in Docker, frontend locally to reduce memory usage

Write-Host "🔄 Starting Hybrid Development Mode" -ForegroundColor Green
Write-Host "Backend in Docker, Frontend locally" -ForegroundColor Cyan
Write-Host "=" -repeat 40

# Step 1: Stop any existing containers
Write-Host "📦 Stopping existing containers..." -ForegroundColor Yellow
docker-compose down

# Step 2: Start only backend services in Docker
Write-Host "🐳 Starting backend services in Docker..." -ForegroundColor Yellow
docker-compose up -d database redis service-backend nginx

# Step 3: Wait for services to be ready
Write-Host "⏳ Waiting for backend services to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 15

# Step 4: Check backend health
Write-Host "🏥 Checking backend health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Backend is healthy!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend not ready yet, please wait a moment..." -ForegroundColor Yellow
}

# Step 5: Set up local development environment
Write-Host "💻 Setting up local development environment..." -ForegroundColor Yellow
$env:NODE_OPTIONS = "--max-old-space-size=2048"
$env:VITE_API_BASE_URL = "http://localhost:5000"
$env:VITE_WS_BASE_URL = "ws://localhost:5000"

Write-Host ""
Write-Host "🎯 Hybrid Development Mode Ready!" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Docker Services Running:" -ForegroundColor Cyan
Write-Host "   • Database:  PostgreSQL on port 5432" -ForegroundColor White
Write-Host "   • Redis:     Cache on port 6379" -ForegroundColor White
Write-Host "   • Backend:   API on port 5000" -ForegroundColor White
Write-Host "   • Nginx:     Proxy on port 80" -ForegroundColor White
Write-Host ""
Write-Host "💻 Local Development Commands:" -ForegroundColor Cyan
Write-Host "   • Libraries: npm run dev:libs-watch" -ForegroundColor White
Write-Host "   • Rescue:    npm run dev:rescue" -ForegroundColor White
Write-Host "   • Admin:     npm run dev:admin" -ForegroundColor White
Write-Host "   • Client:    npm run dev:client" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Recommended workflow:" -ForegroundColor Yellow
Write-Host "   1. Open a new terminal and run: npm run dev:libs-watch" -ForegroundColor White
Write-Host "   2. Open another terminal and run: npm run dev:rescue" -ForegroundColor White
Write-Host "   3. Your app will be at http://localhost:3003" -ForegroundColor White
Write-Host ""
Write-Host "📊 Monitor Docker services: docker-compose logs -f" -ForegroundColor Cyan
