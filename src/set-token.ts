/**
 * Manual Token Setter Utility
 * 
 * Use this script to manually set a token if automatic extraction fails.
 * 
 * Usage:
 * 1. Get your token from browser DevTools (see instructions below)
 * 2. Run: npm run set-token "your-token-here"
 */

import { TokenStorage } from './utils/token.storage';
import { SessionManager } from './utils/session.manager';

async function setToken() {
  const token = process.argv[2];

  if (!token) {
    console.log('\n❌ No token provided!\n');
    console.log('Usage: npm run set-token "your-bearer-token-here"\n');
    console.log('📖 How to get your token:');
    console.log('  1. Open https://maharerait.maharashtra.gov.in in your browser');
    console.log('  2. Open DevTools (F12)');
    console.log('  3. Go to Network tab');
    console.log('  4. Search for any project');
    console.log('  5. Find an API request (e.g., /api/project/viewAllProjects)');
    console.log('  6. Click on it → Headers → Request Headers');
    console.log('  7. Copy the value after "Authorization: Bearer "');
    console.log('  8. Run: npm run set-token "paste-token-here"\n');
    process.exit(1);
  }

  try {
    // Clean the token (remove "Bearer " if present)
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;

    // Validate token format (basic check)
    if (cleanToken.length < 20) {
      console.log('\n❌ Token seems too short. Please check if you copied the full token.\n');
      process.exit(1);
    }

    console.log('\n💾 Saving token...');
    TokenStorage.saveToken(cleanToken);

    console.log('✅ Token saved successfully!');
    console.log(`  Token preview: ${cleanToken.substring(0, 20)}...`);
    console.log('\n🎉 You can now restart your server and it will use this token.\n');
    console.log('The token will be automatically refreshed every 4 hours.\n');

  } catch (error: any) {
    console.error('\n❌ Error saving token:', error.message, '\n');
    process.exit(1);
  }
}

setToken();
