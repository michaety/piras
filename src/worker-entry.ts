import { handle } from '@astrojs/cloudflare/handler';
import { cleanupPendingUploads } from './lib/admin/cleanup';
import { cleanupAbandonedCarts } from './lib/cart/cleanup';

/**
 * Custom worker entry so a scheduled() handler can sit alongside Astro's
 * fetch handler — the adapter's default generated entry only exports
 * fetch. wrangler.jsonc points `main` at this file directly (not at a
 * build output path); Astro's own build resolves the virtual modules
 * `handle` depends on.
 */
export default {
  fetch: handle,
  async scheduled(_controller: ScheduledController, env: Cloudflare.Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      cleanupPendingUploads(env).then((result) => {
        console.log(`cleanup: removed ${result.rowsDeleted} pending_uploads row(s), ${result.objectsDeleted} R2 object(s)`);
      }),
    );
    ctx.waitUntil(
      cleanupAbandonedCarts(env).then((result) => {
        console.log(`cleanup: removed ${result.cartsDeleted} abandoned cart(s)`);
      }),
    );
  },
} satisfies ExportedHandler<Cloudflare.Env>;
