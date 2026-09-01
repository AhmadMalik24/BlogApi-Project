import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
console.log("Stripe Webhook Secret:", webhookSecret); // Log the webhook secret for debugging
export { stripe, webhookSecret };