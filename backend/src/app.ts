import express, { type Application } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { PrismaClient } from '@prisma/client';
import { ProjectRepository } from './repositories/ProjectRepository.js';
import { ProjectService } from './services/projectService.js';
import { ProjectController } from './controllers/ProjectController.js';
import { createProjectRoutes } from './routes/projectRoutes.js';
import { swaggerSpec } from './swagger.js';
import { logger } from './utils/logger.js';

/**
 * Create and configure Express application
 */
export function createApp(): Application {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Initialize Prisma
  const prisma = new PrismaClient();

  // Dependency Injection: Repository → Service → Controller
  const projectRepository = new ProjectRepository(prisma);
  const projectService = new ProjectService(projectRepository);
  const projectController = new ProjectController(projectService);

  // Swagger API Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Jira Dashboard API Docs',
  }));

  /**
   * @swagger
   * /health:
   *   get:
   *     summary: Health check endpoint
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: Server is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: ok
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   */
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  // Register routes
  const projectRoutes = createProjectRoutes(projectController);
  app.use(projectRoutes);

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  logger.info('Express application configured');
  logger.info('Swagger documentation available at /api-docs');

  return app;
}
