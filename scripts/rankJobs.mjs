import fs from 'fs';
import path from 'path';
import { OpenAIService } from '../src/services/openai-service.js';

async function main() {
  const file = process.argv[2] || path.join('scripts','out','jobs-extracted.json');
  const top = parseInt(process.argv[3] || '10');
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.error('Set GOOGLE_API_KEY (or GEMINI_API_KEY) before running.');
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error('Jobs file not found:', file);
    process.exit(1);
  }
  const jobs = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const svc = new OpenAIService();
  svc.setApiKey(apiKey);
  const ranked = await svc.rankJobs(jobs, top);
  const outDir = path.join('scripts','out');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'jobs-ranked.json');
  fs.writeFileSync(outFile, JSON.stringify(ranked, null, 2));
  console.log('AI ranked jobs ->', outFile);
}

main();

