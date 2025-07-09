#!/bin/bash
# Script to check if all API endpoints are documented in the OpenAPI spec

# Navigate to the service.backend directory
cd "$(dirname "$0")/.."

# Run the Python script
python scripts/check_endpoints.py

# Exit with the same status code as the Python script
exit $?
