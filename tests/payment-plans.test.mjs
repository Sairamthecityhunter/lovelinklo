import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';

const source = stripTypeScriptTypes(await fs.readFile(new URL('../lib/payment-plans.ts', import.meta.url), 'utf8'));
const {
  PLUS_PRICE_CENTS,
  assignInstallments,
  asGiftPlanCount,
  canCreateGiftPlan,
  canPayInstallment,
  installmentDueDates,
  nextDueInstallment,
  paymentProviderMode,
  planProgress,
  plusIsActive,
  plusPeriodEnd,
  splitInstallments,
} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('Plus stays $4.99 and demo when Stripe checkout is disabled', () => {
  assert.equal(PLUS_PRICE_CENTS, 499);
  assert.equal(paymentProviderMode('disabled'), 'demo');
  assert.equal(paymentProviderMode('test'), 'test');
  assert.equal(plusIsActive({tier: 'plus', status: 'active', expiresAt: Date.now() + 1000}), true);
  assert.equal(plusIsActive({tier: 'plus', status: 'canceled', expiresAt: Date.now() + 1000}), false);
  assert.equal(plusIsActive({tier: 'plus', status: 'active', expiresAt: Date.now() - 1000}), false);
  assert.ok(plusPeriodEnd(1_000) > 1_000);
});

test('gift installments split leftover cents onto the last part', () => {
  assert.deepEqual(splitInstallments(5800, 3), [1933, 1933, 1934]);
  assert.deepEqual(splitInstallments(1000, 2), [500, 500]);
  assert.deepEqual(splitInstallments(40, 2), []);
  assert.equal(asGiftPlanCount(4), 4);
  assert.equal(asGiftPlanCount(5), null);
});

test('due dates step monthly and partner split alternates owners', () => {
  assert.deepEqual(installmentDueDates('2026-10-24', 3), ['2026-10-24', '2026-11-24', '2026-12-24']);
  assert.deepEqual(assignInstallments(3, 'alex', 'maya', true), ['alex', 'maya', 'alex']);
  assert.deepEqual(assignInstallments(2, 'alex', null, true), ['alex', 'alex']);
});

test('Plus is required to start a gift plan; only the assignee pays a due part', () => {
  assert.match(canCreateGiftPlan({
    plus: false,
    orderStatus: 'pending_payment',
    priceCents: 5800,
    existingPlan: false,
    installmentCount: 3,
  }) || '', /Plus/i);
  assert.equal(canCreateGiftPlan({
    plus: true,
    orderStatus: 'pending_payment',
    priceCents: 5800,
    existingPlan: false,
    installmentCount: 3,
  }), null);
  assert.match(canCreateGiftPlan({
    plus: true,
    orderStatus: 'paid',
    priceCents: 5800,
    existingPlan: false,
    installmentCount: 3,
  }) || '', /unpaid/i);
  assert.equal(canPayInstallment({
    planStatus: 'active',
    installmentStatus: 'due',
    assignedUserId: 'alex',
    actorId: 'alex',
  }), null);
  assert.match(canPayInstallment({
    planStatus: 'active',
    installmentStatus: 'due',
    assignedUserId: 'maya',
    actorId: 'alex',
  }) || '', /partner/i);
  const next = nextDueInstallment([
    {status: 'paid', sequence: 1},
    {status: 'due', sequence: 3},
    {status: 'due', sequence: 2},
  ]);
  assert.equal(next?.sequence, 2);
  assert.deepEqual(planProgress(1933, 5800), {paidCents: 1933, remainingCents: 3867, percent: 33, complete: false});
  assert.equal(planProgress(5800, 5800).complete, true);
});
