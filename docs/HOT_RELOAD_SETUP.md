# 🔥 Hot Reload Development Setup

This guide explains how to set up hot reloading for your libraries and apps so you don't need to rebuild Docker containers every time you make changes.

## 🚀 Quick Start

### Option 1: Use the Hot Reload Script (Recommended)
```powershell
# Run this from the project root
.\scripts\dev-hotreload.ps1
```

### Option 2: Manual Commands
```powershell
# Start libraries in watch mode and apps with hot reload
npm run dev:full

# Or run them separately:
npm run dev:libs-watch  # Libraries in watch mode
npm run dev:apps        # Apps with hot reload
```

## 🏗️ How It Works

### Libraries (`lib.*`)
- **Watch Mode**: Libraries run with `tsc --watch` or `vite build --watch`
- **Source Mapping**: Apps import directly from library source files in development
- **No Container Rebuilds**: Changes are detected and compiled automatically

### Apps (`app.*`)
- **Vite Aliases**: Development mode maps library imports to source files
- **Hot Module Reload**: Vite detects changes and updates the browser instantly
- **Docker Integration**: Works with your existing Docker setup

## 📁 What Changed

### 1. Package Scripts
- Added `dev:libs-watch` for libraries without build dependencies
- Updated `dev:full` to run libraries in watch mode first

### 2. Turbo Configuration
- Removed `^build` dependency from dev tasks
- Libraries can start immediately without waiting for builds

### 3. Vite Configurations
All app Vite configs now include development aliases:
```typescript
// Development aliases for all libraries
const libraryAliases = mode === 'development' ? {
  '@adopt-dont-shop/lib-api': resolve(__dirname, '../lib.api/src'),
  '@adopt-dont-shop/lib-utils': resolve(__dirname, '../lib.utils/src'),
  // ... all other libraries
} : {};
```

### 4. Library Exports
Libraries now prioritize development source:
```json
"exports": {
  ".": {
    "development": "./src/index.ts",
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js"
  }
}
```

## 🐳 Docker Integration

Your Docker setup will continue to work, but now with **enhanced hot reloading**:

### Development Mode (Docker)
- **Library Sources**: Apps import library source files directly via volume mounts
- **File Watching**: `CHOKIDAR_USEPOLLING=true` enables proper file detection in containers
- **No Rebuilds**: Library changes trigger hot reloads instead of container rebuilds
- **Volume Mounts**: Entire workspace is mounted, so all library changes are detected

### Production Mode (Docker)
- **Built Libraries**: Apps use compiled library distributions
- **Optimized Builds**: Standard production Docker builds with built assets

### Docker Hot Reload Flow
1. **You change** library source code on your host machine
2. **Volume mount** reflects change inside the container instantly
3. **Vite alias** points app to the changed library source file
4. **Chokidar polling** detects the file change inside container
5. **Hot reload** triggers and updates your browser in <1 second

### Docker Commands
```bash
# Start with hot reload (recommended)
docker-compose up

# Or start specific services
docker-compose up app-rescue service-backend

# Libraries will auto-rebuild when you change source files!
```

### Docker Environment Variables
Your setup already includes the necessary environment variables:
```yaml
environment:
  NODE_ENV: development
  DOCKER_ENV: true
  CHOKIDAR_USEPOLLING: true  # Critical for Docker file watching
```

## 🔧 Troubleshooting

### Libraries Not Updating?
1. Check if the library's `dev` script uses watch mode
2. Verify the app's Vite config includes the library alias
3. Restart the development server

### TypeScript Errors?
1. Make sure library source files have proper TypeScript exports
2. Check that the app can resolve the library's source directory
3. Run `npm run type-check` in both library and app

### Docker Issues?
1. Ensure `CHOKIDAR_USEPOLLING=true` in your environment
2. Check volume mounts include the library source directories
3. Restart containers if needed

## 📊 Performance Benefits

- **No Container Rebuilds**: Save 5-10 minutes per library change
- **Instant Hot Reload**: See changes in <1 second
- **Better DX**: Faster feedback loop for development
- **Memory Efficient**: Only changed files are recompiled

## 🎯 Best Practices

1. **Always use the hot reload script** for consistent setup
2. **Keep library builds minimal** - avoid heavy build processes in watch mode
3. **Use TypeScript paths** for better IDE support
4. **Monitor file watchers** - too many can slow down the system

---

Happy coding! 🚀 Your libraries will now update automatically without container rebuilds.
