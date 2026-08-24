import mongoose from 'mongoose';
import crypto from 'crypto';

const tokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: [ 'refresh', 'resetPassword', 'verifyEmail', 'magicLink'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isRevoked: {
    type: Boolean,
    default: false
  },
  userAgent: String,
  ip: String
}, {
  timestamps: true
});

// Indexes
tokenSchema.index({ user: 1, type: 1 });
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Methods
tokenSchema.methods.isExpired = function () {
  return this.expiresAt < new Date();
};

// Static methods
tokenSchema.statics.createToken = async function (userId, type, duration = '7d') {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();

  const durationMap = {
    '1h': 3600000,
    '6h': 21600000,
    '1d': 86400000,
    '7d': 604800000,
    '30d': 2592000000
  };

  expiresAt.setTime(expiresAt.getTime() + (durationMap[duration] || durationMap['7d']));

  const tokenDoc = await this.create({
    user: userId,
    token,
    type,
    expiresAt
  });

  return tokenDoc;
};

tokenSchema.statics.verifyToken = async function (token, type) {
  const tokenDoc = await this.findOne({ token, type, isRevoked: false });

  if (!tokenDoc) {
    throw new Error('Invalid token');
  }

  if (tokenDoc.isExpired()) {
    throw new Error('Token expired');
  }

  return tokenDoc;
};

const Token = mongoose.model('Token', tokenSchema);
export default Token;