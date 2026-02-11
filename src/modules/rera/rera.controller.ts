import { Request, Response } from 'express';
import { ReraService } from '../../services/rera.service';
import { SessionManager } from '../../utils/session.manager';
import prisma from '../../prisma/client';

export class ReraController {
  static async search(req: Request, res: Response) {
    const { reraNo } = req.params;
    if (!reraNo || typeof reraNo !== 'string') {
      return res.status(400).json({ message: 'Valid RERA number is required' });
    }
    const project = await ReraService.searchByReraNo(reraNo);
    res.json(project);
  }

  static async listByPincode(req: Request, res: Response) {
    const { pincode } = req.params;
    const includeRevoked = String(req.query.includeRevoked ?? 'false').toLowerCase() === 'true';

    if (!pincode || typeof pincode !== 'string') {
      return res.status(400).json({ message: 'Valid pincode is required' });
    }

    try {
      const projects = await ReraService.listProjectsByPincode(pincode, { includeRevoked });
      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching projects by pincode', error: error.message });
    }
  }

  static async listByPincodeLive(req: Request, res: Response) {
    const { pincode } = req.params;
    const includeRevoked = String(req.query.includeRevoked ?? 'false').toLowerCase() === 'true';
    const maxPagesRaw = req.query.maxPages;
    const maxPages = maxPagesRaw ? Number.parseInt(String(maxPagesRaw), 10) : undefined;

    if (!pincode || typeof pincode !== 'string') {
      return res.status(400).json({ message: 'Valid pincode is required' });
    }

    if (maxPages !== undefined && (Number.isNaN(maxPages) || maxPages <= 0)) {
      return res.status(400).json({ message: 'maxPages must be a positive integer' });
    }

    try {
      const projects = await ReraService.listProjectsByPincodeLive(pincode, { includeRevoked, maxPages });
      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching live projects by pincode', error: error.message });
    }
  }

  static async getCaptcha(req: Request, res: Response) {
    const captchaBuffer = await ReraService.getCaptcha();
    res.set('Content-Type', 'image/png');
    res.send(captchaBuffer);
  }

  static async fetchDetails(req: Request, res: Response) {
    const { projectId, reraNo, captchaText, token } = req.body;
    
    if (token) {
      await SessionManager.setAccessToken(token);
    }

    if (!projectId || !reraNo) {
      return res.status(400).json({ message: 'projectId and reraNo are required' });
    }

    // If token is provided, captchaText becomes optional
    if (!token && !captchaText) {
      return res.status(400).json({ message: 'captchaText is required when token is not provided' });
    }

    const project = await ReraService.fetchProjectDetails(projectId, captchaText || null, reraNo);
    res.json(project);
  }

  /**
   * Simplified endpoint: accepts only token and RERA number
   */
  static async getProjectByToken(req: Request, res: Response) {
    const { token, reraNo } = req.body;
    
    if (!token || !reraNo) {
      return res.status(400).json({ 
        message: 'Both token and reraNo are required',
        example: {
          token: 'your-bearer-token-here',
          reraNo: 'P52100000001'
        }
      });
    }

    try {
      // Clear any existing session/token before setting new one
      await SessionManager.clearSession();
      
      // Set the token in SessionManager
      await SessionManager.setAccessToken(token);
      
      console.log(`Searching for project with RERA number: ${reraNo}`);
      
      // First, search for the project to get the projectId
      const searchResult = await ReraService.searchByReraNo(reraNo);
      
      if (!searchResult || !searchResult.projectId) {
        return res.status(404).json({ message: 'Project not found with the given RERA number' });
      }

      console.log(`Found project ID: ${searchResult.projectId}`);

      // Fetch full project details using the projectId
      const project = await ReraService.fetchProjectDetails(
        searchResult.projectId, 
        null, // No captcha needed when using token
        reraNo
      );
      
      res.json(project);
    } catch (error: any) {
      console.error('Error in getProjectByToken:', error.message);
      
      // Provide more specific error messages
      if (error.response?.status === 401) {
        return res.status(401).json({ 
          message: 'Invalid or expired token', 
          error: 'Authentication failed. Please check your token.' 
        });
      }
      
      if (error.response?.status === 404) {
        return res.status(404).json({ 
          message: 'Project not found', 
          error: 'No project found with the given project ID.' 
        });
      }
      
      res.status(500).json({ 
        message: 'Error fetching project details', 
        error: error.message 
      });
    }
  }

