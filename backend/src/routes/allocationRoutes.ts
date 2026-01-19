import { Router } from 'express';
import { AllocationController } from '../controllers/AllocationController.js';

/**
 * Routes for resource allocation endpoints
 * Base path: /api/projects/:key/allocations
 */
export function createAllocationRoutes(allocationController: AllocationController): Router {
  const router = Router({ mergeParams: true });

  /**
   * @swagger
   * /api/projects/{key}/allocations:
   *   get:
   *     summary: Get all allocations for a project
   *     tags: [Allocations]
   *     parameters:
   *       - in: path
   *         name: key
   *         required: true
   *         schema:
   *           type: string
   *         description: Project key
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Filter by start date (YYYY-MM-DD)
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Filter by end date (YYYY-MM-DD)
   *     responses:
   *       200:
   *         description: List of allocations
   */
  router.get('/', allocationController.getAllocations);

  /**
   * @swagger
   * /api/projects/{key}/allocations/current:
   *   get:
   *     summary: Get current allocations for a specific week
   *     tags: [Allocations]
   *     parameters:
   *       - in: path
   *         name: key
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: weekStart
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: weekEnd
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *     responses:
   *       200:
   *         description: Current week allocations
   */
  router.get('/current', allocationController.getCurrentAllocations);

  /**
   * @swagger
   * /api/projects/{key}/allocations:
   *   post:
   *     summary: Create a new allocation
   *     tags: [Allocations]
   *     parameters:
   *       - in: path
   *         name: key
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - accountId
   *               - displayName
   *               - startDate
   *               - endDate
   *               - allocationPercent
   *             properties:
   *               accountId:
   *                 type: string
   *               displayName:
   *                 type: string
   *               avatarUrl:
   *                 type: string
   *               startDate:
   *                 type: string
   *                 format: date
   *               endDate:
   *                 type: string
   *                 format: date
   *               allocationPercent:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 200
   *               notes:
   *                 type: string
   *     responses:
   *       201:
   *         description: Allocation created
   */
  router.post('/', allocationController.createAllocation);

  /**
   * @swagger
   * /api/projects/{key}/allocations/{id}:
   *   put:
   *     summary: Update an allocation
   *     tags: [Allocations]
   *     parameters:
   *       - in: path
   *         name: key
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               startDate:
   *                 type: string
   *                 format: date
   *               endDate:
   *                 type: string
   *                 format: date
   *               allocationPercent:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 200
   *               notes:
   *                 type: string
   *     responses:
   *       200:
   *         description: Allocation updated
   */
  router.put('/:id', allocationController.updateAllocation);

  /**
   * @swagger
   * /api/projects/{key}/allocations/{id}:
   *   delete:
   *     summary: Delete an allocation
   *     tags: [Allocations]
   *     parameters:
   *       - in: path
   *         name: key
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Allocation deleted
   */
  router.delete('/:id', allocationController.deleteAllocation);

  /**
   * @swagger
   * /api/projects/{key}/allocations/snapshots:
   *   get:
   *     summary: Get historical capacity snapshots
   *     tags: [Allocations]
   *     parameters:
   *       - in: path
   *         name: key
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 12
   *     responses:
   *       200:
   *         description: List of snapshots
   */
  router.get('/snapshots', allocationController.getSnapshots);

  /**
   * @swagger
   * /api/projects/{key}/allocations/snapshots:
   *   post:
   *     summary: Create a capacity snapshot
   *     tags: [Allocations]
   *     parameters:
   *       - in: path
   *         name: key
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - weekStart
   *               - weekEnd
   *               - worklogData
   *             properties:
   *               weekStart:
   *                 type: string
   *                 format: date
   *               weekEnd:
   *                 type: string
   *                 format: date
   *               worklogData:
   *                 type: object
   *     responses:
   *       201:
   *         description: Snapshot created
   */
  router.post('/snapshots', allocationController.createSnapshot);

  return router;
}
