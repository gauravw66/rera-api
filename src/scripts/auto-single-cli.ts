// Script: auto-single-cli.ts
// Description: Reads a JSON array of projects, sequentially POSTs each to /api/rera/auto, logs results.

import fs from 'fs';
import axios from 'axios';
import path from 'path';

const API_URL = 'http://localhost:3000/api/rera/auto';

async function main() {
  const fileArg = process.argv.find(arg => arg.startsWith('--file='));
  if (!fileArg) {
    console.error('Usage: ts-node auto-single-cli.ts --file=path/to/file.json');
    process.exit(1);
  }
  const filePath = fileArg.split('=')[1];
  const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const raw = fs.readFileSync(absPath, 'utf-8');
  const projects = JSON.parse(raw);

  if (!Array.isArray(projects)) {
    console.error('Input JSON must be an array.');
    process.exit(1);
  }

  let processed = 0, success = 0, failed = 0;
  for (const [i, proj] of projects.entries()) {
    const { projectId, reraNumber } = proj;
    process.stdout.write(`[${i + 1}/${projects.length}] projectId=${projectId ?? '-'} reraNumber=${reraNumber ?? '-'} ... `);
    try {
      const res = await axios.post(API_URL, proj, { timeout: 60000 });
      if (res.data && res.data.status === 'SKIPPED') {
        console.log('SKIPPED (exists)');
      } else {
        console.log('SUCCESS');
        success++;
      }
    } catch (err: any) {
      failed++;
      if (err.response) {
        console.log(`FAILED [${err.response.status}]`, err.response.data?.message || err.response.data || '');
      } else {
        console.log('FAILED', err.message);
      }
    }
    processed++;
  }
  console.log(`---\nDone. processed=${processed}, success=${success}, failed=${failed}`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
