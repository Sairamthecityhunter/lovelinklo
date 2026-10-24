import {products} from './love-data';

export const GIFT_ORDER_STATUSES = ['pending_payment', 'paid', 'cancelled'] as const;
export type GiftOrderStatus = (typeof GIFT_ORDER_STATUSES)[number];
export type GiftCheckoutMode = 'disabled' | 'test' | 'live';

export function isGiftOrderStatus(value: unknown): value is GiftOrderStatus {
  return value === 'pending_payment' || value === 'paid' || value === 'cancelled';
}

export function asGiftOrderStatus(value: unknown, fallback: GiftOrderStatus = 'pending_payment'): GiftOrderStatus {
  return isGiftOrderStatus(value) ? value : fallback;
}

export function catalogGift(productId: string) {
  return products.find((item) => item.id === productId) || null;
}

export function giftPriceCents(productId: string) {
  const item = catalogGift(productId);
  return item ? Math.round(item.price * 100) : null;
}

// Physical fulfillment is not claimed here. pending_payment is the durable hook
// for Stripe keys (SHOP_ENABLED + STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET).
// Until those keys exist, the site still creates an order record. Paid status
// only follows a confirmed Stripe session; no shipment is implied either way.
export function giftPaymentHook(mode: GiftCheckoutMode) {
  return {
    mode,
    provider: mode === 'disabled' ? 'pending_keys' as const : 'stripe' as const,
  };
}

export function giftCheckoutReady(mode: GiftCheckoutMode, priceCents: number) {
  return giftPaymentHook(mode).provider === 'stripe' && priceCents >= 50;
}
