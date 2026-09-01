import mongoose from 'mongoose';

const bankAccountSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    accountHolderName: {
        type: String,
        required: [true, 'Account holder name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    accountNumber: {
        type: String,
        required: [true, 'Account number is required'],
        minlength: [8, 'Account number must be at least 8 digits'],
        maxlength: [20, 'Account number cannot exceed 20 digits'],
        match: [/^\d{8,20}$/, 'Account number must contain only digits']
    },
    routingNumber: {
        type: String,
        required: [true, 'Routing number is required'],
        match: [/^\d{6,9}$/, 'Routing number must be 6-9 digits']
    },
    accountType: {
        type: String,
        enum: {
            values: ['checking', 'savings'],
            message: 'Account type must be either checking or savings'
        },
        required: [true, 'Account type is required']
    },
    last4: {
        type: String,
        length: [4, 'Last 4 must be exactly 4 digits'],
        required: true
    },
    bankName: {
        type: String,
        maxlength: [100, 'Bank name cannot exceed 100 characters']
    },

    // Verification status
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'failed'],
        default: 'pending'
    },
    verificationAttempts: {
        type: Number,
        default: 0
    },
    verifiedAt: Date,
    verificationFailureReason: String,

    // Stripe IDs
    stripeConnectAccountId: {
        type: String,
        index: true
    },
    bankAccountId: {
        type: String,
        index: true
    },

    // Primary account for this user
    isPrimary: {
        type: Boolean,
        default: true
    },

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

// Ensure only one primary per user
bankAccountSchema.index({ user: 1, isPrimary: 1 });

// Virtual to show obfuscated account number
bankAccountSchema.virtual('obfuscatedAccountNumber').get(function () {
    return '*'.repeat(this.accountNumber.length - 4) + this.last4;
});

const BankAccount = mongoose.model('BankAccount', bankAccountSchema);
export default BankAccount;
