import test from 'node:test';
import assert from 'node:assert/strict';
import { remFictionalSnapshots } from '../src/domain/rem-chat.ts';
import { isDefinitiveRemRejection, parseRemReceipt, reconcileRemIntent } from '../src/lib/rem-chat-ui-state.ts';

test('accepted intent remains pending until its ID appears in canonical history', () => {
  const intent = { id: 'fictional_submission_0001', text: 'A draft question' };
  const snapshot = remFictionalSnapshots.find(item => item.state === 'ready')!;
  assert.deepEqual(reconcileRemIntent(snapshot, intent, intent.text), { intent, draft: intent.text });
});

test('canonical reconciliation clears only the submitted draft, preserving newer edits', () => {
  const intent = { id: 'fictional_submission_0001', text: 'A draft question' };
  const base = remFictionalSnapshots.find(item => item.state === 'ready')!;
  const snapshot = { ...base, messages: [...base.messages, { id: 'fictional_message_0002', role: 'user' as const, text: intent.text, status: 'complete' as const, submissionId: intent.id }] };
  assert.deepEqual(reconcileRemIntent(snapshot, intent, intent.text), { intent: null, draft: '' });
  assert.deepEqual(reconcileRemIntent(snapshot, intent, 'A newer edit'), { intent: null, draft: 'A newer edit' });
});

test('uncertain transport and unavailable outcomes keep the same intent locked', async () => {
  assert.equal(isDefinitiveRemRejection('not_available'), false);
  assert.equal(isDefinitiveRemRejection('outcome_unknown'), false);
  assert.equal(isDefinitiveRemRejection('stale_view'), true);
  assert.equal(parseRemReceipt({ submissionId: 'fictional_submission_0001', runHandle: 'fictional_run_handle_001', custody: 'accepted' }, 'fictional_submission_0001')?.custody, 'accepted');
  assert.equal(parseRemReceipt({ submissionId: 'other_submission', runHandle: 'fictional_run_handle_001', custody: 'committed' }, 'fictional_submission_0001'), null);
  assert.equal(parseRemReceipt({ submissionId: 'fictional_submission_0001', runHandle: 'bad', custody: 'committed' }, 'fictional_submission_0001'), null);
});
