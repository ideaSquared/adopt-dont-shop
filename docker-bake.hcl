# Production images for the production smoke test (scripts/smoke-prod.sh,
# `pnpm smoke:prod`, and the `prod-image-smoke` job in
# .github/workflows/docker.yml). One definition so CI and a local run build
# exactly the same 15 images, tagged the way docker-compose.prod.yml pulls
# them. deploy.yml still builds and pushes the release images itself.
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
