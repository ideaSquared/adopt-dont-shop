# Production images for the production smoke test (scripts/smoke-prod.sh,
# `pnpm smoke:prod`, and the `prod-image-smoke` job in
# .github/workflows/docker.yml). One definition so CI and a local run build
# exactly the same 15 images, tagged the way docker-compose.prod.yml pulls
# them. The `publish-services` and `publish-staging-apps` groups below are what the
# `publish-images` job in docker.yml pushes (by commit SHA) on main for deploy.yml to
# reuse; deploy.yml still builds any image it cannot find, so it stays self-sufficient.
#
#   TAG=smoke docker buildx bake -f docker-bake.hcl smoke --load

variable "TAG" {
  default = "smoke"
}

variable "IMAGE_PREFIX" {
  default = "ghcr.io/ideasquared/adopt-dont-shop"
}

group "smoke" {
  targets = ["services", "apps"]
}

target "services" {
  name = "service-${svc}"
  matrix = {
    svc = [
      "gateway", "auth", "notifications", "pets", "rescue", "applications",
      "chat", "moderation", "matching", "audit", "cms", "ops",
    ]
  }
  context    = "."
  dockerfile = "Dockerfile.service"
  target     = "production"
  args = {
    SERVICE     = "@adopt-dont-shop/service.${svc}"
    SERVICE_DIR = "services/${svc}"
  }
  tags = ["${IMAGE_PREFIX}/service-${svc}:${TAG}"]
}

target "apps" {
  name = "app-${app}"
  matrix = {
    app = ["client", "admin", "rescue"]
  }
  context    = "."
  dockerfile = "Dockerfile.app"
  target     = "production"
  args = {
    APP_NAME = app
  }
  # docker-compose.prod.yml pulls the frontends as app-*:<DEPLOY_SHA>-production (the
  # environment suffix keeps staging and production bundles apart), so tag the
  # smoke build that way too. The plain tag is kept for `docker run` convenience.
  tags = [
    "${IMAGE_PREFIX}/app-${app}:${TAG}",
    "${IMAGE_PREFIX}/app-${app}:${TAG}-production",
  ]
}

# ---------------------------------------------------------------------------
# Release images, pushed once per main commit by docker.yml's `publish-images`
# job and reused by deploy.yml instead of rebuilding.
#
#   TAG=<sha> docker buildx bake -f docker-bake.hcl publish-services --push
# ---------------------------------------------------------------------------

# The 12 backend images bake nothing per environment, so the `services`
# target above (same args and tag scheme as deploy.yml's fallback build,
# service-<name>:<sha>) is the release build as it stands.
group "publish-services" {
  targets = ["services"]
}

# Frontend images bake VITE_* values and the Sentry settings per environment,
# so they are published for staging only (the environment whose variables the
# job reads) as app-*:<sha>-staging. Production frontends are still built by
# deploy.yml from the production-vars environment. Keep the args in step with
# deploy.yml's "Build and push app.*" fallback steps.
variable "DEPLOY_ENV" {
  default = "staging"
}

variable "VITE_API_BASE_URL" {
  default = ""
}

variable "VITE_WS_BASE_URL" {
  default = ""
}

variable "VITE_SENTRY_DSN" {
  default = ""
}

variable "VITE_STATSIG_CLIENT_KEY" {
  default = ""
}

variable "SENTRY_ORG" {
  default = ""
}

variable "SENTRY_PROJECT_CLIENT" {
  default = ""
}

variable "SENTRY_PROJECT_ADMIN" {
  default = ""
}

variable "SENTRY_PROJECT_RESCUE" {
  default = ""
}

group "publish-staging-apps" {
  targets = ["release-apps"]
}

target "release-apps" {
  name = "release-app-${app.name}"
  matrix = {
    app = [
      { name = "client", sentry_project = SENTRY_PROJECT_CLIENT },
      { name = "admin", sentry_project = SENTRY_PROJECT_ADMIN },
      { name = "rescue", sentry_project = SENTRY_PROJECT_RESCUE },
    ]
  }
  context    = "."
  dockerfile = "Dockerfile.app"
  target     = "production"
  args = {
    APP_NAME                = app.name
    VITE_API_BASE_URL       = VITE_API_BASE_URL
    VITE_WS_BASE_URL        = VITE_WS_BASE_URL
    VITE_SENTRY_DSN         = VITE_SENTRY_DSN
    VITE_STATSIG_CLIENT_KEY = VITE_STATSIG_CLIENT_KEY
    SENTRY_ORG              = SENTRY_ORG
    SENTRY_PROJECT          = app.sentry_project
    DEPLOY_SHA              = TAG
  }
  secret = ["id=sentry_auth,env=SENTRY_AUTH_TOKEN"]
  tags   = ["${IMAGE_PREFIX}/app-${app.name}:${TAG}-${DEPLOY_ENV}"]
}
