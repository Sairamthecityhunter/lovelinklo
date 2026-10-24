import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';

const source = stripTypeScriptTypes(await fs.readFile(new URL('../lib/gift-orders.ts', import.meta.url), 'utf8'))
  .replace("'./love-data'", JSON.stringify(new URL('../lib/love-data.ts', import.meta.url).href));
const {
  asGiftOrderStatus,
  catalogGift,
  giftCheckoutReady,
  giftPaymentHook,
  giftPriceCents,
} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('every catalog gift can be looked up for an order', () => {
  for (const id of ['roses', 'mugs', 'camera', 'jewelry', 'sunset', 'coffee']) {
    const item = catalogGift(id);
    assert.ok(item, id + ' should stay orderable');
    assert.equal(giftPriceCents(id), Math.round(item.price * 100));
  }
  assert.equal(catalogGift('not-a-gift'), null);
  assert.equal(giftPriceCents('not-a-gift'), null);
});

test('gift payment hook stays pending without Stripe keys and only starts Stripe when wired', () => {
  assert.deepEqual(giftPaymentHook('disabled'), {mode: 'disabled', provider: 'pending_keys'});
  assert.deepEqual(giftPaymentHook('test'), {mode: 'test', provider: 'stripe'});
  assert.equal(giftCheckoutReady('disabled', 5800), false);
  assert.equal(giftCheckoutReady('test', 5800), true);
  assert.equal(giftCheckoutReady('test', 0), false);
  assert.equal(asGiftOrderStatus('paid'), 'paid');
  assert.equal(asGiftOrderStatus('mystery'), 'pending_payment');
});
