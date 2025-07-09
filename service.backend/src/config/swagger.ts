import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { Express } from 'express';

/**
 * Setup Swagger UI for API documentation
 */
export function setupSwagger(app: Express) {
  try {
    // Load the OpenAPI specification
    const swaggerDocument = YAML.load(path.join(__dirname, '../../docs/openapi.yaml'));

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
    app.get('/api/docs', swaggerUi.setup(swaggerDocument, options));

    // JSON endpoint for the spec
    app.get('/api/docs/swagger.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerDocument);
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
