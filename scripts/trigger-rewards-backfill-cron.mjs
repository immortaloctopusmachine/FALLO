#!/usr/bin/env node

const baseUrl = process.env.CRON_BASE_URL || process.argv[2];
const secret = process.env.CRON_SECRET || process.argv[3];
const startWeekDate = process.env.REWARDS_START_WEEK || process.argv[4];
const endWeekDate = process.env.REWARDS_END_WEEK || process.argv[5];
const userIdsArg = process.env.REWARDS_USER_IDS || process.argv[6];

if (!baseUrl || !secret) {
  console.error('Usage: CRON_BASE_URL=<url> CRON_SECRET=<secret> npm run cron:rewards:backfill');
  console.error('Optional: REWARDS_START_WEEK=<YYYY-MM-DD> REWARDS_END_WEEK=<YYYY-MM-DD> REWARDS_USER_IDS=<id1,id2>');
  console.error('Or: npm run cron:rewards:backfill -- <url> <secret> [startWeekDate] [endWeekDate] [userIdsCsv]');
  process.exit(1);
}

const endpoint = `${baseUrl.replace(/\/+$/, '')}/api/cron/rewards/backfill-snapshots`;
const payload = {};

if (startWeekDate) {
  payload.startWeekDate = startWeekDate;
}

if (endWeekDate) {
  payload.endWeekDate = endWeekDate;
}

if (userIdsArg) {
  payload.userIds = userIdsArg
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

try {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responsePayload = await response.json().catch(() => ({}));

  console.log(`Status: ${response.status}`);
  console.log(JSON.stringify(responsePayload, null, 2));

  if (!response.ok || responsePayload?.success === false) {
    process.exit(1);
  }
} catch (error) {
  console.error('Failed to call rewards backfill cron endpoint:', error);
  process.exit(1);
}
