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
        base_path = None
        file_name = os.path.basename(route_file)
        resource_name = file_name.split('.')[0]  # Extract resource name from filename
        
        with open(route_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # Look for base path prefix (often in the index.ts file that imports all routes)
            base_path_match = re.search(r"app\.use\(['\"](/api/v\d+/[^'\"]+)['\"]", content)
            if base_path_match:
                base_path = base_path_match.group(1)
            else:
                # Default base path based on file name
                base_path = f"/api/v1/{resource_name.lower()}"
            
            # Extract route definitions
            # This regex looks for router.METHOD patterns like router.get('/', handler)
            for method in http_methods:
                # Match patterns like: router.get('/path', ...)
                # and: router.get( '/path', ...)
                # and: router[method]('/path', ...)
                route_pattern = rf"router(?:\.|\[['\"]{method}['\"])\s*\(\s*['\"]([^'\"]+)['\"]"
                for match in re.finditer(route_pattern, content, re.IGNORECASE):
                    route_path = match.group(1)
                    
                    # Skip if this is a parameter route like router.param()
                    if method == 'param':
                        continue
                        
                    # Normalize path
                    if route_path.startswith('/'):
                        # Absolute path within the router
                        full_path = f"{base_path}{route_path}"
                    else:
                        # Relative path
                        full_path = f"{base_path}/{route_path}"
                    
                    # Normalize path parameters from :param to {param}
                    full_path = re.sub(r':(\w+)', r'{\1}', full_path)
                    
                    # Clean up any double slashes
                    full_path = full_path.replace('//', '/')
                    
                    endpoints.append((method.upper(), full_path))
    
    # Print summary of endpoints found
    if endpoints:
        print(f"Sample endpoints from route files (first 5 of {len(endpoints)}):")
        for method, path in endpoints[:5]:
            print(f"  {method} {path}")
    
    return endpoints
