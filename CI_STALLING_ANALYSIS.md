# CI/CD Docker Compose Stalling Issue - Root Cause Analysis

## Problem
GitHub Actions CI/CD pipeline stalls at "exporting to image/exporting layers" when building app-admin (and likely other frontend apps) during the Docker Compose test phase.

## Root Causes Identified

### 1. **Double Building (Primary Issue)**
- Line 161: `needs: [build-backend, build-apps]` - Images are built in separate jobs
- Line 180: `docker compose up -d --build` - **Rebuilds all images again**
- This means images are built twice:
  1. First in `build-apps` job (lines 94-154)
  2. Again in `test-compose` job (line 180)

### 2. **Image Size and Layer Count**
Looking at `Dockerfile.app.optimized`:
- Lines 39-91: Copies 20 library directories individually (20 layers)
- Lines 69-88: Copies the same 20 libraries again with source code (20 more layers)
- This creates ~40+ layers just for libraries
- Each `COPY` command creates a new layer

### 3. **Build Context Size**
- Context includes entire monorepo
- 20 libraries + 3 apps + service.backend
- Large build context sent to Docker daemon twice

### 4. **Resource Constraints in GitHub Actions**
- Default runners: 7GB RAM, 14GB disk
- Building multiple large frontend apps simultaneously can exhaust resources
- The "exporting layers" phase is memory-intensive

### 5. **Cache Issues**
- Lines 51-57, 113-119: Cache is configured but may not be effective during `docker compose up --build`
- Docker Compose doesn't automatically use BuildKit cache from previous jobs

## Why It Stalls at "Exporting to Image"

The export phase:
1. Consolidates all layers into final image
2. Writes to disk
3. Most memory/disk intensive part of build
4. If disk space low or memory exhausted → stalls

## Solutions

### Fix 1: Don't Rebuild in test-compose ✅ (Recommended)
Remove `--build` flag since images are already built

### Fix 2: Use Pre-built Images ✅ (Best Practice)
- Save images from build jobs as artifacts
- Load them in test-compose job
- Or push to registry and pull

### Fix 3: Reduce Image Layers 
- Combine COPY commands
- Use wildcard patterns

### Fix 4: Add Resource Monitoring
- Add disk space checks
- Monitor memory usage
- Add timeouts for individual build steps

### Fix 5: Build Only What's Needed for Testing
- Test with development builds only (not production)
- Or test only critical services
