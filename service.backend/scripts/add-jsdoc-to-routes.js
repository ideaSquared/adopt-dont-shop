#!/usr/bin/env node

/**
 * Script to add JSDoc comments to Express route files
 * This script helps automate the process of adding Swagger JSDoc comments to route definitions
 */

const fs = require('fs');
const path = require('path');

// Route files to process
const routeFiles = [
  'rescue.routes.ts',
  'chat.routes.ts',
  'email.routes.ts',
  'admin.routes.ts',
  'notification.routes.ts',
  'discovery.routes.ts',
  'monitoring.routes.ts'
];

// Common JSDoc templates for different HTTP methods
const templates = {
  get: (route, tag, summary, description) => `
/**
 * @swagger
 * ${route}:
 *   get:
 *     tags: [${tag}]
 *     summary: ${summary}
 *     description: ${description}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: ${summary} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */`,

  post: (route, tag, summary, description) => `
/**
 * @swagger
 * ${route}:
 *   post:
 *     tags: [${tag}]
 *     summary: ${summary}
 *     description: ${description}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: ${summary} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "${summary} successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */`,

  put: (route, tag, summary, description) => `
/**
 * @swagger
 * ${route}:
 *   put:
 *     tags: [${tag}]
 *     summary: ${summary}
 *     description: ${description}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       200:
 *         description: ${summary} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "${summary} successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */`,

  delete: (route, tag, summary, description) => `
/**
 * @swagger
 * ${route}:
 *   delete:
 *     tags: [${tag}]
 *     summary: ${summary}
 *     description: ${description}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: ${summary} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "${summary} successful"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */`,

  patch: (route, tag, summary, description) => `
/**
 * @swagger
 * ${route}:
 *   patch:
 *     tags: [${tag}]
 *     summary: ${summary}
 *     description: ${description}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       200:
 *         description: ${summary} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "${summary} successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */`
};

// Tag mappings for different route files
const tagMappings = {
  'rescue.routes.ts': 'Rescue Organizations',
  'chat.routes.ts': 'Messaging',
  'email.routes.ts': 'Email Management',
  'admin.routes.ts': 'Admin Management',
  'notification.routes.ts': 'Notifications',
  'discovery.routes.ts': 'Discovery Service',
  'monitoring.routes.ts': 'Monitoring'
};

function extractRouteInfo(line, fileName) {
  // Match router.method('path', ...) patterns
  const routeMatch = line.match(/router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/i);
  if (!routeMatch) return null;

  const method = routeMatch[1].toLowerCase();
  const routePath = routeMatch[2];
  const tag = tagMappings[fileName] || 'API';
  
  // Generate API path
  const resourceName = fileName.split('.')[0];
  let apiPath;
  
  if (routePath.startsWith('/')) {
    apiPath = `/api/v1${routePath}`;
  } else {
    apiPath = `/api/v1/${resourceName}/${routePath}`;
  }
  
  // Convert :param to {param} for OpenAPI
  apiPath = apiPath.replace(/:(\w+)/g, '{$1}');
  
  // Generate summary and description
  let summary = `${method.toUpperCase()} ${apiPath}`;
  let description = `Handle ${method.toUpperCase()} request for ${apiPath}`;
  
  // Try to extract summary from comments
  const commentMatch = line.match(/\/\/\s*(.+)$/);
  if (commentMatch) {
    summary = commentMatch[1].trim();
    description = `${summary} - ${description}`;
  }

  return {
    method,
    apiPath,
    tag,
    summary,
    description,
    originalLine: line.trim()
  };
}

function processRouteFile(filePath) {
  console.log(`\nProcessing ${path.basename(filePath)}...`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const fileName = path.basename(filePath);
  
  const newLines = [];
  let routeCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line contains a route definition
    const routeInfo = extractRouteInfo(line, fileName);
    
    if (routeInfo) {
      // Check if JSDoc already exists (look for @swagger in previous lines)
      let hasJSDoc = false;
      for (let j = Math.max(0, i - 10); j < i; j++) {
        if (lines[j].includes('@swagger')) {
          hasJSDoc = true;
          break;
        }
      }
      
      if (!hasJSDoc) {
        // Add JSDoc comment before the route
        const template = templates[routeInfo.method];
        if (template) {
          const jsdoc = template(
            routeInfo.apiPath,
            routeInfo.tag,
            routeInfo.summary,
            routeInfo.description
          );
          newLines.push(jsdoc);
          routeCount++;
        }
      }
    }
    
    newLines.push(line);
  }
  
  if (routeCount > 0) {
    fs.writeFileSync(filePath, newLines.join('\n'));
    console.log(`✅ Added JSDoc to ${routeCount} routes in ${fileName}`);
  } else {
    console.log(`ℹ️  No new JSDoc comments needed for ${fileName}`);
  }
  
  return routeCount;
}

function main() {
  console.log('🚀 Adding JSDoc comments to route files...\n');
  
  const routesDir = path.join(__dirname, '..', 'src', 'routes');
  let totalRoutes = 0;
  
  for (const fileName of routeFiles) {
    const filePath = path.join(routesDir, fileName);
    
    if (fs.existsSync(filePath)) {
      totalRoutes += processRouteFile(filePath);
    } else {
      console.log(`⚠️  File not found: ${fileName}`);
    }
  }
  
  console.log(`\n🎉 Complete! Added JSDoc comments to ${totalRoutes} routes total.`);
  console.log('\n📝 Next steps:');
  console.log('1. Review the generated JSDoc comments');
  console.log('2. Customize request/response schemas as needed');
  console.log('3. Add parameter descriptions for path/query parameters');
  console.log('4. Test the Swagger UI at /api/docs');
}

if (require.main === module) {
  main();
}

module.exports = { processRouteFile, extractRouteInfo };
