const mongoose = require('mongoose');

const aiProviderLogSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      index: true
    },
    model: {
      type: String,
      required: true
    },
    feature: {
      type: String,
      required: true,
      index: true
    },
    latencyMs: {
      type: Number,
      required: true
    },
    success: {
      type: Boolean,
      required: true,
      index: true
    },
    errorMessage: {
      type: String,
      required: false
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    }
  }
);

module.exports = mongoose.model('AIProviderLog', aiProviderLogSchema);
