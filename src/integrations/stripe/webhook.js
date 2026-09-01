// webhook.js
import { stripe, webhookSecret } from "../../config/stripe.js";
import { handlePaymentSuccess, handlePaymentFailure } from "./payment.js";

const handleStripeWebhook = async (request, response) => {
  let event;

  try {
    // ✅ Verify webhook signature
    event = stripe.webhooks.constructEvent(
      request.body,
      request.headers['stripe-signature'],
      webhookSecret
    );
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error.message);
    // Always return 200 to prevent Stripe from retrying
    return response.status(200).json({ error: 'Signature verification failed' });
  }

  console.log('📨 Webhook event received:', event.type);
  console.log('📊 Event ID:', event.id);
  console.log('⏰ Event created:', new Date(event.created * 1000).toISOString());

  try {
    // ✅ Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('✅ Payment succeeded:', paymentIntent.id);
        console.log('💰 Amount:', paymentIntent.amount / 100);
        console.log('👤 User ID:', paymentIntent.metadata.userId);

        await handlePaymentSuccess(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object;
        console.log('❌ Payment failed:', failedPaymentIntent.id);
        console.log('❌ Error message:', failedPaymentIntent.last_payment_error?.message);
        console.log('❌ Error code:', failedPaymentIntent.last_payment_error?.code);

        await handlePaymentFailure(failedPaymentIntent);
        break;

      case 'payment_intent.requires_action':
        const requiresAction = event.data.object;
        console.log('🔐 Payment requires 3D Secure:', requiresAction.id);
        break;

      case 'charge.succeeded':
        const charge = event.data.object;
        console.log('💳 Charge succeeded:', charge.id);
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    // Don't return error to Stripe - they'll retry
  }

  // ✅ Always return 200 to acknowledge receipt
  response.status(200).json({ received: true });
};

export default handleStripeWebhook;