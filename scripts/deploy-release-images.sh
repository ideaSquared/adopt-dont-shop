#!/usr/bin/env bash
# Print the images that make up a release, for a rollback target.
#
# Usage: deploy-release-images.sh <image-prefix> <sha> <image>...
#
# service-ops (ADR 0016) did not exist in earlier releases, so rolling back
# — by hand (rollback.yml) or automatically (deploy.yml rollback_and_fail) —
# to a SHA from before it must not expect a service-ops image. Each image in
# OPTIONAL_IMAGES is printed only when its manifest exists for <sha>; every
# other image is always printed, so a missing core image still fails loudly
# at signature-verification / pull time. Output: one space-separated line.
set -euo pipefail

OPTIONAL_IMAGES="service-ops"

if [ "$#" -lt 3 ]; then
  echo "usage: $0 <image-prefix> <sha> <image>..." >&2
  exit 2
fi

prefix="$1"
sha="$2"
shift 2

is_optional() {
  case " $OPTIONAL_IMAGES " in
    *" $1 "*) return 0 ;;
  esac
  return 1
}

images=()
for image in "$@"; do
  if is_optional "$image" && ! docker manifest inspect "$prefix/$image:$sha" > /dev/null 2>&1; then
    echo "note: $image:$sha was never published (the release predates it) - leaving it out" >&2
    continue
  fi
  images+=("$image")
done

echo "${images[*]}"
