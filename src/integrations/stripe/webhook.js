import { stripe, webhookSecret } from '../../config/stripe.js';
import { handlePaymentSuccess, handlePaymentFailure } from './payment.js';
import { handleTransferReversed, handlePayoutEvent } from './withdrawal.js';

const handleStripeWebhook = async (request, response) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(request.body, request.headers['stripe-signature'], webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    return response.status(400).json({ error: 'Invalid Stripe webhook signature' });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;
      case 'transfer.reversed':
        await handleTransferReversed(event.data.object);
        break;
      case 'payout.paid':
      case 'payout.failed':
        await handlePayoutEvent(event.type, event.data.object, event.account);
        break;
      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }
  } catch (error) {
    // A non-2xx response is intentional: Stripe should redeliver this event.
    console.error(`Failed to process Stripe event ${event.id}:`, error.message);
    return response.status(500).json({ error: 'Webhook processing failed' });
  }
  return response.status(200).json({ received: true });
};

export default handleStripeWebhook;
