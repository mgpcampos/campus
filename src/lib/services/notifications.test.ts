import { describe, test, expect } from 'vitest';
import { extractMentions } from './notifications.js';
import { describeNotification, type NotificationRecord } from './notificationClient';

function fakeNotif(partial: Partial<NotificationRecord>): NotificationRecord {
  return {
    id: 'n1', user: 'u1', actor: 'u2', type: 'like', read: false, created: new Date().toISOString(), ...partial
  } as NotificationRecord;
}

describe('notifications helpers', () => {
  test('extractMentions finds unique usernames', () => {
    const text = 'Hello @alice and @bob and again @alice!';
    expect(extractMentions(text).sort()).toEqual(['alice','bob']);
  });

  test('describeNotification like', () => {
    const n = fakeNotif({ type: 'like', expand: { actor: { name: 'Alice' } } });
    const desc = describeNotification(n);
    expect(desc).toMatch(/Alice liked your post/);
  });
});
