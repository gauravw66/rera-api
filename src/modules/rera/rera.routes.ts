import { Router } from 'express';
import { ReraController } from './rera.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: RERA
 *   description: MahaRERA Data Extraction API
 */

/**
 * @swagger
 * /api/rera/auto:
 *   post:
 *     summary: Get project details using auto-refreshed token (no token required)
 *     tags: [RERA]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *             properties:
 *               projectId:
 *                 type: integer
 *                 description: Internal project ID
 *                 example: 3416
 *               reraNo:
 *                 type: string
 *                 description: RERA registration number (optional, used for persistence)
 *                 example: "P52100000432"
 *     responses:
 *       200:
 *         description: Full project details
 *       400:
 *         description: Missing projectId
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
router.post('/auto', ReraController.getProjectAuto);

/**
 * @swagger
 * /api/rera/auto-bulk:
 *   post:
 *     summary: Bulk fetch project details using auto-refreshed token
 *     tags: [RERA]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projects:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - projectId
 *                   properties:
 *                     projectId:
 *                       type: integer
 *                       example: 451
 *                     reraNumber:
 *                       type: string
 *                       example: "P52100012123"
 *               startIndex:
 *                 type: integer
 *                 minimum: 0
 *                 example: 0
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 example: 50
 *               delayMs:
 *                 type: integer
 *                 minimum: 0
 *                 example: 300
 *     responses:
 *       200:
 *         description: Bulk processing summary
 *       400:
 *         description: Invalid input payload
 *       500:
 *         description: Server error
 */
router.post('/auto-bulk', ReraController.bulkAuto);

/**
 * @swagger
 * /api/rera/pincode/{pincode}:
 *   get:
 *     summary: List projects by pincode from local DB
 *     tags: [RERA]
 *     parameters:
 *       - in: path
 *         name: pincode
 *         required: true
 *         schema:
 *           type: string
 *         description: Pincode to filter project land address
 *       - in: query
 *         name: includeRevoked
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include revoked/deregistered projects
 *     responses:
 *       200:
 *         description: List of matching projects with RERA number and project ID
 *       400:
 *         description: Missing or invalid pincode
 *       500:
 *         description: Server error
 */
router.get('/pincode/:pincode', ReraController.listByPincode);

/**
 * @swagger
 * /api/rera/pincode-live/{pincode}:
 *   get:
 *     summary: List projects by pincode from MahaRERA website (live)
 *     tags: [RERA]
 *     parameters:
 *       - in: path
 *         name: pincode
 *         required: true
 *         schema:
 *           type: string
 *         description: Pincode to filter project search
 *       - in: query
 *         name: includeRevoked
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include revoked projects
 *       - in: query
 *         name: maxPages
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Limit number of pages to fetch (default fetches all)
 *     responses:
 *       200:
 *         description: List of matching projects with RERA number and project ID
 *       400:
 *         description: Missing or invalid inputs
 *       500:
 *         description: Server error
 */
router.get('/pincode-live/:pincode', ReraController.listByPincodeLive);

/**
 * @swagger
 * /api/rera/document:
 *   post:
 *     summary: Download a MahaRERA DMS document
 *     tags: [RERA]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documentId
 *             properties:
 *               documentId:
 *                 type: string
 *                 description: DMS document reference ID
 *                 example: "61618a44-58ac-4dba-a5f4-66b548ceb3ae"
 *               fileName:
 *                 type: string
 *                 description: Optional file name for content disposition
 *                 example: "Pan card.pdf"
 *     responses:
 *       200:
 *         description: Document bytes
 *       400:
 *         description: Missing documentId
 *       500:
 *         description: Server error
 */
router.post('/document', ReraController.downloadDocument);

export const reraRouter = router;
