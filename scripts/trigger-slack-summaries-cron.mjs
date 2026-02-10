#!/usr/bin/env node

const baseUrl = process.env.CRON_BASE_URL || process.argv[2];
const secret = process.env.CRON_SECRET || process.argv[3];

if (!baseUrl || !secret) {
  console.error('Usage: CRON_BASE_URL=<url> CRON_SECRET=<secret> npm run cron:slack:trigger');
  console.error('Or: npm run cron:slack:trigger -- <url> <secret>');
  process.exit(1);
}

const endpoint = `${baseUrl.replace(/\/+$/, '')}/api/cron/slack-project-summaries`;

try {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
  });

  const payload = await response.json().catch(() => ({}));

  console.log(`Status: ${response.status}`);
  console.log(JSON.stringify(payload, null, 2));

  if (!response.ok || payload?.success === false) {
    process.exit(1);
  }
} catch (error) {
  console.error('Failed to call Slack project summaries cron endpoint:', error);
  process.exit(1);
}
