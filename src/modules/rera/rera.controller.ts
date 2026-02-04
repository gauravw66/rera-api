import { Request, Response } from 'express';
import { ReraService } from '../../services/rera.service';
import { SessionManager } from '../../utils/session.manager';

export class ReraController {
  static async search(req: Request, res: Response) {
    const { reraNo } = req.params;
    if (!reraNo || typeof reraNo !== 'string') {
      return res.status(400).json({ message: 'Valid RERA number is required' });
    }
    const project = await ReraService.searchByReraNo(reraNo);
    res.json(project);
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
          error: 'No project found with the given RERA number.' 
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
    
    if (!reraNo && !projectId) {
      return res.status(400).json({ 
        message: 'Either reraNo or projectId is required',
        example: {
          reraNo: 'P52100000001',
          projectId: '41789'
        }
      });
    }

    try {
      // Token is already set by TokenRefreshService, no need to set it here
      let targetProjectId = projectId;
      let targetReraNo = reraNo || 'Unknown';

      // If projectId is not provided, we must search by reraNo
      if (!targetProjectId) {
        console.log(`[AUTO] Searching for project with RERA number: ${reraNo}`);
        
        // First, search for the project to get the projectId
        const searchResult = await ReraService.searchByReraNo(reraNo);
        
        if (!searchResult || !searchResult.projectId) {
          // If search fails, throw specific error
          throw {
            response: { status: 404 },
            message: 'Project not found with the given RERA number (Search step failed)'
          };
        }
        
        targetProjectId = searchResult.projectId;
        console.log(`[AUTO] Found project ID from search: ${targetProjectId}`);
      } else {
        console.log(`[AUTO] Using provided Project ID: ${targetProjectId}`);
      }

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
}
