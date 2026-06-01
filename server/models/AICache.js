const mongoose = require('mongoose');

const aiCacheSchema = new mongoose.Schema(
  {
    promptHash: {
      type: String,
      required: true,
    },
    feature: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      required: true,
    },
    response: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: { expires: 86400 } // Expires in 24 hours (86400 seconds)
    }
  }
);

// Compound index for fast lookup
aiCacheSchema.index({ promptHash: 1, feature: 1 }, { unique: true });

module.exports = mongoose.model('AICache', aiCacheSchema);
