import { stripe, webhookSecret } from '../../config/stripe.js';
import { handlePaymentSuccess, handlePaymentFailure } from './payment.js';
import { handleTransferReversed, handlePayoutEvent } from './withdrawal.js';
import User from '../../database/models/User.model.js'; // Add this import

const handleStripeWebhook = async (request, response) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      request.body, 
      request.headers['stripe-signature'], 
      webhookSecret
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    return response.status(400).json({ error: 'Invalid Stripe webhook signature' });
  }

  try {
    switch (event.type) {
      // 🔵 Existing payment events
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

      // 🟢 NEW: Account updated events
      case 'account.updated': {
        const account = event.data.object;
        console.log(`📬 Account updated: ${account.id}`);
        
        // Check if payouts were just enabled
        if (account.payouts_enabled === true) {
          console.log(`🎉 Payouts ENABLED for account: ${account.id}`);
          
          // Update user in database
          await User.findOneAndUpdate(
            { stripeConnectAccountId: account.id },
            {
              payoutsEnabled: true,
              payoutsEnabledAt: new Date(),
              chargesEnabled: account.charges_enabled || false,
              detailsSubmitted: account.details_submitted || false,
              'stripeAccount.status': 'active'
            },
            { new: true }
          );
          
          // Optional: Send notification to user
          // await notifyUserPayoutsEnabled(account.id);
        }
        
        // Also check if details were submitted (important for onboarding)
        if (account.details_submitted === true) {
          console.log(`📝 Details submitted for account: ${account.id}`);
          
          await User.findOneAndUpdate(
            { stripeConnectAccountId: account.id },
            {
              detailsSubmitted: true,
              detailsSubmittedAt: new Date()
            }
          );
        }
        break;
      }

      // 🟢 NEW: Capability updated events
      case 'capability.updated': {
        const capability = event.data.object;
        console.log(`📬 Capability updated: ${capability.capability} (${capability.status}) for account: ${capability.account}`);
        
        // 🎯 CRITICAL: Check for transfer capability (payouts)
        if (capability.capability === 'transfers') {
          const status = capability.status;
          
          switch (status) {
            case 'active':
              console.log(`🎉 Transfer capability ACTIVE for account: ${capability.account}`);
              console.log('🔥 Payouts are now ENABLED!');
              
              // Update user in database
              await User.findOneAndUpdate(
                { stripeConnectAccountId: capability.account },
                {
                  transferCapability: 'active',
                  transferEnabledAt: new Date(),
                  payoutsEnabled: true,
                  payoutsEnabledAt: new Date(),
                  'stripeAccount.capabilities.transfers': 'active'
                },
                { new: true }
              );
              
              // Trigger any post-payout actions
              // await handlePayoutsEnabled(capability.account);
              break;
              
            case 'pending':
              console.log(`⏳ Transfer capability PENDING for account: ${capability.account}`);
              console.log('⏳ Waiting for Stripe verification...');
              
              await User.findOneAndUpdate(
                { stripeConnectAccountId: capability.account },
                {
                  transferCapability: 'pending',
                  'stripeAccount.capabilities.transfers': 'pending'
                }
              );
              break;
              
            case 'inactive':
            case 'disabled':
              console.log(`❌ Transfer capability ${status} for account: ${capability.account}`);
              
              await User.findOneAndUpdate(
                { stripeConnectAccountId: capability.account },
                {
                  transferCapability: status,
                  payoutsEnabled: false,
                  'stripeAccount.capabilities.transfers': status
                }
              );
              break;
              
            default:
              console.log(`⚠️ Unknown transfer status: ${status}`);
          }
        }
        
        // Also check card payments capability if needed
        if (capability.capability === 'card_payments') {
          console.log(`💳 Card payments capability: ${capability.status}`);
          
          await User.findOneAndUpdate(
            { stripeConnectAccountId: capability.account },
            {
              'stripeAccount.capabilities.card_payments': capability.status
            }
          );
        }
        
        break;
      }

      // 🟢 NEW: Person updated (for verification status)
      case 'person.updated': {
        const person = event.data.object;
        console.log(`📬 Person updated: ${person.id} for account: ${person.account}`);
        
        // Track verification status
        if (person.verification?.status) {
          console.log(`Verification status: ${person.verification.status}`);
          
          await User.findOneAndUpdate(
            { stripeConnectAccountId: person.account },
            {
              'stripeAccount.personVerification': {
                status: person.verification.status,
                updatedAt: new Date()
              }
            }
          );
        }
        break;
      }

      default:
        console.log(`⚠️ Unhandled Stripe event: ${event.type}`);
    }
  } catch (error) {
    console.error(`❌ Failed to process Stripe event ${event.id}:`, error.message);
    console.error(error.stack);
    return response.status(500).json({ error: 'Webhook processing failed' });
  }
  
  return response.status(200).json({ received: true });
};

export default handleStripeWebhook;