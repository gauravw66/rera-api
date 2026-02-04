import * as fs from 'fs';
import * as path from 'path';

export class TokenStorage {
  private static readonly TOKEN_FILE = path.join(__dirname, '../../.token');
  
  /**
   * Save token to file
   */
  static saveToken(token: string): void {
    try {
      const data = {
        token,
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 hours from now
      };
      
      fs.writeFileSync(this.TOKEN_FILE, JSON.stringify(data, null, 2));
      console.log('💾 Token saved to file');
    } catch (error: any) {
      console.error('❌ Error saving token:', error.message);
    }
  }

  /**
   * Load token from file
   */
  static loadToken(): string | null {
    try {
      if (!fs.existsSync(this.TOKEN_FILE)) {
        console.log('⚠️  No token file found');
        return null;
      }

      const data = JSON.parse(fs.readFileSync(this.TOKEN_FILE, 'utf-8'));
      
      // Check if token is expired
      const expiresAt = new Date(data.expiresAt);
      if (expiresAt < new Date()) {
        console.log('⚠️  Token expired');
        return null;
      }

      console.log('✅ Token loaded from file');
      console.log(`  Expires at: ${data.expiresAt}`);
      return data.token;
    } catch (error: any) {
      console.error('❌ Error loading token:', error.message);
      return null;
    }
  }

  /**
   * Check if token exists and is valid
   */
  static hasValidToken(): boolean {
    return this.loadToken() !== null;
  }

  /**
   * Delete token file
   */
  static clearToken(): void {
    try {
      if (fs.existsSync(this.TOKEN_FILE)) {
        fs.unlinkSync(this.TOKEN_FILE);
        console.log('🗑️  Token file deleted');
      }
    } catch (error: any) {
      console.error('❌ Error deleting token:', error.message);
    }
  }
}
