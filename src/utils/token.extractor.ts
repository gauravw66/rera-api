import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import CryptoJS from 'crypto-js';

export class TokenExtractor {
  private static readonly ENCRYPTION_KEY = "sdjhfsdkjgkls74385385";
  private static readonly USERNAME = "@maharera_public_view";
  private static readonly PASSWORD = "Maharera!@$1";
  private static readonly BASE_URL = 'https://maharerait.maharashtra.gov.in';

  /**
   * Extract authentication token from MahaRERA website using direct API
   */
  static async extractToken(): Promise<string | null> {
    console.log('🔍 Starting token extraction via API...');

    try {
      const jar = new CookieJar();
      const client = wrapper(axios.create({ 
        jar, 
        withCredentials: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Origin': this.BASE_URL
        }
      }));

      // Visit a page to get initial cookies
      await client.get(`${this.BASE_URL}/public/project/view/3416`);

      const encryptedUserName = CryptoJS.AES.encrypt(this.USERNAME, this.ENCRYPTION_KEY).toString();
      const encryptedPassword = CryptoJS.AES.encrypt(this.PASSWORD, this.ENCRYPTION_KEY).toString();

      console.log('  Sending authentication request...');
      const response = await client.post(
        `${this.BASE_URL}/api/maha-rera-login-service/login/authenticatePublic`,
        {
          userName: encryptedUserName,
          password: encryptedPassword
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Referer': `${this.BASE_URL}/public/project/view/3416`
          }
        }
      );

      // Extract token from response
      if (response.data && response.data.responseObject && response.data.responseObject.accessToken) {
        const token = response.data.responseObject.accessToken;
        console.log('✅ Token extracted successfully!');
        console.log(`  Token preview: ${token.substring(0, 20)}...`);
        return token;
      } else {
        console.error('❌ Failed to extract token: Invalid response structure');
        return null;
      }

    } catch (error: any) {
      console.error('❌ Error during token extraction:', error.message);
      if (error.response) {
        console.error('  Response status:', error.response.status);
      }
      return null;
    }
  }

  // Legacy method to maintain interface, but no longer needs real browser closing
  static async closeBrowser(): Promise<void> {
    // No-op since we don't use Puppeteer anymore
  }
}
