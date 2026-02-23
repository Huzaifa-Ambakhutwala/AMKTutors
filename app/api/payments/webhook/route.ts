import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/firebase-admin";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }
  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }
    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const invoiceId = session.metadata?.invoiceId;
      if (invoiceId) {
        await adminDb.collection("invoices").doc(invoiceId).update({ status: "Paid" });
      }
    }
    return NextResponse.json({ received: true });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("Stripe webhook error:", err);
    return NextResponse.json({ error: err.message || "Webhook error" }, { status: 400 });
  }
}
