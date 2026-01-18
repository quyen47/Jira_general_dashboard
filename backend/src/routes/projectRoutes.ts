import { Router } from 'express';
import { ProjectController } from '../controllers/ProjectController.js';

/**
 * @swagger
 * tags:
 *   - name: Health
 *     description: Health check endpoints
 *   - name: Projects
 *     description: Project management endpoints
 *   - name: Stakeholders
 *     description: Project stakeholder management
 *   - name: Quick Links
 *     description: Project quick links management
 *   - name: Saved Filters
 *     description: Project saved filters management
 *   - name: Overview
 *     description: Project overview management
 */

/**
 * Project routes
 * Clean route definitions that delegate to controller
 */
export function createProjectRoutes(controller: ProjectController): Router {
  const router = Router();

  /**
   * @swagger
   * /api/projects:
   *   get:
   *     summary: Get all projects
   *     tags: [Projects]
   *     responses:
   *       200:
   *         description: List of all projects
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Project'
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/api/projects', (req, res) => controller.getAllProjects(req, res));

  /**
   * @swagger
   * /api/projects/sync:
   *   post:
   *     summary: Sync multiple projects from Jira
   *     tags: [Projects]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: array
   *             items:
   *               type: object
   *               required:
   *                 - key
   *                 - name
   *               properties:
   *                 key:
   *                   type: string
   *                 name:
   *                   type: string
   *                 projectTypeKey:
   *                   type: string
   *                 avatarUrl:
   *                   type: string
   *                 avatarUrls:
   *                   type: object
   *     responses:
   *       200:
   *         description: Sync successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 count:
   *                   type: integer
   *       400:
   *         description: Invalid payload
   *       500:
   *         description: Server error
   */
  router.post('/api/projects/sync', (req, res) => controller.syncProjects(req, res));

  /**
   * @swagger
   * /api/projects/{key}/stakeholders:
   *   get:
   *     summary: Get stakeholders for a project
   *     tags: [Stakeholders]
   *     parameters:
   *       - in: path
   *         name: key
   *         required: true
   *         schema:
   *           type: string
   *         description: Project key
   *     responses:
   *       200:
   *         description: List of stakeholders
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Stakeholder'
   *       500:
   *         description: Server error
   */
  router.get('/api/projects/:key/stakeholders', (req, res) => 
    controller.getStakeholders(req, res)
  );

  /**
   * @swagger
   * /api/projects/{key}/stakeholders:
   *   post:
   *     summary: Save stakeholders for a project
   *     tags: [Stakeholders]
   *     parameters:
   *       - in: path
   *         name: key
   *         required: true
   *         schema:
   *           type: string
   *         description: Project key
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: array
   *             items:
   *               $ref: '#/components/schemas/Stakeholder'
   *     responses:
   *       200:
   *         description: Stakeholders saved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Stakeholder'
   *       400:
   *         description: Invalid data
   *       500:
   *         description: Server error
   */
  router.post('/api/projects/:key/stakeholders', (req, res) => 
    controller.saveStakeholders(req, res)
  );

  /**
   * @swagger
   * /api/projects/{key}/links:
   *   get:
   *     summary: Get quick links for a project
   *     tags: [Quick Links]
   *     parameters:
   *       - in: path
   *         name: key
   *         required: true
   *         schema:
   *           type: string
   *         description: Project key
   *     responses:
   *       200:
   *         description: List of quick links
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/QuickLink'
   *       500:
   *         description: Server error
   */
  router.get('/api/projects/:key/links', (req, res) => 
    controller.getQuickLinks(req, res)
  );

  /**
   * @swagger
   * /api/projects/{key}/links:
   *   post:
   *     summary: Save quick links for a project
   *     tags: [Quick Links]
   *     parameters:
   *       - in: path
   *         name: key
   *         required: true
   *         schema:
   *           type: string
   *         description: Project key
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: array
   *             items:
   *               $ref: '#/components/schemas/QuickLink'
   *     responses:
   *       200:
   *         description: Quick links saved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/QuickLink'
   *       400:
   *         description: Invalid data
   *       500:
   *         description: Server error
   */
  router.post('/api/projects/:key/links', (req, res) => 
    controller.saveQuickLinks(req, res)
  );

  /**
   * @swagger
   * /api/projects/{key}/filters:
   *   get:
   *     summary: Get saved filters for a project
   *     tags: [Saved Filters]
   *     parameters:
   *       - in: path
   *         name: key
   *         required: true
   *         schema:
   *           type: string
   *         description: Project key
   *     responses:
   *       200:
   *         description: List of saved filters
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/SavedFilter'
   *       500:
   *         description: Server error
   */
  router.get('/api/projects/:key/filters', (req, res) => 
    controller.getSavedFilters(req, res)
  );

  /**
   * @swagger
   * /api/projects/{key}/filters:
   *   post:
   *     summary: Save filters for a project
   *     tags: [Saved Filters]
   *     parameters:
   *       - in: path
   *         name: key
   *         required: true
   *         schema:
   *           type: string
   *         description: Project key
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: array
   *             items:
   *               $ref: '#/components/schemas/SavedFilter'
   *     responses:
   *       200:
   *         description: Filters saved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/SavedFilter'
   *       400:
   *         description: Invalid data
   *       500:
   *         description: Server error
   */
  router.post('/api/projects/:key/filters', (req, res) => 
    controller.saveSavedFilters(req, res)
  );

  /**
   * @swagger
   * /api/projects/{key}/overview:
   *   get:
   *     summary: Get overview for a project
   *     tags: [Overview]
   *     parameters:
   *       - in: path
   *         name: key
   *         required: true
   *         schema:
   *           type: string
   *         description: Project key
   *     responses:
   *       200:
   *         description: Project overview
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Overview'
   *       404:
   *         description: Overview not found
   *       500:
   *         description: Server error
   */
  router.get('/api/projects/:key/overview', (req, res) => 
    controller.getOverview(req, res)
  );

  /**
   * @swagger
   * /api/projects/{key}/overview:
   *   post:
   *     summary: Save overview for a project
   *     tags: [Overview]
   *     parameters:
   *       - in: path
   *         name: key
   *         required: true
   *         schema:
   *           type: string
   *         description: Project key
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               overview:
   *                 $ref: '#/components/schemas/Overview'
   *               budget:
   *                 type: object
   *               health:
   *                 type: object
   *     responses:
   *       200:
   *         description: Overview saved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Overview'
   *       400:
   *         description: Invalid data
   *       500:
   *         description: Server error
   */
  router.post('/api/projects/:key/overview', (req, res) => 
    controller.saveOverview(req, res)
  );

  return router;
}
