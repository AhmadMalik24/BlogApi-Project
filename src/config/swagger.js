// config/swagger.js
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Blogging & Monetization Platform API',
      version: '1.0.0',
      description: 'API documentation for Authentication, Categories, Posts, and Payments modules.',
    },
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your Bearer token in the format: Bearer <AccessToken>',
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ['./src/api/routes/v1/*.js'], // Points to your route files for JSDoc annotations
};

const swaggerSpec = swaggerJSDoc(options);

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log('Swagger documentation available at http://localhost:5000/api-docs');
};

export default setupSwagger;