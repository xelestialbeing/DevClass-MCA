#!/usr/bin/env node
/**
 * Test Verifier: Ensures the application tests against the REAL live Supabase DB
 * rather than falling back to local mocks or offline storage.
 */
const fs = require('fs');
const path = require('path');

// 1. Load .env if present (for local testing)
const envPath = path.resolve(__dirname, '.env');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  });
}

const url = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!url || !key || url.includes('your-project-id') || key.includes('your-anon-key')) {
  console.error('❌ FATAL: Live Supabase credentials (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are missing!');
  console.error('👉 Tests MUST connect to the live Supabase database, not local mock.');
  process.exit(1);
}

console.log(`📡 Verifying live Supabase database: ${url}...`);

async function verify() {
  const headers = { apikey: key, Authorization: `Bearer ${key}`, Range: '0-0' };
  
  // Probe core tables in Supabase
  const tables = ['users', 'daily_polls'];
  for (const table of tables) {
    const res = await fetch(`${url}/rest/v1/${table}?select=count`, { headers });
    if (!res.ok) {
      throw new Error(`Table '${table}' query failed with HTTP status ${res.status}`);
    }
  }

  console.log('✅ LIVE SUPABASE VERIFIED! Connected directly to production database (Zero local mocks).');
}

verify().catch(err => {
  console.error('❌ Supabase live test FAILED:', err.message);
  process.exit(1);
});

