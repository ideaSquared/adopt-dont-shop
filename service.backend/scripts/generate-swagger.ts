#!/usr/bin/env node

/**
 * @fileoverview Swagger documentation generator and validator
 * This script helps with automatic generation and validation of OpenAPI documentation
 */

/* eslint-disable no-console */

import fs from 'fs-extra';
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import YAML from 'yamljs';

const SRC_DIR = path.join(__dirname, '../src');
const DOCS_DIR = path.join(__dirname, '../docs');
const OUTPUT_FILE = path.join(DOCS_DIR, 'generated-openapi.yaml');

interface SwaggerOptions {
  definition: {
    openapi: string;
    info: {
      title: string;
      version: string;
      description: string;
    };
    servers: Array<{
      url: string;
      description: string;
    }>;
  };
  apis: string[];
}

/**
 * Generate OpenAPI specification from JSDoc comments
 */
function generateSpec(): unknown {
  const swaggerOptions: SwaggerOptions = {
    definition: {
      openapi: '3.0.3',
      info: {
        title: "Adopt Don't Shop API",
        version: '1.0.0',
        description: 'Auto-generated API documentation from JSDoc comments',
      },
      servers: [
        {
          url: 'http://localhost:5000',
          description: 'Development server',
        },
        {
          url: 'https://api-staging.adoptdontshop.com',
          description: 'Staging server',
        },
        {
          url: 'https://api.adoptdontshop.com',
          description: 'Production server',
        },
      ],
    },
    apis: [
      // Schema definitions
      path.join(SRC_DIR, 'config/swagger-schemas.ts'),

      // Route files
      path.join(SRC_DIR, 'routes/*.ts'),
      path.join(SRC_DIR, 'routes/**/*.ts'),

      // Controller files
      path.join(SRC_DIR, 'controllers/*.ts'),
      path.join(SRC_DIR, 'controllers/**/*.ts'),

      // Model files
      path.join(SRC_DIR, 'models/*.ts'),
      path.join(SRC_DIR, 'models/**/*.ts'),

      // Type definitions
      path.join(SRC_DIR, 'types/*.ts'),

      // Middleware files
      path.join(SRC_DIR, 'middleware/*.ts'),
    ],
  };

  return swaggerJsdoc(swaggerOptions);
}

/**
 * Validate the generated OpenAPI specification
 */
function validateSpec(spec: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    // Basic structure validation
    if (!spec || typeof spec !== 'object') {
      errors.push('Invalid spec: not an object');
      return { valid: false, errors };
    }

    const specObj = spec as Record<string, unknown>;

    // Check required fields
    if (!specObj.openapi) {
      errors.push('Missing required field: openapi');
    }

    if (!specObj.info) {
      errors.push('Missing required field: info');
    }

    if (!specObj.paths) {
      errors.push('Missing required field: paths');
    }

    // Check if paths exist
    const paths = specObj.paths as Record<string, unknown>;
    if (paths && Object.keys(paths).length === 0) {
      console.warn('Warning: No API paths found in JSDoc comments');
    }

    // Check if components exist
    const components = specObj.components as Record<string, unknown>;
    if (!components || !components.schemas) {
      console.warn('Warning: No component schemas found');
    }

    return { valid: errors.length === 0, errors };
  } catch (error) {
    errors.push(`Validation error: ${error}`);
    return { valid: false, errors };
  }
}

/**
 * Save spec to file
 */
async function saveSpec(spec: unknown): Promise<void> {
  try {
    await fs.ensureDir(DOCS_DIR);

    // Save as YAML
    const yamlContent = YAML.stringify(spec, 4);
    await fs.writeFile(OUTPUT_FILE, yamlContent, 'utf8');

    // Save as JSON for debugging
    const jsonFile = OUTPUT_FILE.replace('.yaml', '.json');
    await fs.writeFile(jsonFile, JSON.stringify(spec, null, 2), 'utf8');

    console.log(`✅ Spec saved to: ${OUTPUT_FILE}`);
    console.log(`📄 JSON version: ${jsonFile}`);
  } catch (error) {
    console.error('❌ Failed to save spec:', error);
    throw error;
  }
}

/**
 * Check for common JSDoc issues in files
 */
function checkJsDocCoverage(): void {
  const routeFiles = [
    ...fs.readdirSync(path.join(SRC_DIR, 'routes')).map(f => path.join(SRC_DIR, 'routes', f)),
  ].filter(f => f.endsWith('.ts'));

  const issues: string[] = [];

  for (const file of routeFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');

      // Check for route definitions without JSDoc
      const routeRegex = /router\.(get|post|put|patch|delete)\(/g;
      const swaggerRegex = /@swagger/g;

      const routeMatches = content.match(routeRegex) || [];
      const swaggerMatches = content.match(swaggerRegex) || [];

      if (routeMatches.length > swaggerMatches.length) {
        issues.push(`${file}: ${routeMatches.length - swaggerMatches.length} routes missing JSDoc`);
      }

      // Check for missing tags
      if (swaggerMatches.length > 0 && !content.includes('tags:')) {
        issues.push(`${file}: JSDoc found but no tags specified`);
      }
    } catch (error) {
      console.warn(`⚠️ Could not analyze ${file}:`, error);
    }
  }

  if (issues.length > 0) {
    console.log('\n📋 JSDoc Coverage Issues:');
    issues.forEach(issue => console.log(`  • ${issue}`));
  } else {
    console.log('✅ All routes have JSDoc documentation');
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'generate';

  console.log('🚀 Swagger Documentation Generator\n');

  try {
    switch (command) {
      case 'generate': {
        console.log('📖 Generating OpenAPI specification from JSDoc...');
        const spec = generateSpec();

        console.log('✅ Validating specification...');
        const validation = validateSpec(spec);

        if (!validation.valid) {
          console.error('❌ Validation failed:');
          validation.errors.forEach(error => console.error(`  • ${error}`));
          throw new Error('OpenAPI specification validation failed');
        }

        await saveSpec(spec);
        console.log('✅ Documentation generated successfully!');
        break;
      }

      case 'validate': {
        console.log('🔍 Validating existing JSDoc coverage...');
        checkJsDocCoverage();
        break;
      }

      case 'watch': {
        console.log('👀 Watching for changes...');
        // In a real implementation, you'd set up file watchers here
        console.log('Watch mode not implemented yet. Use --dev mode in your server instead.');
        break;
      }

      default: {
        console.log(`Usage: ${process.argv[1]} [generate|validate|watch]`);
        console.log('Commands:');
        console.log('  generate  - Generate OpenAPI spec from JSDoc (default)');
        console.log('  validate  - Check JSDoc coverage in route files');
        console.log('  watch     - Watch for changes and regenerate');
        break;
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  });
}

export { checkJsDocCoverage, generateSpec, saveSpec, validateSpec };
