// Plugin Hook System — lightweight server-side event bus.
//
// Plugins register handlers against named lifecycle hooks.  When the
// platform fires a hook (e.g. after an order is paid), every registered
// handler for that hook is called in parallel.  Errors in one handler
// are isolated — they never prevent other handlers from running.
//
// Usage (in a plugin initialiser or API route):
//   import { registerHook, fireHook } from '@/lib/plugin-hooks';
//   registerHook('onOrderPaid', 'my-plugin', async (payload) => { … });
//
// Firing (from the order creation flow):
//   await fireHook('onOrderPaid', { orderId, totalEgp, sellerId });

export type HookName =
  | 'onOrderCreated'
  | 'onOrderPaid'
  | 'onOrderDelivered'
  | 'onOrderCancelled'
  | 'onOrderRefunded'
  | 'onUserCreated'
  | 'onUserDeleted'
  | 'onSellerApproved'
  | 'onSellerSuspended'
  | 'onPayoutRequested'
  | 'onPayoutApproved'
  | 'onReviewSubmitted'
  | 'onAffiliateConversion'
  | 'onProductPublished'
  | 'onProductUnpublished'
  | 'onCartAbandoned';

type HookHandler = (payload: any) => Promise<void>;

interface HookRegistration {
  pluginSlug: string;
  handler: HookHandler;
}

// Module-level registry — persists across requests in the same Node process.
const registry = new Map<HookName, HookRegistration[]>();

/**
 * Register a handler for a lifecycle hook.
 * Call this from plugin initialisers or API route module-level code.
 */
export function registerHook(hook: HookName, pluginSlug: string, handler: HookHandler): void {
  const existing = registry.get(hook) ?? [];
  // Deduplicate: remove any previous registration from the same plugin
  const filtered = existing.filter(r => r.pluginSlug !== pluginSlug);
  filtered.push({ pluginSlug, handler });
  registry.set(hook, filtered);
}

/**
 * Unregister all handlers for a plugin (call when plugin is disabled).
 */
export function unregisterPlugin(pluginSlug: string): void {
  for (const [hook, handlers] of registry.entries()) {
    registry.set(
      hook,
      handlers.filter(r => r.pluginSlug !== pluginSlug)
    );
  }
}

/**
 * Fire a hook, calling all registered handlers in parallel.
 * Handler errors are caught and logged — they never throw to the caller.
 */
export async function fireHook(hook: HookName, payload: unknown): Promise<void> {
  const handlers = registry.get(hook) ?? [];
  if (handlers.length === 0) return;

  const results = await Promise.allSettled(handlers.map(({ handler }) => handler(payload)));

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'rejected') {
      console.error(
        `[plugin-hooks] ${hook} handler from "${handlers[i].pluginSlug}" threw:`,
        result.reason
      );
    }
  }
}

/**
 * List all currently registered hooks (for admin health dashboard).
 */
export function listRegisteredHooks(): Array<{ hook: HookName; pluginSlug: string }> {
  const out: Array<{ hook: HookName; pluginSlug: string }> = [];
  for (const [hook, handlers] of registry.entries()) {
    for (const { pluginSlug } of handlers) {
      out.push({ hook, pluginSlug });
    }
  }
  return out;
}
