import { Express } from 'express';
import path from 'path';
import swaggerJsdoc, { Options, OAS3Definition } from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { logger } from '../utils/logger';

// Type for the generated Swagger specification
type SwaggerSpec = OAS3Definition & { paths?: Record<string, unknown> };

/**
 * Setup Swagger UI for API documentation
 */
export function setupSwagger(app: Express) {
  try {
    // swagger-jsdoc configuration
    const swaggerOptions: Options = {
      definition: {
        openapi: '3.0.3',
        info: {
          title: "Adopt Don't Shop API",
          version: '1.0.0',
          description:
            "REST API for the Adopt Don't Shop platform - connecting pets with loving homes",
          contact: {
            name: 'API Support',
            email: 'api@adoptdontshop.com',
          },
          license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT',
          },
        },
        servers: [
          {
            url:
              process.env.NODE_ENV === 'production'
                ? 'https://api.adoptdontshop.com'
                : process.env.NODE_ENV === 'staging'
                  ? 'https://api-staging.adoptdontshop.com'
                  : 'http://localhost:5000',
            description: `${process.env.NODE_ENV || 'development'} server`,
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
            cookieAuth: {
              type: 'apiKey',
              in: 'cookie',
              name: 'authToken',
            },
          },
          responses: {
            UnauthorizedError: {
              description: 'Authentication information is missing or invalid',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string',
                        example: 'Unauthorized',
                      },
                      message: {
                        type: 'string',
                        example: 'Authentication required',
                      },
                    },
                  },
                },
              },
            },
            ForbiddenError: {
              description: 'Insufficient permissions',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string',
                        example: 'Forbidden',
                      },
                      message: {
                        type: 'string',
                        example: 'Insufficient permissions',
                      },
                    },
                  },
                },
              },
            },
            NotFoundError: {
              description: 'Resource not found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string',
                        example: 'Not Found',
                      },
                      message: {
                        type: 'string',
                        example: 'Resource not found',
                      },
                    },
                  },
                },
              },
            },
            ValidationError: {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string',
                        example: 'Validation Error',
                      },
                      details: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            field: {
                              type: 'string',
                            },
                            message: {
                              type: 'string',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
          {
            cookieAuth: [],
          },
        ],
      },
      apis: [
        // Centralized schema definitions
        path.join(__dirname, './swagger-schemas.ts'),

        // Routes with JSDoc comments
        path.join(__dirname, '../routes/*.ts'),
        path.join(__dirname, '../routes/**/*.ts'),

        // Controllers with JSDoc comments
        path.join(__dirname, '../controllers/*.ts'),
        path.join(__dirname, '../controllers/**/*.ts'),

        // Models with JSDoc schema definitions
        path.join(__dirname, '../models/*.ts'),
        path.join(__dirname, '../models/**/*.ts'),

        // Services with JSDoc for complex schemas
        path.join(__dirname, '../services/*.ts'),

        // Types directory for shared schemas
        path.join(__dirname, '../types/*.ts'),

        // Middleware with JSDoc for common responses
        path.join(__dirname, '../middleware/*.ts'),
      ],
    };

    // Generate OpenAPI specification from JSDoc comments
    const swaggerSpec = swaggerJsdoc(swaggerOptions) as SwaggerSpec;

    // Also try to merge with existing OpenAPI YAML if it exists
    let finalSpec: SwaggerSpec = swaggerSpec;
    try {
      const existingSpec = YAML.load(path.join(__dirname, '../../docs/openapi.yaml')) as
        | SwaggerSpec
        | undefined;
      if (existingSpec) {
        // Merge the specs - JSDoc takes precedence for paths, existing spec for schemas
        finalSpec = {
          ...existingSpec,
          ...swaggerSpec,
          paths: {
            ...(existingSpec.paths || {}),
            ...(swaggerSpec.paths || {}),
          },
          components: {
            ...(existingSpec.components || {}),
            ...(swaggerSpec.components || {}),
            securitySchemes: {
              ...(existingSpec.components?.securitySchemes || {}),
              ...(swaggerSpec.components?.securitySchemes || {}),
            },
          },
        };
      }
    } catch (yamlError) {
      logger.warn('Could not load existing OpenAPI YAML file, using JSDoc-generated spec only');
    }

    // Swagger UI options
    const options = {
      explorer: true,
      swaggerOptions: {
        docExpansion: 'list',
        filter: true,
        showRequestDuration: true,
        tryItOutEnabled: true,
        requestInterceptor: (req: Request) => {
          // Add any request interceptors here
          return req;
        },
      },
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .scheme-container { margin: 0; padding: 0; }
        .swagger-ui .info { margin: 20px 0; }
        .swagger-ui .info .title { color: #3b82f6; }
        .swagger-ui .btn.authorize { background-color: #10b981; border-color: #10b981; }
        .swagger-ui .btn.authorize:hover { background-color: #059669; border-color: #059669; }
        .swagger-ui .response-col_status { color: #10b981; }
        .swagger-ui .response.highlighted { border-color: #3b82f6; }
      `,
      customSiteTitle: "Adopt Don't Shop API Documentation",
      customfavIcon: '/favicon.ico',
    };

    // Setup Swagger UI middleware
    app.use('/api/docs', swaggerUi.serve);
    app.get('/api/docs', swaggerUi.setup(finalSpec, options));

    // JSON endpoint for the spec
    app.get('/api/docs/swagger.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(finalSpec);
    });

    // YAML endpoint for the spec
    app.get('/api/docs/swagger.yaml', (req, res) => {
      res.setHeader('Content-Type', 'text/yaml');
      res.send(YAML.stringify(finalSpec, 4));
    });

    // Health check endpoint for docs
    app.get('/api/docs/health', (req, res) => {
      res.json({
        success: true,
        message: 'Swagger documentation is available',
        endpoints: {
          ui: '/api/docs',
          json: '/api/docs/swagger.json',
          yaml: '/api/docs/swagger.yaml',
        },
      });
    });

    if (process.env.NODE_ENV === 'development') {
      logger.info('Swagger UI setup complete');
      logger.info('API Documentation available at: /api/docs');
      logger.info('OpenAPI JSON available at: /api/docs/swagger.json');
    }
  } catch (error) {
    logger.error('Failed to setup Swagger UI:', { error });
  }
}

/**
 * Generate dynamic API documentation based on environment
 */
export function getApiDocumentation() {
  const baseUrl =
    process.env.NODE_ENV === 'production'
      ? 'https://api.adoptdontshop.com'
      : process.env.NODE_ENV === 'staging'
        ? 'https://api-staging.adoptdontshop.com'
        : 'http://localhost:5000';

  return {
    openapi: '3.0.3',
    info: {
      title: "Adopt Don't Shop API",
      version: '1.0.0',
      description: "Interactive API documentation for the Adopt Don't Shop platform",
    },
    servers: [
      {
        url: baseUrl,
        description: `${process.env.NODE_ENV || 'development'} server`,
      },
    ],
  };
}

export default setupSwagger;
