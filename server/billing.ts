import Stripe from "stripe";
import { eq } from "drizzle-orm";
import type { Express, Request, Response } from "express";
import { db } from "./db";
import { users, subscriptions, stripeEvents } from "../shared/schema";
import { requireAuth } from "./auth";

interface AuthedRequest extends Request {
  user: { id: number; email: string };
}

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
const BASE_URL = process.env.BASE_URL ?? "http://localhost:5000";

if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
if (!STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-01-27.acacia" as Stripe.LatestApiVersion,
});

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
  if (priceId) {
    const tier = key.replace(/_monthly$|_annual$/, "");
    PRICE_TO_TIER[priceId] = tier;
  }
}

async function withStripeRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (
        err instanceof Stripe.errors.StripeCardError ||
        err instanceof Stripe.errors.StripeInvalidRequestError
      ) {
        throw err;
      }
      const isRetryable =
        err instanceof Stripe.errors.StripeRateLimitError ||
        err instanceof Stripe.errors.StripeConnectionError ||
        (err instanceof Stripe.errors.StripeError &&
          typeof err.statusCode === "number" &&
          err.statusCode >= 500);
      if (!isRetryable || attempt === maxRetries) throw err;
      const baseMs = Math.pow(2, attempt) * 200;
      const jitterMs = Math.random() * 200;
      await new Promise((resolve) => setTimeout(resolve, baseMs + jitterMs));
    }
  }
  throw lastError;
}

async function getOrCreateStripeCustomer(userId: number, email: string): Promise<string> {
  const [row] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, userId));

  if (row?.stripeCustomerId) {
    return row.stripeCustomerId;
  }

  const customer = await withStripeRetry(() =>
    stripe.customers.create(
      { email, metadata: { userId: String(userId) } },
      { idempotencyKey: `customer-create-${userId}` }
    )
  );

  await db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, userId));
  return customer.id;
}

async function handleCheckout(req: Request, res: Response): Promise<void> {
  const { priceId } = req.body as { priceId?: string };
  if (!priceId || !ALLOWED_PRICES.has(priceId)) {
    res.status(400).json({ error: "Invalid or missing priceId" });
    return;
  }
  const authed = req as AuthedRequest;
  const stripeCustomerId = await getOrCreateStripeCustomer(authed.user.id, authed.user.email);

  const session = await withStripeRetry(() =>
    stripe.checkout.sessions.create(
      {
        customer: stripeCustomerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${BASE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${BASE_URL}/billing/cancel`,
        metadata: { userId: String(authed.user.id) },
      },
      { idempotencyKey: crypto.randomUUID() }
    )
  );

  res.json({ url: session.url });
}

async function handlePortal(req: Request, res: Response): Promise<void> {
  const authed = req as AuthedRequest;
  const [row] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, authed.user.id));

  if (!row?.stripeCustomerId) {
    res.status(404).json({ error: "No billing account found for this user" });
    return;
  }

  const session = await withStripeRetry(() =>
    stripe.billingPortal.sessions.create(
      { customer: row.stripeCustomerId!, return_url: `${BASE_URL}/billing` },
      { idempotencyKey: crypto.randomUUID() }
    )
  );

  res.json({ url: session.url });
}

async function handleWebhook(req: Request, res: Response): Promise<void> {
  const rawBody = req.rawBody as Buffer;
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    res.status(400).json({ error: "Missing stripe-signature header" });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[billing] Webhook signature verification failed:", msg);
    res.status(400).json({ error: `Webhook verification failed: ${msg}` });
    return;
  }

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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;
        const rawUserId = session.metadata?.userId;
        const userId = rawUserId ? parseInt(rawUserId, 10) : NaN;
        if (!rawUserId || isNaN(userId)) break;

        const sub = await withStripeRetry(() =>
          stripe.subscriptions.retrieve(session.subscription as string)
        );
        const priceId = sub.items.data[0]?.price?.id;
        const planTier = (priceId && PRICE_TO_TIER[priceId]) ?? "unknown";
        const currentPeriodEnd = new Date(
          (sub as unknown as { current_period_end: number }).current_period_end * 1000
        );

        await db
          .insert(subscriptions)
          .values({
            userId,
            stripeSubscriptionId: sub.id,
            stripeCustomerId: sub.customer as string,
            planTier,
            status: sub.status,
            currentPeriodEnd,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          })
          .onConflictDoUpdate({
            target: subscriptions.stripeSubscriptionId,
            set: {
              stripeCustomerId: sub.customer as string,
              planTier,
              status: sub.status,
              currentPeriodEnd,
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
          });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price?.id;
        const planTier = (priceId && PRICE_TO_TIER[priceId]) ?? "unknown";
        const currentPeriodEnd = new Date(
          (sub as unknown as { current_period_end: number }).current_period_end * 1000
        );
        await db
          .update(subscriptions)
          .set({ planTier, status: sub.status, currentPeriodEnd, cancelAtPeriodEnd: sub.cancel_at_period_end })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db
          .update(subscriptions)
          .set({ status: "canceled" })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(
          `[billing] invoice.payment_failed: invoiceId=${invoice.id} customerId=${invoice.customer} attempt=${invoice.attempt_count}`
        );
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`[billing] Error processing webhook event ${event.id} (${event.type}):`, err);
    res.status(500).json({ error: "Webhook processing failed" });
    return;
  }

  res.json({ received: true });
}

export function setupBilling(app: Express): void {
  app.post("/api/checkout", requireAuth, (req: Request, res: Response): void => {
    handleCheckout(req, res).catch((err: unknown) => {
      console.error("[billing] handleCheckout unhandled error:", err);
      if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
    });
  });

  app.post("/api/customer-portal", requireAuth, (req: Request, res: Response): void => {
    handlePortal(req, res).catch((err: unknown) => {
      console.error("[billing] handlePortal unhandled error:", err);
      if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
    });
  });

  app.post("/api/webhooks/stripe", (req: Request, res: Response): void => {
    handleWebhook(req, res).catch((err: unknown) => {
      console.error("[billing] handleWebhook unhandled error:", err);
      if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
    });
  });
}
