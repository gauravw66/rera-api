import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import CryptoJS from 'crypto-js';

export class SessionManager {
  private static jar = new CookieJar();
  private static accessToken: string | null = null;
  private static isManualToken: boolean = false;
  
  private static readonly ENCRYPTION_KEY = "sdjhfsdkjgkls74385385";
  private static readonly USERNAME = "@maharera_public_view";
  private static readonly PASSWORD = "Maharera!@$1";
  private static readonly BASE_URL = 'https://maharerait.maharashtra.gov.in';

  private static client = wrapper(axios.create({ 
    jar: SessionManager.jar, 
    withCredentials: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': SessionManager.BASE_URL,
      'Host': 'maharerait.maharashtra.gov.in'
    }
  }));

  private static async initializeSession() {
    // Visit a page to get initial cookies (JSESSIONID)
    await this.client.get(`${this.BASE_URL}/public/project/view/3416`, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
      }
    });
  }

  static async authenticate() {
    if (this.accessToken || this.isManualToken) return this.accessToken;

    console.log('No token found, starting MahaRERA authentication flow...');
    await this.initializeSession();

    const encryptedUserName = CryptoJS.AES.encrypt(this.USERNAME, this.ENCRYPTION_KEY).toString();
    const encryptedPassword = CryptoJS.AES.encrypt(this.PASSWORD, this.ENCRYPTION_KEY).toString();

    const response = await this.client.post(
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

    console.log('Authentication response:', response.data);

    // Extract token from response
    if (response.data && response.data.responseObject && response.data.responseObject.accessToken) {
      this.accessToken = response.data.responseObject.accessToken;
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
      console.log('✅ Authentication successful!');
      console.log(`  Token preview: Bearer ${this.accessToken.substring(0, 20)}...`);
      return this.accessToken;
    } else {
      throw new Error('No access token in response');
    }
  }

  static async setAccessToken(token: string) {
    this.isManualToken = true;
    this.accessToken = token.startsWith('Bearer ') ? token.substring(7) : token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
    console.log('✓ Manual token set successfully');
    console.log('  Token preview:', `Bearer ${this.accessToken.substring(0, 15)}...`);
    
    // Initialize session to get cookies
    try {
      console.log('  Initializing session for cookies...');
      await this.initializeSession();
      console.log('  ✓ Session initialized');
    } catch (e: any) {
      console.error('  ⚠ Warning: Failed to initialize session cookies:', e.message);
      console.error('  This may cause issues with some API calls');
    }
  }

  static async getClient() {
    // If manual token is set, don't try to authenticate
    if (!this.accessToken && !this.isManualToken) {
        await this.authenticate();
    }
    return this.client;
  }

  static getJar() {
    return this.jar;
  }

  static async clearSession() {
    await this.jar.removeAllCookies();
    this.accessToken = null;
    this.isManualToken = false;
    delete this.client.defaults.headers.common['Authorization'];
    console.log('✓ Session cleared');
  }
}
