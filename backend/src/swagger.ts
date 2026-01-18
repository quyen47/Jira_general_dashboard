import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config/unifiedConfig.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Jira Dashboard API',
      version: '1.0.0',
      description: 'API documentation for the Jira Dashboard backend',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}`,
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        Project: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            key: { type: 'string' },
            name: { type: 'string' },
            lead: { type: 'string' },
            type: { type: 'string' },
            avatarUrl: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Stakeholder: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            role: { type: 'string' },
            accountId: { type: 'string' },
            displayName: { type: 'string' },
            avatarUrl: { type: 'string' },
          },
        },
        QuickLink: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            url: { type: 'string' },
          },
        },
        SavedFilter: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            jql: { type: 'string' },
            description: { type: 'string' },
          },
        },
        Overview: {
          type: 'object',
          properties: {
            schdHealth: { type: 'string' },
            complexity: { type: 'string' },
            projectType: { type: 'string', nullable: true },
            projectStatus: { type: 'string', nullable: true },
            planStartDate: { type: 'string', nullable: true },
            planEndDate: { type: 'string', nullable: true },
            percentComplete: { type: 'string', nullable: true },
            clientLocation: { type: 'string', nullable: true },
            currentPhase: { type: 'string', nullable: true },
            bpwTargetMargin: { type: 'string', nullable: true },
            budget: { type: 'object' },
            health: { type: 'object' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            context: { type: 'string' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'], // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options);
