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
