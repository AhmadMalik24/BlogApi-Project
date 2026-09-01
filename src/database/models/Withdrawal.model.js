import mongoose from 'mongoose';

const withdrawalSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    bankAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankAccount',
        required: true
    },
    amount: {
        type: Number,
        required: [true, 'Withdrawal amount is required'],
        min: [0.50, 'Minimum withdrawal is $0.50'],
        max: [99999, 'Maximum withdrawal is $99,999']
    },
    fee: {
        type: Number,
        default: 0.25  // Stripe's standard transfer fee
    },
    netAmount: {
        type: Number,
        required: true
    },
    bankAccountLast4: {
        type: String,
        required: true
    },

    // Status tracking
    status: {
        type: String,
        enum: {
            values: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
            message: 'Invalid withdrawal status'
        },
        default: 'pending'
    },

    // Stripe transfer ID
    stripeTransferId: {
        type: String,
        index: true,
        unique: true,
        sparse: true
    },

    // Stripe payout ID (for tracking actual bank transfer)
    stripePayoutId: {
        type: String,
        index: true,
        sparse: true
    },

    // Error details if failed
    failureReason: String,
    failureCode: String,

    // Timestamps
    requestedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date,
    failedAt: Date,

    // Expected arrival
    expectedArrival: Date,

    // Metadata for tracking
    idempotencyKey: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    metadata: mongoose.Schema.Types.Mixed,

    // Audit trail
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index for queries
withdrawalSchema.index({ user: 1, status: 1 });
withdrawalSchema.index({ stripeTransferId: 1, status: 1 });
withdrawalSchema.index({ requestedAt: -1 });

// Virtual for formatted display
withdrawalSchema.virtual('displayStatus').get(function () {
    const statusMap = {
        pending: '⏳ Pending',
        processing: '🔄 Processing',
        completed: '✅ Completed',
        failed: '❌ Failed',
        cancelled: '❌ Cancelled'
    };
    return statusMap[this.status] || this.status;
});

const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);
export default Withdrawal;
