const mongoose = require('mongoose');

const aiCareerRoadmapSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      default: 'New Career Roadmap',
    },
    targetRole: {
      type: String,
      required: true,
      default: 'Full-Stack Developer',
    },
    targetCompany: {
      type: String,
      required: true,
      default: 'Tech Companies',
    },
    roadmap: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

aiCareerRoadmapSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AICareerRoadmap', aiCareerRoadmapSchema);
