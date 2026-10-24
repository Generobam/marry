import { createHandler } from './handler.js';
Deno.serve(createHandler({
  url: Deno.env.get('SUPABASE_URL'),
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  adminIds: (Deno.env.get('WEDDING_ADMIN_IDS') || '').split(',').filter(Boolean),
  origins: (Deno.env.get('WEDDING_ORIGINS') || 'https://generobam.github.io').split(','),
  rateSalt: Deno.env.get('WEDDING_RATE_SALT'),
}));
