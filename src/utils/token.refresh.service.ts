import * as cron from 'node-cron';
import { TokenExtractor } from './token.extractor';
import { TokenStorage } from './token.storage';
import { SessionManager } from './session.manager';

export class TokenRefreshService {
  private static cronJob: cron.ScheduledTask | null = null;
  private static isRefreshing = false;

  /**
   * Refresh token immediately
   */
  static async refreshToken(): Promise<boolean> {
    if (this.isRefreshing) {
      console.log('⏳ Token refresh already in progress...');
      return false;
    }

    this.isRefreshing = true;
    console.log('\n🔄 Starting token refresh...');

    try {
      const token = await TokenExtractor.extractToken();
      
      if (token) {
        // Save token to file
        TokenStorage.saveToken(token);
        
        // Update SessionManager with new token
        await SessionManager.setAccessToken(token);
        
        console.log('✅ Token refresh completed successfully!\n');
        return true;
      } else {
        console.error('❌ Token refresh failed - no token extracted\n');
        return false;
      }
    } catch (error: any) {
      console.error('❌ Token refresh error:', error.message, '\n');
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Start automatic token refresh scheduler
   * Runs every 4 hours by default
   */
  static startScheduler(cronExpression: string = '0 */4 * * *'): void {
    if (this.cronJob) {
      console.log('⚠️  Scheduler already running');
      return;
    }

    console.log('⏰ Starting token refresh scheduler...');
    console.log(`  Schedule: ${cronExpression} (every 4 hours)`);

    this.cronJob = cron.schedule(cronExpression, async () => {
      console.log('\n⏰ Scheduled token refresh triggered');
      await this.refreshToken();
    });

    console.log('✅ Token refresh scheduler started\n');
  }

  /**
   * Stop the scheduler
   */
  static stopScheduler(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('🛑 Token refresh scheduler stopped');
    }
  }

  /**
   * Initialize token on startup
   * Tries to load from file first, then extracts if needed
   */
  static async initialize(): Promise<void> {
    console.log('\n🚀 Initializing token service...');

    // Try to load existing token
    const existingToken = TokenStorage.loadToken();
    
    if (existingToken) {
      console.log('✅ Using existing token from file');
      await SessionManager.setAccessToken(existingToken);
    } else {
      console.log('⚠️  No valid token found, extracting new token...');
      await this.refreshToken();
    }

    // Start the scheduler
    this.startScheduler();
    
    console.log('✅ Token service initialized\n');
  }
}
