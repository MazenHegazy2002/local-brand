import { redis } from './redis';

const SSE_CHANNEL = 'sse:notifications';

export async function publishNotification(userId: string, notification: Record<string, unknown>): Promise<void> {
  try {
    await redis.publish(SSE_CHANNEL, JSON.stringify({ userId, notification }));
  } catch (error) {
    console.error('Failed to publish notification to Redis:', error);
  }
}

export async function subscribeToNotifications(
  userId: string,
  onMessage: (notification: Record<string, unknown>) => void
): Promise<() => void> {
  try {
    const subscriber = redis.duplicate();
    await subscriber.subscribe(SSE_CHANNEL);
    
    const handler = (message: string) => {
      try {
        const data = JSON.parse(message);
        if (data.userId === userId || data.userId === '*') {
          onMessage(data.notification);
        }
      } catch {}
    };
    
    subscriber.on('message', handler);
    
    return () => {
      subscriber.unsubscribe(SSE_CHANNEL);
      subscriber.off('message', handler);
      subscriber.disconnect();
    };
  } catch (error) {
    console.error('Failed to subscribe to Redis:', error);
    return () => {};
  }
}