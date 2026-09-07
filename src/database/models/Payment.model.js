import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  amount: {
    type: Number,
    min: [0, 'Amount cannot be negative'],
    required: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'refunded', 'failed'],
    default: 'pending'
  },
  method: {
    type: String
  },
  currentBalance: {
    type: Number,
    min: [0, 'Current balance cannot be negative'],
    default: 0
  },
  newBalance: {
    type: Number,
    min: [0, 'New balance cannot be negative'],
    default: 0
  },
  stripePaymentId: {
    type: String,
    unique: true,
    sparse: true
  },
  stripeSessionId: {
    type: String,
    unique: true,
    sparse: true
  },
  receiptUrl: {
    type: String
  },
  refundReason: {
    type: String
  },
  refundedAt: {
    type: Date
  },
  refundedAmount: {
    type: Number,
    default: 0
  },
  failedReason: {
    type: String
  },
  failedAt: {
    type: Date
  },
  billingDetails: {
    email: String,
    name: String,
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      country: String,
      postalCode: String
    }
  },
  cardLastFourDigits: {
    type: String,
    match: [/^\d{4}$/, 'Must be exactly 4 digits']
  },
  cardType: {
    type: String
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});




// Compound index for preventing duplicate webhook processing
paymentSchema.index({ stripePaymentId: 1, status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;