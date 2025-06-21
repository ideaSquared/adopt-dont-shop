#!/usr/bin/env node

/**
 * Security Validation Script
 * Run this before deploying to production to validate security configuration
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(color, symbol, message) {
  console.log(`${color}${symbol} ${message}${colors.reset}`);
}

function success(message) {
  log(colors.green, '✓', message);
}

function warning(message) {
  log(colors.yellow, '⚠', message);
}

function error(message) {
  log(colors.red, '✗', message);
}

function info(message) {
  log(colors.blue, 'ℹ', message);
}

function header(message) {
  console.log(`\n${colors.bold}${colors.blue}=== ${message} ===${colors.reset}`);
}

async function validateSecurity() {
  let errors = 0;
  let warnings = 0;

  header("Security Validation for Adopt Don't Shop Backend");

  // Check if .env.example exists
  header('Environment Configuration');

  const envExamplePath = path.join(__dirname, '..', '.env.example');
  if (fs.existsSync(envExamplePath)) {
    success('.env.example file exists');
  } else {
    error('.env.example file missing');
    errors++;
  }

  // Check if critical security files exist
  const securityFiles = [
    'SECURITY.md',
    'src/middleware/rateLimiter.ts',
    'src/utils/validateEnv.ts',
    'src/middleware/auth.ts',
  ];

  header('Security Files');
  for (const file of securityFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      success(`${file} exists`);
    } else {
      error(`${file} missing`);
      errors++;
    }
  }

  // Check package.json for security dependencies
  header('Security Dependencies');

  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    const requiredSecurityDeps = ['express-rate-limit', 'helmet', 'bcrypt', 'jsonwebtoken'];

    for (const dep of requiredSecurityDeps) {
      if (packageJson.dependencies[dep]) {
        success(`${dep} dependency installed`);
      } else {
        error(`${dep} dependency missing`);
        errors++;
      }
    }
  } catch (err) {
    error('Could not read package.json');
    errors++;
  }

  // Check TypeScript configuration
  header('TypeScript Configuration');

  try {
    const tsconfigPath = path.join(__dirname, '..', 'tsconfig.json');
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));

    if (tsconfig.compilerOptions.strict) {
      success('TypeScript strict mode enabled');
    } else {
      warning('TypeScript strict mode disabled - recommend enabling for production');
      warnings++;
    }
  } catch (err) {
    warning('Could not read tsconfig.json');
    warnings++;
  }

  // Environment variable validation
  header('Environment Variables');

  const criticalEnvVars = ['JWT_SECRET', 'DB_PASSWORD', 'CORS_ORIGIN'];

  const isProduction = process.env.NODE_ENV === 'production';

  for (const envVar of criticalEnvVars) {
    if (process.env[envVar]) {
      if (envVar === 'JWT_SECRET' && process.env[envVar].length < 32) {
        error(`${envVar} is too short (minimum 32 characters required)`);
        errors++;
      } else if (envVar === 'CORS_ORIGIN' && isProduction && process.env[envVar] === '*') {
        error(`${envVar} cannot be '*' in production`);
        errors++;
      } else {
        success(`${envVar} is set`);
      }
    } else {
      if (isProduction) {
        error(`${envVar} is required in production`);
        errors++;
      } else {
        warning(`${envVar} not set (required for production)`);
        warnings++;
      }
    }
  }

  // Security configuration checks
  header('Security Configuration');

  if (process.env.DB_LOGGING === 'true' && isProduction) {
    warning('Database logging enabled in production - may expose sensitive data');
    warnings++;
  } else {
    success('Database logging appropriately configured');
  }

  if (process.env.BCRYPT_ROUNDS && Number(process.env.BCRYPT_ROUNDS) >= 12) {
    success('bcrypt rounds configured securely (12+)');
  } else {
    warning('bcrypt rounds should be 12+ for production security');
    warnings++;
  }

  // Summary
  header('Security Validation Summary');

  if (errors === 0 && warnings === 0) {
    success('All security checks passed! ✨');
    success('This service is ready for production deployment.');
  } else {
    if (errors > 0) {
      error(`${errors} critical security issue(s) found`);
    }
    if (warnings > 0) {
      warning(`${warnings} security warning(s) found`);
    }

    console.log(`\n${colors.bold}Next Steps:${colors.reset}`);
    if (errors > 0) {
      error('Fix all critical issues before production deployment');
    }
    if (warnings > 0) {
      warning('Review warnings and implement recommended security measures');
    }

    info('See SECURITY.md for detailed security guidelines');
    info('Run this script again after making changes');
  }

  // Exit with appropriate code
  process.exit(errors > 0 ? 1 : 0);
}

// Run validation
validateSecurity().catch(err => {
  error('Validation script failed:');
  console.error(err);
  process.exit(1);
});
