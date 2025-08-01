# 🐳 Docker Hot Reload Quick Start

## Start Development with Docker

```bash
# Start all services with hot reload
docker-compose up

# Or start specific app
docker-compose up app-rescue service-backend
```

## What Happens Behind the Scenes

1. **Container starts** with your app and all library source files mounted
2. **Library changes** on your host machine are instantly reflected inside the container
3. **Vite detects changes** via polling and triggers hot module replacement
4. **Browser updates** in <1 second without container rebuilds

## File Change Flow in Docker

```
Your Editor → Host File System → Docker Volume Mount → Container File System → Vite HMR → Browser Update
    ↓              ↓                      ↓                    ↓              ↓            ↓
  Edit lib.api   File saved          Volume sync        Chokidar detects   HMR triggered  Page updates
```

## Performance Tips

- **Keep containers running** - no need to restart on library changes
- **Use Docker Desktop** with proper file sharing enabled
- **WSL2 backend** recommended on Windows for better file watching performance

## Troubleshooting

If hot reload isn't working:
1. Check `CHOKIDAR_USEPOLLING=true` is set
2. Verify volume mounts include your library directories
3. Restart containers if file watching stops working

Your Docker setup is **already optimized** for hot reloading! 🚀
