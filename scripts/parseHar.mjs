import fs from 'fs';
import path from 'path';

function loadHar(harPath) {
  const raw = fs.readFileSync(harPath, 'utf-8');
  return JSON.parse(raw);
}

function summarizeHar(har) {
  const entries = har?.log?.entries || [];
  const summary = {
    totalEntries: entries.length,
    totalRequestBytes: 0,
    totalResponseBytes: 0,
    methods: {},
    statuses: {},
    contentTypes: {},
    hosts: {},
    topEndpoints: {},
    timings: { totalMs: 0, avgMs: 0 },
  };

  for (const e of entries) {
    const req = e.request || {};
    const res = e.response || {};
    const url = new URL(req.url);
    const host = url.host;
    const pathOnly = url.pathname;

    summary.totalRequestBytes += (req.headersSize || 0) + (req.bodySize || 0);
    summary.totalResponseBytes += (res.headersSize || 0) + (res.bodySize || 0);

    summary.methods[req.method] = (summary.methods[req.method] || 0) + 1;
    summary.statuses[res.status] = (summary.statuses[res.status] || 0) + 1;

    const ct = (res.content?.mimeType || 'unknown').split(';')[0].trim();
    summary.contentTypes[ct] = (summary.contentTypes[ct] || 0) + 1;
    summary.hosts[host] = (summary.hosts[host] || 0) + 1;
    summary.topEndpoints[pathOnly] = (summary.topEndpoints[pathOnly] || 0) + 1;

    const time = e.time || 0;
    summary.timings.totalMs += time;
  }
  if (summary.totalEntries > 0) summary.timings.avgMs = +(summary.timings.totalMs / summary.totalEntries).toFixed(1);

  // sort helper
  const sortObj = (obj) => Object.entries(obj).sort((a,b)=>b[1]-a[1]).reduce((acc,[k,v]) => (acc[k]=v, acc), {});
  summary.methods = sortObj(summary.methods);
  summary.statuses = sortObj(summary.statuses);
  summary.contentTypes = sortObj(summary.contentTypes);
  summary.hosts = sortObj(summary.hosts);
  summary.topEndpoints = Object.fromEntries(Object.entries(summary.topEndpoints).sort((a,b)=>b[1]-a[1]).slice(0,50));

  return summary;
}

// Heuristic extractor for job cards in JSON API responses
function tryExtractJobsFromResponseText(text) {
  try {
    const json = JSON.parse(text);
    const candidates = [];
    const walk = (node) => {
      if (!node) return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (typeof node === 'object') {
        if (
          (node.title || node.jobTitle) &&
          (node.description || node.snippet || node.jobDescription)
        ) {
          candidates.push({
            title: (node.title || node.jobTitle || '').toString(),
            description: (node.description || node.snippet || node.jobDescription || '').toString(),
            skills: node.skills || node.requiredSkills || [],
            budget: node.budget || node.pay || node.price || '',
            url: node.url || node.jobUrl || node.link || ''
          });
        }
        Object.values(node).forEach(walk);
      }
    };
    walk(json);
    return candidates;
  } catch {
    return [];
  }
}

function extractJobs(har) {
  const entries = har?.log?.entries || [];
  const jobs = [];
  for (const e of entries.slice(0, 1000)) { // safety cap
    const res = e.response || {};
    const mime = (res.content?.mimeType || '').toLowerCase();
    if (mime.includes('application/json') || mime.includes('text/json') || mime.includes('json')) {
      const text = res.content?.text || '';
      const found = tryExtractJobsFromResponseText(text);
      if (found.length) jobs.push(...found);
    }
  }
  // dedupe by url+title
  const seen = new Set();
  const deduped = [];
  for (const j of jobs) {
    const key = (j.url || '') + '|' + (j.title || '');
    if (!seen.has(key) && (j.title || j.description)) {
      seen.add(key);
      deduped.push(j);
    }
  }
  return deduped.slice(0, 200);
}

function main() {
  const harPath = process.argv[2];
  if (!harPath) {
    console.error('Usage: node scripts/parseHar.mjs <path-to.har>');
    process.exit(1);
  }
  const har = loadHar(harPath);
  const outDir = path.join('scripts','out');
  fs.mkdirSync(outDir, { recursive: true });

  const summary = summarizeHar(har);
  fs.writeFileSync(path.join(outDir, 'har-summary.json'), JSON.stringify(summary, null, 2));

  const jobs = extractJobs(har);
  fs.writeFileSync(path.join(outDir, 'jobs-extracted.json'), JSON.stringify(jobs, null, 2));

  console.log('Summary written to scripts/out/har-summary.json');
  console.log(`Extracted ${jobs.length} candidate jobs -> scripts/out/jobs-extracted.json`);
}

main();

