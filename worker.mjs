import { handleGame } from './lib/api.mjs';

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/api/game') {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
      if (!env.DB) return Response.json({ error: 'Room storage is not configured.' }, { status: 503 });
      // Keep optimistic revision checks on the primary even with D1 read replication.
      const db = env.DB.withSession ? env.DB.withSession('first-primary') : env.DB;
      return handleGame(request, db);
    }
    return env.ASSETS.fetch(request);
  }
};
