#!/usr/bin/env python3
"""
Endpoint Consistency Checker

This script verifies that all endpoints are consistently defined across:
1. API documentation (api-endpoints.md)
2. OpenAPI specification (openapi.yaml)
3. Actual route implementation files (*.routes.ts)

It helps ensure documentation and implementation consistency and prevents
endpoints from being missed in any part of the system.

Usage:
    python check_endpoints.py [--doc-to-api|--code-to-api|--all]

Options:
    --doc-to-api    Check that documented endpoints are in OpenAPI spec
    --code-to-api   Check that implemented routes are in OpenAPI spec
    --all           Run all checks (default)
    --help          Show this help message

"""

import os
import re
import yaml
import sys
import glob
import argparse
from pathlib import Path

# File paths - relative to the repository root
API_DOCS_PATH = Path('docs/api-endpoints.md')
OPENAPI_SPEC_PATH = Path('docs/openapi.yaml')
ROUTES_DIR_PATH = Path('src/routes')


def normalize_path(path):
    """
    Normalize path by converting :param format to {param} format
    and handling some special endpoint name mappings
    Example: /api/v1/users/:userId -> /api/v1/users/{userId}
    """
    # Replace :param with {param}
    path = re.sub(r':(\w+)', r'{\1}', path)
    
    # Handle trailing slashes
    if path.endswith('/') and len(path) > 1:
        path = path[:-1]
        
    # Handle singular/plural resource names in paths
    # This maps '/api/v1/pet/' to '/api/v1/pets/' etc.
    singular_to_plural_resources = {
        '/api/v1/pet/': '/api/v1/pets/',
        '/api/v1/user/': '/api/v1/users/',
        '/api/v1/email/': '/api/v1/emails/',
        '/api/v1/notification/': '/api/v1/notifications/',
        '/api/v1/application/': '/api/v1/applications/',
        '/api/v1/rescue/': '/api/v1/rescues/',
        # Add more resource name mappings as needed
    }
    
    # Check for singular/plural mappings
    for singular, plural in singular_to_plural_resources.items():
        # Check if the path starts with the singular form
        if path.startswith(singular):
            path = plural + path[len(singular):]
            break
        # Also check if the path starts with the singular form but without trailing slash
        elif path.startswith(singular[:-1]) and (len(path) == len(singular) - 1 or path[len(singular)-1] in ['/', '?', '#']):
            path = plural[:-1] + path[len(singular)-1:]
            break
    
    # Handle some known endpoint differences
    special_mappings = {
        '/api/v1/auth/password/forgot': '/api/v1/auth/forgot-password',
        '/api/v1/auth/password/reset': '/api/v1/auth/reset-password',
        '/api/v1/auth/refresh': '/api/v1/auth/refresh-token',
        # Add more mappings as you discover them
    }
    
    if path in special_mappings:
        return special_mappings[path]
    
    return path

