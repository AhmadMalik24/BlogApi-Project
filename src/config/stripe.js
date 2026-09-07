import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
// A wallet must use one currency end-to-end: charging, Connect transfers, and payouts.
// An explicit value always wins; AU platforms default to AUD so their external accounts are valid.
const platformCountry = process.env.STRIPE_PLATFORM_COUNTRY?.toUpperCase();
const defaultWalletCurrency = platformCountry === 'AU' ? 'aud' : 'usd';
const walletCurrency = (process.env.STRIPE_WALLET_CURRENCY || defaultWalletCurrency).toLowerCase();

export { stripe, webhookSecret, walletCurrency };
