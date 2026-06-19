import { createHmac, timingSafeEqual, randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import type { Express, Request, Response } from "express";
import { db } from "./db";
import { users, subscriptions, stripeEvents } from "../shared/schema";
import { requireAuth } from "./auth";
const STRIPE_API_BASE = "https://api.stripe.com/v1";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
const BASE_URL = process.env.BASE_URL ?? "http://localhost:5000";
const PRICE_MAP = {
  starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? "",
  starter_annual: process.env.STRIPE_PRICE_STARTER_ANNUAL ?? "",
  creator_monthly: process.env.STRIPE_PRICE_CREATOR_MONTHLY ?? "",
  creator_annual: process.env.STRIPE_PRICE_CREATOR_ANNUAL ?? "",
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
  pro_annual: process.env.STRIPE_PRICE_PRO_ANNUAL ?? "",
  scale_monthly: process.env.STRIPE_PRICE_SCALE_MONTHLY ?? "",
  scale_annual: process.env.STRIPE_PRICE_SCALE_ANNUAL ?? "",
  business_monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY ?? "",
  business_annual: process.env.STRIPE_PRICE_BUSINESS_ANNUAL ?? "",
} as const;
const ALLOWED_PRICES = new Set<string>(Object.values(PRICE_MAP).filter(Boolean));
const PRICE_TO_TIER: Record<string, string> = {};
for (const [key, priceId] of Object.entries(PRICE_MAP)) {
  if (priceId) PRICE_TO_TIER[priceId] = key.replace(/_monthly$|_annual$/, "");
}
type StripeCustomer = { id: string };
type StripeCheckoutSession = { id: string; url: string | null };
type StripePortalSession = { id: string; url: string };
type StripeSubscriptionLike = {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  items?: { data?: Array<{ price?: { id?: string } }> };
};
type StripeEvent = { id: string; type: string; data: { object: Record<string, unknown> } };
type AuthedRequest = Request & { user: Express.User };
function stripeConfigured(): boolean {
  return Boolean(STRIPE_SECRET_KEY);
}
function appendParam(params: URLSearchParams, key: string, value: string | number | boolean | undefined): void {
  if (value !== undefined) params.append(key, String(value));
}
async function postStripeForm<T>(
  path: string,
  params: URLSearchParams,
  idempotencyKey = randomUUID(),
): Promise<T> {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": idempotencyKey,
    },
    body: params,
  });
  const payload = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Stripe API error ${response.status}`);
  }
  return payload;
}
async function getOrCreateStripeCustomer(userId: string, email?: string | null): Promise<string> {
  const [row] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, userId));
  if (row?.stripeCustomerId) return row.stripeCustomerId;
  const params = new URLSearchParams();
  if (email) appendParam(params, "email", email);
  appendParam(params, "metadata[userId]", userId);
  const customer = await postStripeForm<StripeCustomer>(
    "/customers",
    params,
    `customer-create-${userId}`,
  );
  await db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, userId));
  return customer.id;
}
async function handleCheckout(req: Request, res: Response): Promise<void> {
  if (!stripeConfigured()) {
    res.status(503).json({ error: "Stripe is not configured" });
    return;
  }
  const { priceId } = req.body as { priceId?: string };
  if (!priceId || !ALLOWED_PRICES.has(priceId)) {
    res.status(400).json({ error: "Invalid or missing priceId" });
    return;
  }
  const authed = req as AuthedRequest;
  const customerId = await getOrCreateStripeCustomer(authed.user.id, authed.user.email);
  const params = new URLSearchParams();
  appendParam(params, "mode", "subscription");
  appendParam(params, "customer", customerId);
  appendParam(params, "line_items[0][price]", priceId);
  appendParam(params, "line_items[0][quantity]", 1);
  appendParam(params, "success_url", `${BASE_URL}/dashboard?success=true`);
  appendParam(params, "cancel_url", `${BASE_URL}/#pricing`);
  appendParam(params, "metadata[userId]", authed.user.id);
  const session = await postStripeForm<StripeCheckoutSession>(
    "/checkout/sessions",
    params,
  );
  res.json({ url: session.url });
}
async function handlePortal(req: Request, res: Response): Promise<void> {
  if (!stripeConfigured()) {
    res.status(503).json({ error: "Stripe is not configured" });
    return;
  }
  const authed = req as AuthedRequest;
  const [row] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, authed.user.id));
  if (!row?.stripeCustomerId) {
    res.status(404).json({ error: "No billing account found for this user" });
    return;
  }
  const params = new URLSearchParams();
  appendParam(params, "customer", row.stripeCustomerId);
  appendParam(params, "return_url", `${BASE_URL}/dashboard`);
  const session = await postStripeForm<StripePortalSession>("/billing_portal/sessions", params);
  res.json({ url: session.url });
}
function verifyStripeSignature(rawBody: Buffer, signatureHeader: string): boolean {
  if (!STRIPE_WEBHOOK_SECRET) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  const payload = `${timestamp}.${rawBody.toString("utf8")}`;
  const expected = createHmac("sha256", STRIPE_WEBHOOK_SECRET).update(payload).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const suppliedBuf = Buffer.from(signature, "hex");
  return expectedBuf.length === suppliedBuf.length && timingSafeEqual(expectedBuf, suppliedBuf);
}
function subscriptionFromEventObject(object: Record<string, unknown>): StripeSubscriptionLike {
  return object as StripeSubscriptionLike;
}
async function upsertSubscription(subscription: StripeSubscriptionLike): Promise<void> {
  const stripeCustomerId = subscription.customer;
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.stripeCustomerId, stripeCustomerId));
  if (!user) {
    console.warn(`[billing] No Liberty Echo user found for Stripe customer ${stripeCustomerId}`);
    return;
  }
  const priceId = subscription.items?.data?.[0]?.price?.id ?? "";
  const planTier = PRICE_TO_TIER[priceId] ?? "unknown";
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : new Date();
  await db
    .insert(subscriptions)
    .values({
      userId: user.id,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId,
      planTier,
      status: subscription.status,
      currentPeriodEnd,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    })
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: {
        stripeCustomerId,
        planTier,
        status: subscription.status,
        currentPeriodEnd,
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      },
    });
}
async function handleWebhook(req: Request, res: Response): Promise<void> {
  const rawBody = req.rawBody instanceof Buffer ? req.rawBody : Buffer.from(JSON.stringify(req.body));
  const sig = req.headers["stripe-signature"];
  if (!STRIPE_WEBHOOK_SECRET || typeof sig !== "string" || !verifyStripeSignature(rawBody, sig)) {
    res.status(400).json({ error: "Webhook signature verification failed" });
    return;
  }
  const event = JSON.parse(rawBody.toString("utf8")) as StripeEvent;
  const existing = await db
    .select({ id: stripeEvents.id })
    .from(stripeEvents)
    .where(eq(stripeEvents.stripeEventId, event.id));
  if (existing.length > 0) {
    res.json({ received: true, duplicate: true });
    return;
  }
  await db.insert(stripeEvents).values({
    stripeEventId: event.id,
    type: event.type,
    processedAt: new Date(),
  });
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertSubscription(subscriptionFromEventObject(event.data.object));
      break;
    case "customer.subscription.deleted": {
      const subscription = subscriptionFromEventObject(event.data.object);
      await db
        .update(subscriptions)
        .set({ status: "canceled", cancelAtPeriodEnd: true })
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
      break;
    }
    case "invoice.payment_failed":
      console.warn("[billing] invoice.payment_failed", event.data.object);
      break;
    default:
      break;
  }
  res.json({ received: true });
}
export function setupBilling(app: Express): void {
  app.post("/api/checkout", requireAuth, (req, res) => {
    void handleCheckout(req, res).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "Checkout failed";
      console.error("[billing] Checkout failed:", err);
      res.status(500).json({ error: message });
    });
  });
  app.post("/api/customer-portal", requireAuth, (req, res) => {
    void handlePortal(req, res).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "Customer portal failed";
      console.error("[billing] Customer portal failed:", err);
      res.status(500).json({ error: message });
    });
  });
  app.post("/api/webhooks/stripe", (req, res) => {
    void handleWebhook(req, res).catch((err: unknown) => {
      console.error("[billing] Webhook processing failed:", err);
      res.status(500).json({ error: "Webhook processing failed" });
    });
  });
}