def extract_endpoints_from_markdown(md_path):
    """
    Extract all API endpoints from the markdown documentation.
    Looks for patterns like '### [HTTP_METHOD] /path/to/endpoint'
    """
    endpoints = []
    
    with open(md_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    print(f"Reading markdown file: {md_path}")
    
    # Regular expression to find endpoint definitions in markdown
    # Matches patterns like '### GET /api/v1/users' or '### POST /api/v1/auth/login'
    endpoint_pattern = r'###\s+(GET|POST|PUT|PATCH|DELETE)\s+(/api/v[\d]/[^\s\n]+)'
    
    matches = re.finditer(endpoint_pattern, content, re.MULTILINE)
    
    for match in matches:
        method = match.group(1)
        path = normalize_path(match.group(2))  # Normalize path format
        endpoints.append((method, path))
    
    # Print summary of first few endpoints found
    if endpoints:
        print(f"Sample endpoints from markdown (first 5 of {len(endpoints)}):")
        for method, path in endpoints[:5]:
            print(f"  {method} {path}")
    
    return endpoints


def extract_endpoints_from_openapi(yaml_path):
    """
    Extract all API endpoints from the OpenAPI YAML specification.
    """
    print(f"Reading OpenAPI file: {yaml_path}")
    
    with open(yaml_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Use regex to find path patterns
    # This handles both standard OpenAPI format and the custom format in your file
    path_pattern = r'^\s*(/api/v\d+/[^\s:]+):(?:\s*$|\s+\w+:)'
    method_pattern = r'^\s*(get|post|put|delete|patch):\s*$'
    
    endpoints = []
    current_path = None
    
    for line in content.split('\n'):
        path_match = re.match(path_pattern, line, re.IGNORECASE)
        if path_match:
            current_path = path_match.group(1)
            continue
            
        if current_path:
            method_match = re.match(method_pattern, line, re.IGNORECASE)
            if method_match:
                method = method_match.group(1).upper()
                normalized_path = normalize_path(current_path)
                endpoints.append((method, normalized_path))
    
    # Print summary of OpenAPI endpoints
    if endpoints:
        print(f"Sample endpoints from OpenAPI (first 5 of {len(endpoints)}):")
        for method, path in endpoints[:5]:
            print(f"  {method} {path}")
    
    return endpoints


def extract_endpoints_from_route_files(routes_dir):
    """
    Extract all API endpoints from Express route files.
    Parses TypeScript/JavaScript files with route definitions.
    """
    print(f"Scanning route files in: {routes_dir}")
    
    # Find all route files
    route_files = glob.glob(os.path.join(routes_dir, "*.routes.ts"))
    
    # Add more patterns if you have different naming conventions
    if not route_files:
        route_files = glob.glob(os.path.join(routes_dir, "*.routes.js"))
    
    if not route_files:
        print("No route files found!")
        return []
    
    endpoints = []
    
    # Common HTTP methods to look for in route files
    http_methods = ['get', 'post', 'put', 'patch', 'delete']
    
    # Process each route file
    for route_file in route_files:
        file_name = os.path.basename(route_file)
        resource_name = file_name.split('.')[0]  # Extract resource name from filename
        
        # Default API prefix based on resource name
        base_path = f"/api/v1/{resource_name}"
        
        print(f"Processing route file: {file_name}")
        
        with open(route_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # Look for route definitions with comments, which are more reliable
            # Example: // POST /auth/register
            comment_pattern = r"//\s+(GET|POST|PUT|PATCH|DELETE)\s+(/\S+)"
            comment_matches = list(re.finditer(comment_pattern, content, re.MULTILINE | re.IGNORECASE))
            
            if comment_matches:
                print(f"  Found {len(comment_matches)} commented route definitions")
                
                for match in comment_matches:
                    method = match.group(1).upper()
                    path = match.group(2)
                    
                    # Handle paths relative to the resource
                    if not path.startswith('/api/'):
                        if path.startswith('/' + resource_name):
                            # If path already includes resource name (e.g. /auth/login)
                            full_path = f"/api/v1{path}"
                        else:
                            # If path is relative to the resource (e.g. /login)
                            full_path = f"/api/v1/{resource_name}{path}"
                    else:
                        # If path is already a full API path
                        full_path = path
                    
                    # Normalize path parameters from :param to {param} format
                    full_path = normalize_path(full_path)
                    
                    endpoints.append((method, full_path))
            
            # Also extract routes from the code
            for method in http_methods:
                # Pattern to match router.METHOD('/path', ...) 
                code_pattern = rf"router\.{method}\(['\"]([^'\"]+)['\"]"
                code_matches = list(re.finditer(code_pattern, content, re.IGNORECASE))
                
                if code_matches:
                    print(f"  Found {len(code_matches)} {method.upper()} routes in code")
                    
                    for match in code_matches:
                        path = match.group(1)
                        
                        # Build the full API path
                        if path.startswith('/'):
                            # Handle absolute paths within the router
                            full_path = f"{base_path}{path}"
                        else:
                            # Handle relative paths
                            full_path = f"{base_path}/{path}"
                        
                        # Clean up any double slashes
                        full_path = full_path.replace('//', '/')
                        
                        # Normalize path parameters and other differences
                        full_path = normalize_path(full_path)
                        
                        endpoints.append((method.upper(), full_path))
    
    # Apply normalization to handle singular/plural resources, etc.
    normalized_endpoints = []
    for method, path in endpoints:
        normalized_path = normalize_path(path)
        normalized_endpoints.append((method, normalized_path))
    
    # Deduplicate endpoints (same method + path)
    unique_endpoints = list(set(normalized_endpoints))
    
    # Print summary of endpoints found
    if unique_endpoints:
        print(f"\nFound {len(unique_endpoints)} unique API endpoints in route files.")
        print(f"Sample endpoints (first 10):")
        for method, path in sorted(unique_endpoints)[:10]:
            print(f"  {method} {path}")
    
    return unique_endpoints


def get_resource_tag(path):
    """
    Determine the appropriate tag for an endpoint based on its path
    """
    # Extract the resource name from the path
    match = re.match(r'/api/v\d+/([^/{]+)', path)
    if match:
        resource = match.group(1)
        
        # Special cases
        if resource == 'auth':
            return 'Authentication'
        if resource in ['users', 'emails', 'notifications']:
            return 'User Management'
        if resource in ['pets', 'applications']:
            return 'Pet Adoption'
        if resource == 'rescues':
            return 'Rescue Organizations'
        if resource == 'admin':
            return 'Administration'
        if resource == 'chat':
            return 'Messaging'
        if resource in ['monitoring', 'discovery']:
            return 'System'
            
        # Default: capitalize the resource name
        return resource.capitalize()
    
    return 'General'


def generate_openapi_template(missing_endpoints):
    """
    Generate a formatted OpenAPI YAML template for the missing endpoints
    """
    if not missing_endpoints:
        return ""
        
    template = []
    for endpoint in sorted(missing_endpoints):
        method, path = endpoint.split(" ", 1)
        resource_tag = get_resource_tag(path)
        
        template.append(f"\n  {path}:")
        template.append(f"    {method.lower()}:")
        template.append(f"      tags: [{resource_tag}]")
        template.append(f"      summary: REPLACE_WITH_SUMMARY")
        template.append(f"      description: REPLACE_WITH_DESCRIPTION")
        
        # Add parameters section if path has parameters
        if '{' in path:
            template.append(f"      parameters:")
            for param_name in re.findall(r'\{([^}]+)\}', path):
                template.append(f"        - name: {param_name}")
                template.append(f"          in: path")
                template.append(f"          required: true")
                template.append(f"          schema:")
                template.append(f"            type: string")
        
        # Add common response patterns
        template.append(f"      responses:")
        template.append(f"        '200':")
        template.append(f"          description: Successful response")
        template.append(f"          content:")
        template.append(f"            application/json:")
        template.append(f"              schema:")
        template.append(f"                type: object")
        template.append(f"        '400':")
        template.append(f"          description: Bad request")
        template.append(f"        '401':")
        template.append(f"          description: Unauthorized")
        template.append(f"        '404':")
        template.append(f"          description: Not found")
        template.append(f"        '500':")
        template.append(f"          description: Server error")
        
        # If it's a POST, PUT or PATCH, add requestBody
        if method in ['POST', 'PUT', 'PATCH']:
            template.append(f"      requestBody:")
            template.append(f"        required: true")
            template.append(f"        content:")
            template.append(f"          application/json:")
            template.append(f"            schema:")
            template.append(f"              type: object")
            template.append(f"              properties:")
            template.append(f"                # Add properties here")
    
    return "\n".join(template)


def compare_endpoints(source_name, target_name, source_endpoints, target_endpoints, ignore_list=None):
    """
    Compare two sets of endpoints and report missing ones
    """
    if ignore_list is None:
        ignore_list = set()
        
    # Convert to sets for comparison
    source_endpoint_set = {f"{method} {path}" for method, path in source_endpoints}
    target_endpoint_set = {f"{method} {path}" for method, path in target_endpoints}
    
    # Find missing endpoints, excluding the ones we want to ignore
    missing_endpoints = source_endpoint_set - target_endpoint_set - ignore_list
    
    # Report results
    print(f"\nFound {len(source_endpoints)} endpoints in {source_name}")
    print(f"Found {len(target_endpoints)} endpoints in {target_name}")
    
    if ignore_list:
        print(f"Ignoring {len(ignore_list)} known endpoints that aren't expected in {target_name}")
    
    if missing_endpoints:
        print(f"\nThe following endpoints are in {source_name} but missing from {target_name}:")
        for endpoint in sorted(missing_endpoints):
            print(f"  {endpoint}")
        return False
    else:
        print(f"\nAll {source_name} endpoints are present in {target_name} (or in the ignore list)! ✅")
        return True
def main():
    # Parse command-line arguments
    parser = argparse.ArgumentParser(
        description='Check API endpoint consistency between implementation and documentation'
    )
    parser.add_argument('--mode', choices=['routes-to-api', 'api-to-routes', 'doc-to-api', 'all'], 
                        default='routes-to-api',
                        help='Comparison mode (default: routes-to-api)')
    parser.add_argument('--output', choices=['all', 'missing'], 
                        default='missing', 
                        help='Output mode (default: missing)')
    parser.add_argument('--ignore-list', action='store_true',
                        help='Use the built-in ignore list for known endpoints')
    args = parser.parse_args()
    
    # Get the script's directory and calculate paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    service_backend_dir = os.path.dirname(script_dir)
    
    md_path = os.path.join(service_backend_dir, 'docs', 'api-endpoints.md')
    yaml_path = os.path.join(service_backend_dir, 'docs', 'openapi.yaml')
    routes_dir = os.path.join(service_backend_dir, 'src', 'routes')
    
    # Check if files exist
    if not os.path.exists(yaml_path):
        print(f"Error: OpenAPI specification not found at {yaml_path}")
        return 1
    
    if (args.mode in ['doc-to-api', 'all']) and not os.path.exists(md_path):
        print(f"Warning: API documentation not found at {md_path}")
        print(f"Skipping document-related checks.")
        args.mode = 'routes-to-api'
    
    if not os.path.exists(routes_dir):
        print(f"Error: Route directory not found at {routes_dir}")
        return 1
    
    # Define endpoints to ignore (these might be in development or deprecated)
    ignore_endpoints = set()
    if args.ignore_list:
        ignore_endpoints = {
            # Test/monitoring endpoints
            'GET /api/v1/discovery/test',
            'GET /api/v1/discovery/health',
            'GET /api/v1/discovery/db-test',
            'GET /api/v1/monitoring/api/health',
            'GET /api/v1/monitoring/api/health/database',
            'GET /api/v1/monitoring/api/health/system',
            'GET /api/v1/monitoring/api/health/email',
            'GET /api/v1/monitoring/api/health/storage',
            'GET /api/v1/monitoring/dashboard',
            'GET /api/v1/pets/test',
            
            # Internal endpoints
            'GET /api/v1/admin/analytics/usage',
            'GET /api/v1/admin/audit-logs',
            'GET /api/v1/admin/export/{type}',
            'GET /api/v1/admin/metrics',
            'GET /api/v1/admin/rescues',
            'GET /api/v1/admin/system/config',
            'GET /api/v1/admin/system/health',
            'PATCH /api/v1/admin/rescues/{rescueId}/moderate',
            'PATCH /api/v1/admin/system/config',
            'PATCH /api/v1/admin/users/{userId}/action',
            
            # Webhook/callback endpoints
            'POST /api/v1/emails/webhook/delivery',
        }
    
    # Extract endpoints
    print("\n=== Extracting Endpoints ===")
    
    # Always need to extract from OpenAPI
    openapi_endpoints = extract_endpoints_from_openapi(yaml_path)
    
    # Always need to extract from route files for the main use case
    route_endpoints = extract_endpoints_from_route_files(routes_dir)
    
    # Extract from markdown only if needed
    md_endpoints = []
    if args.mode in ['doc-to-api', 'all']:
        md_endpoints = extract_endpoints_from_markdown(md_path)
    
    success = True
    
    # Focus on the main use case: Finding routes that exist in code but not in OpenAPI
    if args.mode in ['routes-to-api', 'all']:
        print("\n=== IMPLEMENTED ROUTES MISSING FROM OPENAPI SPEC ===")
        print("(These are routes that need to be added to your OpenAPI documentation)")
        
        # Convert endpoints to sets for comparison
        route_set = {f"{method} {path}" for method, path in route_endpoints}
        openapi_set = {f"{method} {path}" for method, path in openapi_endpoints}
        
        # Find routes that are implemented but not in OpenAPI
        missing_from_openapi = route_set - openapi_set - ignore_endpoints
        
        if missing_from_openapi:
            print(f"\nFound {len(missing_from_openapi)} implemented routes missing from OpenAPI spec:")
            for endpoint in sorted(missing_from_openapi):
                print(f"  {endpoint}")
            
            # Generate template for adding to OpenAPI
            print("\n=== TEMPLATE FOR ADDING MISSING ENDPOINTS TO OPENAPI.YAML ===")
            print("Copy and paste the following into your OpenAPI specification:")
            print(generate_openapi_template(missing_from_openapi))
            
            success = False
        else:
            print("\n✅ All implemented routes are documented in the OpenAPI specification!")
    
    # Optional: Compare OpenAPI with routes to find unused endpoints
    if args.mode in ['api-to-routes', 'all']:
        print("\n=== OPENAPI ENDPOINTS MISSING FROM IMPLEMENTATION ===")
        print("(These might be planned but not yet implemented, or old/deprecated)")
        
        openapi_set = {f"{method} {path}" for method, path in openapi_endpoints}
        route_set = {f"{method} {path}" for method, path in route_endpoints}
        
        missing_from_routes = openapi_set - route_set - ignore_endpoints
        
        if missing_from_routes:
            print(f"\nFound {len(missing_from_routes)} OpenAPI endpoints not implemented in routes:")
            for endpoint in sorted(missing_from_routes):
                print(f"  {endpoint}")
            
            # This doesn't fail the check since it's normal to have planned endpoints
            print("\nNote: These might be planned endpoints or endpoints that need to be implemented.")
        else:
            print("\n✅ All OpenAPI endpoints are implemented in the routes!")
    
    # Optional: Compare API docs to OpenAPI
    if args.mode in ['doc-to-api', 'all'] and md_endpoints:
        print("\n=== API DOCS (MD) ENDPOINTS MISSING FROM OPENAPI ===")
        
        md_set = {f"{method} {path}" for method, path in md_endpoints}
        openapi_set = {f"{method} {path}" for method, path in openapi_endpoints}
        
        missing_from_openapi = md_set - openapi_set - ignore_endpoints
        
        if missing_from_openapi:
            print(f"\nFound {len(missing_from_openapi)} documented endpoints missing from OpenAPI:")
            for endpoint in sorted(missing_from_openapi):
                print(f"  {endpoint}")
            
            # This doesn't fail the check since the MD file is temporary anyway
            print("\nNote: These should be added to the OpenAPI specification.")
        else:
            print("\n✅ All documented endpoints are in the OpenAPI specification!")
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
