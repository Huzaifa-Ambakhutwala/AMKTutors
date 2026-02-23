import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/firebase-admin";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }
  try {
    const { invoiceId, successUrl, cancelUrl } = await req.json();
    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
    }
    const invDoc = await adminDb.collection("invoices").doc(invoiceId).get();
    if (!invDoc.exists) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    const invoice = invDoc.data() as { totalAmount: number; invoiceNumber: string; status?: string };
    if (invoice.status === "Paid") {
      return NextResponse.json({ error: "Invoice is already paid" }, { status: 400 });
    }
    const amountCents = Math.round((invoice.totalAmount || 0) * 100);
    if (amountCents <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin") || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: `Invoice ${invoice.invoiceNumber}`,
              description: "AMK Tutors – Tutoring services",
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl || `${baseUrl}/parent/invoices?paid=1`,
      cancel_url: cancelUrl || `${baseUrl}/parent/invoices`,
      metadata: { invoiceId },
    });
    return NextResponse.json({ url: session.url });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("Create checkout session error:", err);
    return NextResponse.json({ error: err.message || "Payment error" }, { status: 500 });
  }
}
