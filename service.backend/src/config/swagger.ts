<<<<<<< HEAD
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { Express } from 'express';
=======
import { Express } from 'express';
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SwaggerSpec = any;
>>>>>>> e100a78 (IN PROGRESS)

/**
 * Setup Swagger UI for API documentation
 */
export function setupSwagger(app: Express) {
  try {
<<<<<<< HEAD
    // Load the OpenAPI specification
    const swaggerDocument = YAML.load(path.join(__dirname, '../../docs/openapi.yaml'));
=======
    // swagger-jsdoc configuration
    const swaggerOptions = {
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
        path.join(__dirname, '../routes/*.ts'), // Load JSDoc from route files
        path.join(__dirname, '../controllers/*.ts'), // Load JSDoc from controllers if needed
        path.join(__dirname, '../models/*.ts'), // Load JSDoc from models if needed
      ],
    };

    // Generate OpenAPI specification from JSDoc comments
    const swaggerSpec: SwaggerSpec = swaggerJsdoc(swaggerOptions);

    // Also try to merge with existing OpenAPI YAML if it exists
    let finalSpec = swaggerSpec;
    try {
      const existingSpec: SwaggerSpec = YAML.load(path.join(__dirname, '../../docs/openapi.yaml'));
      if (existingSpec) {
        // Merge the specs - JSDoc takes precedence for paths, existing spec for schemas
        finalSpec = {
          ...existingSpec,
          ...swaggerSpec,
          paths: {
            ...existingSpec.paths,
            ...swaggerSpec.paths,
          },
          components: {
            ...existingSpec.components,
            ...swaggerSpec.components,
            securitySchemes: {
              ...existingSpec.components?.securitySchemes,
              ...swaggerSpec.components?.securitySchemes,
            },
          },
        };
      }
    } catch (yamlError) {
      console.warn('Could not load existing OpenAPI YAML file, using JSDoc-generated spec only');
    }
>>>>>>> e100a78 (IN PROGRESS)

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
<<<<<<< HEAD
    app.get('/api/docs', swaggerUi.setup(swaggerDocument, options));
=======
    app.get('/api/docs', swaggerUi.setup(finalSpec, options));
>>>>>>> e100a78 (IN PROGRESS)

    // JSON endpoint for the spec
    app.get('/api/docs/swagger.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
<<<<<<< HEAD
      res.send(swaggerDocument);
=======
      res.send(finalSpec);
>>>>>>> e100a78 (IN PROGRESS)
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
      // eslint-disable-next-line no-console
      console.log('📖 Swagger UI setup complete');
      // eslint-disable-next-line no-console
      console.log('📍 API Documentation available at: /api/docs');
      // eslint-disable-next-line no-console
      console.log('📄 OpenAPI JSON available at: /api/docs/swagger.json');
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to setup Swagger UI:', error);
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
