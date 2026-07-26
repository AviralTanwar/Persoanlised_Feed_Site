// Thin Supabase client. All schema creation, migrations, and seeding now live
// in supabase/schema.sql and supabase/seed.sql, applied by hand in the Supabase
// SQL editor — there is no "startup" in serverless to run them on.
//
// Uses the SERVICE ROLE key: server-side only, bypasses Row Level Security.
// Never expose this key to the browser and never prefix it with VITE_.
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
    'Set them in server/.env for local dev (see .env.example) and in the ' +
    'Vercel dashboard for production.'
  );
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

module.exports = supabase;
