# Docker Memory Monitor
# Monitor Docker container memory usage and system resources

Write-Host "📊 Docker Memory Monitor" -ForegroundColor Green
Write-Host "=" -repeat 30

function Get-FormattedSize {
    param($Bytes)
    if ($Bytes -gt 1GB) { return "{0:N2} GB" -f ($Bytes / 1GB) }
    elseif ($Bytes -gt 1MB) { return "{0:N2} MB" -f ($Bytes / 1MB) }
    else { return "{0:N2} KB" -f ($Bytes / 1KB) }
}

# System Memory Check
Write-Host "`n💾 System Memory Status:" -ForegroundColor Cyan
$memory = Get-Counter "\Memory\Available MBytes" -SampleInterval 1 -MaxSamples 1
$totalMemory = (Get-WmiObject -Class Win32_ComputerSystem).TotalPhysicalMemory
$availableBytes = $memory.CounterSamples[0].CookedValue * 1MB
$usedBytes = $totalMemory - $availableBytes

Write-Host "Total:     $(Get-FormattedSize $totalMemory)" -ForegroundColor White
Write-Host "Used:      $(Get-FormattedSize $usedBytes)" -ForegroundColor Yellow
Write-Host "Available: $(Get-FormattedSize $availableBytes)" -ForegroundColor Green
Write-Host "Usage:     {0:N1}%" -f (($usedBytes / $totalMemory) * 100) -ForegroundColor $(if (($usedBytes / $totalMemory) -gt 0.8) { "Red" } else { "Green" })

# Docker System Info
Write-Host "`n🐳 Docker System Usage:" -ForegroundColor Cyan
docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}\t{{.Reclaimable}}"

# Container Stats
Write-Host "`n📦 Container Memory Usage:" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop monitoring`n" -ForegroundColor Yellow

# Monitor containers in real-time
while ($true) {
    Clear-Host
    Write-Host "📊 Real-time Docker Container Stats" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host "Last updated: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
    Write-Host "=" -repeat 80
    
    # Check if any containers are running
    $containers = docker ps --format "{{.Names}}" 2>$null
    if ($containers) {
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"
        
        Write-Host "`n🚨 Memory Alerts:" -ForegroundColor Red
        $stats = docker stats --no-stream --format "{{.Name}},{{.MemPerc}}" | ConvertFrom-Csv -Header "Name","MemPerc"
        foreach ($stat in $stats) {
            $memPercent = [float]($stat.MemPerc -replace '%', '')
            if ($memPercent -gt 80) {
                Write-Host "⚠️  $($stat.Name): High memory usage ($($stat.MemPerc))" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "No containers are currently running." -ForegroundColor Yellow
        Write-Host "Start containers with: docker-compose up" -ForegroundColor Cyan
    }
    
    Write-Host "`n📋 Quick Commands:" -ForegroundColor Cyan
    Write-Host "docker-compose restart [service]  - Restart specific service" -ForegroundColor White
    Write-Host "docker system prune -f          - Clean up unused resources" -ForegroundColor White
    Write-Host "docker-compose logs -f [service] - View service logs" -ForegroundColor White
    
    Start-Sleep -Seconds 5
}
