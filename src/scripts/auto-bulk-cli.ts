import axios from 'axios';
import fs from 'fs';
import path from 'path';

const argv = process.argv.slice(2);
const getArg = (name: string) => {
  const index = argv.findIndex(arg => arg === `--${name}`);
  if (index === -1) return undefined;
  return argv[index + 1];
};

const filePathArg = getArg('file');
const baseUrl = getArg('baseUrl') || 'http://localhost:3000';
const chunkSize = Number.parseInt(getArg('chunkSize') || '1', 10);
const startIndex = Number.parseInt(getArg('startIndex') || '0', 10);
const limitArg = getArg('limit');
const limit = limitArg ? Number.parseInt(limitArg, 10) : undefined;
const delayMs = Number.parseInt(getArg('delayMs') || '300', 10);

if (!filePathArg) {
  console.error('Missing --file argument. Example: --file C:/path/projects.json');
  process.exit(1);
}

if (Number.isNaN(chunkSize) || chunkSize <= 0) {
  console.error('--chunkSize must be a positive integer.');
  process.exit(1);
}

if (Number.isNaN(startIndex) || startIndex < 0) {
  console.error('--startIndex must be a non-negative integer.');
  process.exit(1);
}

if (limit !== undefined && (Number.isNaN(limit) || limit <= 0)) {
  console.error('--limit must be a positive integer.');
  process.exit(1);
}

if (Number.isNaN(delayMs) || delayMs < 0) {
  console.error('--delayMs must be a non-negative integer.');
  process.exit(1);
}

const resolvedPath = path.resolve(filePathArg);
const fileContent = fs.readFileSync(resolvedPath, 'utf8');
const parsed = JSON.parse(fileContent);
const allProjects = Array.isArray(parsed) ? parsed : parsed?.projects;

if (!Array.isArray(allProjects)) {
  console.error('Input JSON must be an array or an object with a projects array.');
  process.exit(1);
}

const sliceEnd = limit ? startIndex + limit : allProjects.length;
const projects = allProjects.slice(startIndex, sliceEnd);

console.log(`Loaded ${projects.length} projects (startIndex=${startIndex}, limit=${limit ?? 'all'}).`);
console.log(`Using ${baseUrl}/api/rera/auto-bulk with chunkSize=${chunkSize}.`);

let processed = 0;
let totalSuccess = 0;
let totalSkipped = 0;
let totalFailures = 0;

const postBulk = async (batch: any[], batchStartIndex: number) => {
  const response = await axios.post(`${baseUrl}/api/rera/auto-bulk`, {
    projects: batch,
    startIndex: batchStartIndex,
    delayMs
  });
  return response.data as {
    processed: number;
    successCount: number;
    skippedCount: number;
    failureCount: number;
    failures: Array<{ index: number; projectId?: number | string; reraNumber?: string; error: string }>;
    results?: Array<{ index: number; projectId?: number; reraNumber?: string; status: 'success' | 'skipped' | 'failed'; error?: string }>;
  };
};

const run = async () => {
  for (let offset = 0; offset < projects.length; offset += chunkSize) {
    const batch = projects.slice(offset, offset + chunkSize);
    const batchStartIndex = startIndex + offset;

    try {
      const result = await postBulk(batch, batchStartIndex);
      processed += result.processed;
      totalSuccess += result.successCount;
      totalSkipped += result.skippedCount;
      totalFailures += result.failureCount;

      if (result.results && result.results.length) {
        for (const itemResult of result.results) {
          const statusDetail = itemResult.status === 'failed'
            ? `FAILED: ${itemResult.error ?? 'unknown error'}`
            : itemResult.status === 'skipped'
              ? 'SKIPPED (exists)'
              : 'SUCCESS';
          const reraNumber = itemResult.reraNumber ? ` ${itemResult.reraNumber}` : '';
          const progress = itemResult.index !== undefined ? itemResult.index + 1 : processed;
          console.log(
            `[${progress}/${projects.length}] projectId=${itemResult.projectId ?? 'unknown'}${reraNumber} -> ${statusDetail}`
          );
        }
      } else {
        console.log(
          `Batch ${batchStartIndex}-${batchStartIndex + batch.length - 1}: ` +
            `success=${result.successCount}, skipped=${result.skippedCount}, failed=${result.failureCount}`
        );
      }
    } catch (error: any) {
      console.error(`Batch ${batchStartIndex}-${batchStartIndex + batch.length - 1} failed: ${error.message}`);
      totalFailures += batch.length;
      processed += batch.length;
    }
  }

  console.log('---');
  console.log(`Done. processed=${processed}, success=${totalSuccess}, skipped=${totalSkipped}, failed=${totalFailures}`);
};

run().catch(error => {
  console.error('CLI failed:', error.message);
  process.exit(1);
});
