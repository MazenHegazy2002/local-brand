import { redis } from './redis';

// Live notification fanout.
//
// The previous implementation called `redis.duplicate()` on every SSE
// connection, which leaked one Redis connection per concurrent user — under
// load that exhausts the connection pool. We now keep a single shared
// subscriber and dispatch in-process to listeners keyed by userId.

const SSE_CHANNEL = 'sse:notifications';

type Listener = (notification: Record<string, unknown>) => void;

// Map of userId → set of listeners (one entry per active SSE stream).
const listenersByUser: Map<string, Set<Listener>> = new Map();
// Listeners that subscribed to the wildcard '*' broadcast.
const wildcardListeners: Set<Listener> = new Set();

// Lazy single subscriber. We hold it in module scope so all SSE streams in
// the same Node process share one Redis connection. Across processes / edge
// instances each one has its own subscriber, but that's a fixed small number,
// not one per request.
let subscriberPromise: Promise<ReturnType<typeof redis.duplicate>> | null = null;

function getSubscriber(): Promise<ReturnType<typeof redis.duplicate>> {
  if (subscriberPromise) return subscriberPromise;
  subscriberPromise = (async () => {
    const subscriber = redis.duplicate();
    await subscriber.subscribe(SSE_CHANNEL);
    subscriber.on('message', (_channel: string, message: string) => {
      try {
        const data = JSON.parse(message) as {
          userId: string;
          notification: Record<string, unknown>;
        };
        const userListeners = listenersByUser.get(data.userId);
        if (userListeners) {
          for (const fn of userListeners) {
            try {
              fn(data.notification);
            } catch (err) {
              console.error('[sse] listener threw:', err);
            }
          }
        }
        for (const fn of wildcardListeners) {
          try {
            fn(data.notification);
          } catch (err) {
            console.error('[sse] wildcard listener threw:', err);
          }
        }
      } catch (err) {
        console.error('[sse] failed to parse pubsub message:', err);
      }
    });
    return subscriber;
  })().catch(err => {
    console.error('[sse] failed to initialise subscriber:', err);
    // Reset so the next caller can retry.
    subscriberPromise = null;
    throw err;
  });
  return subscriberPromise;
}

export async function publishNotification(
  userId: string,
  notification: Record<string, unknown>
): Promise<void> {
  try {
    await redis.publish(SSE_CHANNEL, JSON.stringify({ userId, notification }));
  } catch (error) {
    console.error('Failed to publish notification to Redis:', error);
  }
}

export async function subscribeToNotifications(
  userId: string,
  onMessage: Listener
): Promise<() => void> {
  try {
    // Ensure the shared subscriber is up. If this throws we still return a
    // no-op unsubscribe so the SSE stream can keep its keepalive working.
    await getSubscriber();
  } catch {
    return () => {};
  }

  if (userId === '*') {
    wildcardListeners.add(onMessage);
    return () => {
      wildcardListeners.delete(onMessage);
    };
  }

  let bucket = listenersByUser.get(userId);
  if (!bucket) {
    bucket = new Set();
    listenersByUser.set(userId, bucket);
  }
  bucket.add(onMessage);

  return () => {
    const set = listenersByUser.get(userId);
    if (!set) return;
    set.delete(onMessage);
    if (set.size === 0) listenersByUser.delete(userId);
  };
}
