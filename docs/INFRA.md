# Infrastructure Notes

## Upload serving: nginx auth_request pattern (ADS-422)

### Background

Before ADS-422, every `/uploads/<path>` request was handled end-to-end by
Node (Express), which consumed a worker thread to read the file from disk and
pipe it to the response. ADS-429 added authentication to that route; ADS-422
moves the actual file streaming out of Node entirely while keeping the auth
check in Node.

### How it works

```
Client                nginx                 Backend (Node)           Disk
  |                     |                        |                     |
  |  GET /uploads/x.jpg |                        |                     |
  |-------------------->|                        |                     |
  |                     |  GET /_auth_uploads    |                     |
  |                     |  ?path=x.jpg           |                     |
  |                     |  (cookies forwarded)   |                     |
  |                     |----------------------->|                     |
  |                     |                        | authenticate JWT    |
  |                     |                        | safeResolve(path)   |
  |                     |                        | fs.stat(resolved)   |
  |                     |       200 / 401 / 403  |                     |
  |                     |<-----------------------|                     |
  |                     |                        |                     |
  |                     | (200 only) read file   |                     |
  |                     |------------------------------------------>  |
  |   200 + file bytes  |<------------------------------------------  |
  |<--------------------|                        |                     |
```

Key properties:

- **Node is never in the file-streaming path in production.** nginx uses
  `sendfile` + kernel zero-copy to transfer bytes from the shared volume
  to the client socket.
- **Authentication is unchanged.** The backend's existing `authenticateToken`
  middleware runs on every auth_request subrequest; cookies and the
  `Authorization` header are forwarded by nginx.
- **The Express `/uploads/*` streaming route is preserved** for local
  development and CI environments where nginx is not in front. It is
  feature-flagged via `SERVE_LOCAL_UPLOADS` (default `true`; set `false`
  in prod via `docker-compose.prod.yml`).

### Files changed

| File | Change |
|------|--------|
| `nginx/nginx.prod.conf` | Added `location /uploads/` with `auth_request /_auth_uploads`; added internal `/_auth_uploads` proxy location |
| `service.backend/src/routes/upload-serve.routes.ts` | Added `GET /api/v1/uploads/authorize` — the auth subrequest endpoint |
| `service.backend/src/config/index.ts` | Added `serveLocalUploads` flag (reads `SERVE_LOCAL_UPLOADS` env var) |
| `service.backend/src/index.ts` | Routes the `/authorize` endpoint unconditionally; gates Express file streaming on `serveLocalUploads` |
| `docker-compose.prod.yml` | Shares `uploads` volume with nginx (`ro`); sets `SERVE_LOCAL_UPLOADS=false` |

### How to test locally (without Docker)

```bash
# 1. Start the backend with upload streaming enabled (default)
SERVE_LOCAL_UPLOADS=true npm run dev:backend

# 2. Hit the authorize endpoint directly to verify auth
curl -v -b "accessToken=<your-jwt>" \
  "http://localhost:5000/api/v1/uploads/authorize?path=pets/photo.jpg"
# Expect: 200 (if authed + file exists), 401 (no token), 403 (bad path), 404 (file missing)

# 3. Hit the streaming fallback
curl -v -b "accessToken=<your-jwt>" \
  "http://localhost:5000/uploads/pets/photo.jpg"
# Expect: file bytes streamed back
```

### How to test with Docker (production-like)

```bash
# Build and start the production stack
npm run prod:build
npm run prod:up

# Verify the auth_request flow via nginx
curl -v -b "accessToken=<your-jwt>" \
  "https://<PROD_HOSTNAME>/uploads/pets/photo.jpg"

# Inspect nginx access logs to confirm /_auth_uploads appears as a subrequest
docker compose -f docker-compose.prod.yml logs nginx | grep _auth_uploads
```

### Deploy notes

This change requires **nginx and backend to be redeployed together**:

1. The nginx config now references `/_auth_uploads` which proxies to
   `/api/v1/uploads/authorize`. If you deploy nginx first without the
   updated backend, auth subrequests will 404 and all upload requests
   will be denied.
2. The `uploads` volume is now mounted into the nginx container. Existing
   named volumes are unchanged; the new `nginx` service entry simply gains
   an additional `volumes` entry.
3. Set `SERVE_LOCAL_UPLOADS=false` in production (already done in
   `docker-compose.prod.yml`). This stops Node from handling `/uploads/*`
   streaming while keeping the `/api/v1/uploads/authorize` endpoint active.

Rollback: remove the `location /uploads/` and `/_auth_uploads` blocks from
the nginx config and set `SERVE_LOCAL_UPLOADS=true`. The Express streaming
fallback will resume handling all upload requests.