  /**
   * Simplified endpoint using auto-refreshed token (no token required in request)
   */
  static async getProjectAuto(req: Request, res: Response) {
    const { reraNo, projectId } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ 
        message: 'projectId is required',
        example: {
          projectId: 3416,
          reraNo: 'P52100000432'
        }
      });
    }

    try {
      // Token is already set by TokenRefreshService, no need to set it here
      const targetProjectId = String(projectId);
      const targetReraNo = reraNo;

      console.log(`[AUTO] Using provided Project ID: ${targetProjectId}`);

      console.log(`[AUTO] Fetching details for Project ID: ${targetProjectId}`);

      // Fetch full project details using the projectId
      const project = await ReraService.fetchProjectDetails(
        targetProjectId, 
        null, // No captcha needed when using token
        targetReraNo
      );
      
      res.json(project);
    } catch (error: any) {
      console.error('[AUTO] Error in getProjectAuto:', error.message);
      
      // Provide more specific error messages
      if (error.response?.status === 401) {
        return res.status(401).json({ 
          message: 'Token expired or invalid', 
          error: 'Please wait for automatic token refresh or restart the server.' 
        });
      }
      
      if (error.response?.status === 404) {
        return res.status(404).json({ 
          message: 'Project not found', 
          error: 'No project found with the given RERA number.' 
        });
      }
      
      res.status(500).json({ 
        message: 'Error fetching project details', 
        error: error.message 
      });
    }
  }

  static async bulkAuto(req: Request, res: Response) {
    const body = req.body;
    const inputProjects = Array.isArray(body) ? body : body?.projects;
    const startIndexRaw = body?.startIndex ?? 0;
    const limitRaw = body?.limit;
    const delayMsRaw = body?.delayMs ?? 300;

    if (!Array.isArray(inputProjects)) {
      return res.status(400).json({
        message: 'Provide an array of projects or a { projects: [...] } payload.'
      });
    }

    const startIndex = Number.parseInt(String(startIndexRaw), 10);
    const limit = limitRaw !== undefined ? Number.parseInt(String(limitRaw), 10) : undefined;
    const delayMs = Number.parseInt(String(delayMsRaw), 10);

    if (Number.isNaN(startIndex) || startIndex < 0) {
      return res.status(400).json({ message: 'startIndex must be a non-negative integer' });
    }
    if (limit !== undefined && (Number.isNaN(limit) || limit <= 0)) {
      return res.status(400).json({ message: 'limit must be a positive integer' });
    }
    if (Number.isNaN(delayMs) || delayMs < 0) {
      return res.status(400).json({ message: 'delayMs must be a non-negative integer' });
    }

    const shouldSlice = Array.isArray(body) || body?.sliceOnServer === true || limit !== undefined;
    const sliceEnd = limit ? startIndex + limit : inputProjects.length;
    const projects = shouldSlice ? inputProjects.slice(startIndex, sliceEnd) : inputProjects;

    const failures: Array<{ index: number; projectId?: string | number; reraNumber?: string; error: string }> = [];
    const results: Array<{ index: number; projectId?: number; reraNumber?: string; status: 'success' | 'skipped' | 'failed'; error?: string }> = [];
    let successCount = 0;
    let skippedCount = 0;

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let offset = 0; offset < projects.length; offset += 1) {
      const index = startIndex + offset;
      const item = projects[offset] ?? {};
      const projectId = item.projectId ?? item.project_id ?? item.id;
      const reraNumber = item.reraNumber ?? item.reraNo ?? item.rera_no;
      const projectIdNumber = Number.parseInt(String(projectId), 10);

      if (Number.isNaN(projectIdNumber)) {
        const errorMessage = 'projectId must be a valid integer';
        failures.push({ index, projectId, reraNumber, error: errorMessage });
        results.push({ index, projectId: undefined, reraNumber, status: 'failed', error: errorMessage });
        continue;
      }

      if (!projectId) {
        failures.push({ index, projectId, reraNumber, error: 'projectId is required' });
        continue;
      }

      try {
        const existing = await prisma.reraProject.findUnique({
          where: { projectId: projectIdNumber },
          select: { projectId: true, apiResponseJson: true, rawResponses: true }
        });

        if (existing && (existing.apiResponseJson || existing.rawResponses)) {
          skippedCount += 1;
          results.push({ index, projectId: projectIdNumber, reraNumber, status: 'skipped' });
          continue;
        }

        await ReraService.fetchProjectDetails(String(projectIdNumber), null, reraNumber);
        successCount += 1;
        results.push({ index, projectId: projectIdNumber, reraNumber, status: 'success' });
      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error';
        failures.push({
          index,
          projectId: projectIdNumber,
          reraNumber,
          error: errorMessage
        });
        results.push({ index, projectId: projectIdNumber, reraNumber, status: 'failed', error: errorMessage });
      }

      if (delayMs > 0 && offset < projects.length - 1) {
        await sleep(delayMs);
      }
    }

    res.json({
      total: inputProjects.length,
      processed: projects.length,
      successCount,
      skippedCount,
      failureCount: failures.length,
      failures,
      results
    });
  }

  /**
   * Proxy download for MahaRERA DMS documents
   */
  static async downloadDocument(req: Request, res: Response) {
    const { documentId, fileName } = req.body;

    if (!documentId || typeof documentId !== 'string') {
      return res.status(400).json({
        message: 'documentId is required',
        example: {
          documentId: '61618a44-58ac-4dba-a5f4-66b548ceb3ae',
          fileName: 'Pan card.pdf'
        }
      });
    }

    try {
      const client = await SessionManager.getClient();
      const response = await client.post(
        'https://maharerait.maharashtra.gov.in/api/maha-rera-dms-service/batch-job/downloadDocumentForPublicView',
        {
          documentId,
          fileName
        },
        {
          responseType: 'arraybuffer'
        }
      );

      const contentType = response.headers['content-type'] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      if (fileName) {
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      }
      res.send(Buffer.from(response.data));
    } catch (error: any) {
      console.error('[DMS] Error downloading document:', error.message);
      const status = error.response?.status || 500;
      res.status(status).json({
        message: 'Error downloading document',
        error: error.message
      });
    }
  }
}
