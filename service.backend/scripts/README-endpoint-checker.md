# API Endpoint Consistency Checker

This tool verifies that all implemented Express routes are properly documented in the OpenAPI specification (`openapi.yaml`).

## Purpose

Ensures API documentation coverage for all implemented routes. It helps identify any backend routes that are missing from the OpenAPI documentation so they can be added for accurate API reference docs.

The tool can:
1. **Main use case**: Find implemented routes that are missing from the OpenAPI spec
2. Optionally check OpenAPI spec endpoints against implementations 
3. Optionally compare API documentation to OpenAPI spec

## Key Benefits

- **Accuracy**: Ensures your API documentation is complete and up-to-date
- **Consistency**: Maintains alignment between code and documentation
- **Efficiency**: Generates OpenAPI YAML templates for missing endpoints
- **Normalization**: Intelligently handles path differences between code and OpenAPI

## Usage

### Basic Usage (Most Common)

```bash
# Default: Check that implemented routes are in OpenAPI spec
python scripts/check_endpoints.py
```

### Advanced Options

```bash
# Check that implemented routes are in OpenAPI (default)
python scripts/check_endpoints.py --mode routes-to-api

# Check that OpenAPI spec endpoints are implemented
python scripts/check_endpoints.py --mode api-to-routes

# Check that API documentation endpoints are in OpenAPI
python scripts/check_endpoints.py --mode doc-to-api

# Run all checks
python scripts/check_endpoints.py --mode all

# Use built-in ignore list for known endpoints (like test/monitoring endpoints)
python scripts/check_endpoints.py --ignore-list

# Show help
python scripts/check_endpoints.py --help
```

## Output

The script will report:
1. The number of endpoints found in route files and OpenAPI spec
2. Any endpoints that exist in code but are missing from OpenAPI
3. A ready-to-copy OpenAPI YAML template for any missing endpoints

Example output for missing endpoints:
```yaml
=== TEMPLATE FOR ADDING MISSING ENDPOINTS TO OPENAPI.YAML ===
Copy and paste the following into your OpenAPI specification:

  /api/v1/pets/{petId}/photos:
    post:
      tags: [Pet Adoption]
      summary: REPLACE_WITH_SUMMARY
      description: REPLACE_WITH_DESCRIPTION
      parameters:
        - name: petId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                # Add properties here
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
        '400':
          description: Bad request
        '401':
          description: Unauthorized
        '404':
          description: Not found
        '500':
          description: Server error
```

## Integration

This script can be integrated into:
- Pre-commit hooks to ensure documentation consistency
- CI/CD pipelines to validate API documentation before deployment
- Development workflow to periodically check for undocumented endpoints
