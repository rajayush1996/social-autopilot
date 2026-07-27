import { describe, it } from 'node:test';
import assert from 'node:assert';
import NotificationService from '../../src/services/notificationService.js';

describe('Notification Service & Retry Unit Tests', () => {
  it('should export NotificationService class correctly', () => {
    assert.strictEqual(typeof NotificationService.createNotification, 'function');
    assert.strictEqual(typeof NotificationService.getUserNotifications, 'function');
    assert.strictEqual(typeof NotificationService.markAsRead, 'function');
    assert.strictEqual(typeof NotificationService.markAllAsRead, 'function');
  });

  it('should format notification payload correctly on creation', async () => {
    const payload = await NotificationService.createNotification({
      userId: null, // Broadcast test
      title: 'Test Notification',
      message: 'Test message for socket broadcast',
      type: 'info',
    });

    assert.ok(payload);
    assert.strictEqual(payload.title, 'Test Notification');
    assert.strictEqual(payload.message, 'Test message for socket broadcast');
    assert.strictEqual(payload.type, 'info');
    assert.strictEqual(payload.read, false);
  });
});
