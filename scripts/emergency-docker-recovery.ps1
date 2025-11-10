# Emergency Docker Recovery Script
# Run this when Docker containers are failing due to memory issues

Write-Host "🚨 Emergency Docker Recovery - Memory Optimization" -ForegroundColor Red
Write-Host "=" -repeat 50

# Step 1: Stop all containers
Write-Host "📦 Stopping all containers..." -ForegroundColor Yellow
docker-compose down

# Step 2: Clean up Docker system
Write-Host "🧹 Cleaning up Docker system..." -ForegroundColor Yellow
docker system prune -af --volumes
docker builder prune -af

# Step 3: Check available memory
Write-Host "💾 Checking system memory..." -ForegroundColor Yellow
$memory = Get-Counter "\Memory\Available MBytes" -SampleInterval 1 -MaxSamples 1
$availableGB = [math]::Round($memory.CounterSamples[0].CookedValue / 1024, 2)
Write-Host "Available Memory: $availableGB GB" -ForegroundColor Cyan

if ($availableGB -lt 4) {
    Write-Host "⚠️  WARNING: Low memory detected ($availableGB GB available)" -ForegroundColor Red
    Write-Host "Consider closing other applications or increasing Docker memory limit" -ForegroundColor Yellow
}

# Step 4: Set memory optimization environment variables
Write-Host "⚙️  Setting memory optimization flags..." -ForegroundColor Yellow
$env:NODE_OPTIONS = "--max-old-space-size=3072 --max-semi-space-size=128"
$env:CHOKIDAR_USEPOLLING = "false"
$env:CHOKIDAR_INTERVAL = "1000"

# Step 5: Show Docker info
Write-Host "🐳 Docker system info:" -ForegroundColor Yellow
docker system df

# Step 6: Restart with optimizations
Write-Host "🚀 Starting containers with memory optimizations..." -ForegroundColor Green
Write-Host "This may take 5-10 minutes..." -ForegroundColor Cyan

# Start only essential services first
Write-Host "Starting database and backend services first..." -ForegroundColor Cyan
docker-compose up -d database redis service-backend

# Wait for backend to be ready
Write-Host "Waiting for backend to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

# Start frontend applications one by one
Write-Host "Starting rescue app..." -ForegroundColor Cyan
docker-compose up -d app-rescue

Write-Host "Waiting before starting next app..." -ForegroundColor Cyan
Start-Sleep -Seconds 20

Write-Host "Starting admin app..." -ForegroundColor Cyan
docker-compose up -d app-admin

Write-Host "Waiting before starting final app..." -ForegroundColor Cyan
Start-Sleep -Seconds 20

Write-Host "Starting client app..." -ForegroundColor Cyan
docker-compose up -d app-client

Write-Host "Starting nginx..." -ForegroundColor Cyan
docker-compose up -d nginx

Write-Host ""
Write-Host "✅ Recovery complete!" -ForegroundColor Green
Write-Host "📊 Monitor containers with: docker stats" -ForegroundColor Cyan
Write-Host "📋 Check logs with: docker-compose logs -f [service-name]" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Your applications should be available at:" -ForegroundColor Green
Write-Host "   • Client:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "   • Admin:   http://localhost:3001" -ForegroundColor Cyan  
Write-Host "   • Rescue:  http://localhost:3002" -ForegroundColor Cyan
Write-Host "   • API:     http://localhost:5000" -ForegroundColor Cyan
