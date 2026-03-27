// ─────────────────────────────────────────────────────────────────────────────
// OnePlay — Cloudflare Worker Backend
// File location: oneplay/worker/src/index.js
// ─────────────────────────────────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Helper: send a JSON response
const reply = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

// Helper: send a JSON error
const fail = (msg, status = 400) => reply({ error: msg }, status);

// Generate an 8-character key like "RXKM-47BN"
function genKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let key = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) key += "-";
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

// Check if the request has a valid admin Authorization header
function isAdmin(request, env) {
  const auth = request.headers.get("Authorization") || "";
  return auth === `Bearer ${env.ADMIN_SECRET}`;
}

export default {
  async fetch(request, env) {
    // ── Handle CORS preflight (browser sends this before real requests) ──────
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // ── Route: /api/keys ─────────────────────────────────────────────────
      if (path === "/api/keys") {
        if (!isAdmin(request, env)) return fail("Unauthorized", 401);

        // LIST all keys (admin only)
        if (method === "GET") {
          const list = await env.KEYS_KV.list({ prefix: "key:" });
          const rows = await Promise.all(
            list.keys.map(({ name }) =>
              env.KEYS_KV.get(name).then((v) => (v ? JSON.parse(v) : null))
            )
          );
          const sorted = rows
            .filter(Boolean)
            .sort((a, b) => b.createdAt - a.createdAt);
          return reply(sorted);
        }

        // CREATE a new key (admin only)
        if (method === "POST") {
          let body = {};
          try { body = await request.json(); } catch {}

          const { label = "Untitled", audioUrl } = body;
          if (!audioUrl || !audioUrl.trim()) {
            return fail("audioUrl is required");
          }

          const id = genKey();
          const record = {
            id,
            label: (label || "Untitled").trim(),
            audioUrl: audioUrl.trim(),
            used: false,
            createdAt: Date.now(),
          };

          await env.KEYS_KV.put(`key:${id}`, JSON.stringify(record));
          return reply(record, 201);
        }
      }

      // ── Route: /api/keys/:id ─────────────────────────────────────────────
      // Matches keys like "RXKM-47BN" (9 chars: 4 + dash + 4)
      const singleMatch = path.match(/^\/api\/keys\/([A-Z0-9]{4}-[A-Z0-9]{4})$/);
      if (singleMatch) {
        const id = singleMatch[1];
        const raw = await env.KEYS_KV.get(`key:${id}`);

        // GET — public endpoint (used by the listener to check if key is valid)
        // ⚠️  We deliberately do NOT return the audioUrl here for security.
        if (method === "GET") {
          if (!raw) return fail("Key not found", 404);
          const record = JSON.parse(raw);
          return reply({ id: record.id, label: record.label, used: record.used });
        }

        // DELETE — admin only
        if (method === "DELETE") {
          if (!isAdmin(request, env)) return fail("Unauthorized", 401);
          if (!raw) return fail("Key not found", 404);
          await env.KEYS_KV.delete(`key:${id}`);
          return reply({ deleted: true });
        }
      }

      // ── Route: /api/keys/:id/redeem ──────────────────────────────────────
      // Burns the key and returns the audio URL — the critical one-time action
      const redeemMatch = path.match(
        /^\/api\/keys\/([A-Z0-9]{4}-[A-Z0-9]{4})\/redeem$/
      );
      if (redeemMatch && method === "POST") {
        const id = redeemMatch[1];
        const raw = await env.KEYS_KV.get(`key:${id}`);

        if (!raw) return fail("Invalid key", 404);
        const record = JSON.parse(raw);
        if (record.used) return fail("This key has already been played", 403);

        // Mark as used BEFORE returning the URL (atomic: one KV write)
        const burned = { ...record, used: true, usedAt: Date.now() };
        await env.KEYS_KV.put(`key:${id}`, JSON.stringify(burned));

        // Only now do we reveal the audio URL
        return reply({ audioUrl: record.audioUrl, label: record.label });
      }

      // ── Route: /api/keys/:id/reactivate ──────────────────────────────────
      // Admin-only: reset a used key back to active so it can be played again
      const reactivateMatch = path.match(
        /^\/api\/keys\/([A-Z0-9]{4}-[A-Z0-9]{4})\/reactivate$/
      );
      if (reactivateMatch && method === "POST") {
        if (!isAdmin(request, env)) return fail("Unauthorized", 401);
        const id = reactivateMatch[1];
        const raw = await env.KEYS_KV.get(`key:${id}`);
        if (!raw) return fail("Key not found", 404);
        const record = JSON.parse(raw);
        const reactivated = { ...record, used: false, usedAt: null, reactivatedAt: Date.now() };
        await env.KEYS_KV.put(`key:${id}`, JSON.stringify(reactivated));
        return reply({ id, reactivated: true });
      }

      // ── Catch-all: serve static frontend assets (combined deployment) ─────
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }

      return fail("Not found", 404);
    } catch (e) {
      console.error(e);
      return fail("Internal server error", 500);
    }
  },
};
