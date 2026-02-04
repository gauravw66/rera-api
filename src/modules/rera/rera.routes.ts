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
 * /api/rera/search/{reraNo}:
 *   get:
 *     summary: Search for a project by RERA number
 *     tags: [RERA]
 *     parameters:
 *       - in: path
 *         name: reraNo
 *         schema:
 *           type: string
 *         required: true
 *         description: The RERA registration number
 *     responses:
 *       200:
 *         description: Project summary
 *       400:
 *         description: Valid RERA number is required
 */
router.get('/search/:reraNo', ReraController.search);

/**
 * @swagger
 * /api/rera/captcha:
 *   get:
 *     summary: Get a new captcha image
 *     tags: [RERA]
 *     responses:
 *       200:
 *         description: A PNG captcha image
 */
router.get('/captcha', ReraController.getCaptcha);

/**
 * @swagger
 * /api/rera/fetch:
 *   post:
 *     summary: Fetch full project details
 *     tags: [RERA]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - reraNo
 *             properties:
 *               projectId:
 *                 type: string
 *                 description: Internal project ID
 *               reraNo:
 *                 type: string
 *                 description: RERA number
 *               captchaText:
 *                 type: string
 *                 description: Solved captcha text (only if token is not provided)
 *               token:
 *                 type: string
 *                 description: Bearer token (optional, bypasses captcha)
 *     responses:
 *       200:
 *         description: Full project details
 *       400:
 *         description: Missing required fields
 */
router.post('/fetch', ReraController.fetchDetails);

/**
 * @swagger
 * /api/rera/get:
 *   post:
 *     summary: Get project details using token and RERA number only
 *     tags: [RERA]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - reraNo
 *             properties:
 *               token:
 *                 type: string
 *                 description: Bearer token for authentication
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               reraNo:
 *                 type: string
 *                 description: RERA registration number
 *                 example: "P52100000001"
 *     responses:
 *       200:
 *         description: Full project details
 *       400:
 *         description: Missing required fields (token or reraNo)
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
router.post('/get', ReraController.getProjectByToken);

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
 *               - reraNo
 *             properties:
 *               reraNo:
 *                 type: string
 *                 description: RERA registration number
 *                 example: "P52100053447"
 *     responses:
 *       200:
 *         description: Full project details
 *       400:
 *         description: Missing reraNo
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
router.post('/auto', ReraController.getProjectAuto);

export const reraRouter = router;
