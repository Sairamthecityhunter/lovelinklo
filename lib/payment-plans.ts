export const PLUS_PRICE_CENTS = 499;
export const PLUS_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
export const GIFT_PLAN_COUNTS = [2, 3, 4] as const;
export const PLAN_TIERS = ['free', 'plus'] as const;
export const COUPLE_PLAN_STATUSES = ['inactive', 'active', 'canceled'] as const;
export const GIFT_PLAN_STATUSES = ['active', 'completed', 'cancelled'] as const;
export const INSTALLMENT_STATUSES = ['due', 'paid'] as const;

export type PlanTier = (typeof PLAN_TIERS)[number];
export type CouplePlanStatus = (typeof COUPLE_PLAN_STATUSES)[number];
export type GiftPlanStatus = (typeof GIFT_PLAN_STATUSES)[number];
export type InstallmentStatus = (typeof INSTALLMENT_STATUSES)[number];
export type GiftPlanCount = (typeof GIFT_PLAN_COUNTS)[number];
export type PaymentProviderMode = 'demo' | 'test' | 'live' | 'disabled';

export const PLUS_BENEFITS = [
  'Split or schedule catalog gift payments over 2–4 parts',
  'Invite your partner to contribute toward a shared gift',
  'Together digital extras: date packs, world themes, and bonus quizzes',
  'One membership covers both connected partners',
] as const;

export const FREE_BENEFITS = [
  'Pairing, love notes, closeness unlocks, and calendar',
  'Travel trips, push reminders, and special-day notes',
  'Catalog gift orders that stay pending until paid in full',
  'Basic chat, safety, and report/block controls',
] as const;

export function isPlanTier(value: unknown): value is PlanTier {
  return value === 'free' || value === 'plus';
}

export function asPlanTier(value: unknown, fallback: PlanTier = 'free'): PlanTier {
  return isPlanTier(value) ? value : fallback;
}

export function isCouplePlanStatus(value: unknown): value is CouplePlanStatus {
  return value === 'inactive' || value === 'active' || value === 'canceled';
}

export function asCouplePlanStatus(value: unknown, fallback: CouplePlanStatus = 'inactive'): CouplePlanStatus {
  return isCouplePlanStatus(value) ? value : fallback;
}

export function isGiftPlanCount(value: unknown): value is GiftPlanCount {
  return value === 2 || value === 3 || value === 4;
}

export function asGiftPlanCount(value: unknown): GiftPlanCount | null {
  const n = typeof value === 'string' ? Number(value) : value;
  return isGiftPlanCount(n) ? n : null;
}

export function isGiftPlanStatus(value: unknown): value is GiftPlanStatus {
  return value === 'active' || value === 'completed' || value === 'cancelled';
}

export function asGiftPlanStatus(value: unknown, fallback: GiftPlanStatus = 'active'): GiftPlanStatus {
  return isGiftPlanStatus(value) ? value : fallback;
}

export function isInstallmentStatus(value: unknown): value is InstallmentStatus {
  return value === 'due' || value === 'paid';
}

export function asInstallmentStatus(value: unknown, fallback: InstallmentStatus = 'due'): InstallmentStatus {
  return isInstallmentStatus(value) ? value : fallback;
}

export function plusPeriodEnd(now = Date.now()) {
  return now + PLUS_PERIOD_MS;
}

export function plusIsActive(plan: {tier: string; status: string; expiresAt: number}, now = Date.now()) {
  return plan.tier === 'plus' && plan.status === 'active' && plan.expiresAt > now;
}

export function paymentProviderMode(checkout: 'disabled' | 'test' | 'live'): PaymentProviderMode {
  return checkout === 'disabled' ? 'demo' : checkout;
}

export function splitInstallments(totalCents: number, count: GiftPlanCount) {
  if (!Number.isInteger(totalCents) || totalCents < 50) return [] as number[];
  const base = Math.floor(totalCents / count);
  const parts = Array.from({length: count}, () => base);
  parts[parts.length - 1] += totalCents - base * count;
  return parts;
}

export function installmentDueDates(startDay: string, count: GiftPlanCount) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDay)) return [] as string[];
  const [year, month, day] = startDay.split('-').map(Number);
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(Date.UTC(year, month - 1 + i, day));
    dates.push(date.toISOString().slice(0, 10));
  }
  return dates;
}

export function assignInstallments(
  count: GiftPlanCount,
  ownerId: string,
  partnerId: string | null,
  splitWithPartner: boolean,
) {
  return Array.from({length: count}, (_, index) => {
    if (!splitWithPartner || !partnerId) return ownerId;
    return index % 2 === 0 ? ownerId : partnerId;
  });
}

export function planProgress(paidCents: number, totalCents: number) {
  const safeTotal = Math.max(0, totalCents);
  const safePaid = Math.min(Math.max(0, paidCents), safeTotal);
  return {
    paidCents: safePaid,
    remainingCents: safeTotal - safePaid,
    percent: safeTotal === 0 ? 0 : Math.round((safePaid / safeTotal) * 100),
    complete: safeTotal > 0 && safePaid >= safeTotal,
  };
}

export function canCreateGiftPlan(input: {
  plus: boolean;
  orderStatus: string;
  priceCents: number;
  existingPlan: boolean;
  installmentCount: unknown;
}) {
  if (!input.plus) return 'LoveLink Plus is needed to split or schedule a gift.';
  if (input.orderStatus !== 'pending_payment') return 'Only unpaid gift orders can start a payment plan.';
  if (input.existingPlan) return 'This gift already has a payment plan.';
  if (input.priceCents < 50) return 'That gift is too small to split.';
  if (!isGiftPlanCount(input.installmentCount)) return 'Choose 2, 3, or 4 payments.';
  return null;
}

export function canPayInstallment(input: {
  planStatus: string;
  installmentStatus: string;
  assignedUserId: string | null;
  actorId: string;
}) {
  if (input.planStatus !== 'active') return 'This payment plan is no longer open.';
  if (input.installmentStatus !== 'due') return 'That payment is already complete.';
  if (input.assignedUserId && input.assignedUserId !== input.actorId) {
    return 'This part is waiting for your partner.';
  }
  return null;
}

export function nextDueInstallment<T extends {status: string; sequence: number}>(items: T[]) {
  return items
    .filter((item) => item.status === 'due')
    .sort((a, b) => a.sequence - b.sequence)[0] || null;
}
