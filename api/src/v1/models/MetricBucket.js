const mongoose = require('mongoose');

/**
 * API traffic aggregated per 30-minute window × route × method × status class × client.
 * h0..h6 = latency bands ≤50, ≤100, ≤250, ≤500, ≤1000, ≤2500, >2500 ms (for p95).
 */
const metricBucketSchema = new mongoose.Schema(
  {
    start: { type: Date, required: true },
    route: { type: String, required: true },
    method: { type: String, required: true },
    status: { type: String, required: true },
    client: { type: String, required: true },
    count: { type: Number, default: 0 },
    errors4xx: { type: Number, default: 0 },
    errors5xx: { type: Number, default: 0 },
    totalMs: { type: Number, default: 0 },
    maxMs: { type: Number, default: 0 },
    h0: { type: Number, default: 0 },
    h1: { type: Number, default: 0 },
    h2: { type: Number, default: 0 },
    h3: { type: Number, default: 0 },
    h4: { type: Number, default: 0 },
    h5: { type: Number, default: 0 },
    h6: { type: Number, default: 0 },
  },
  { versionKey: false }
);

metricBucketSchema.index({ start: 1, route: 1, method: 1, status: 1, client: 1 }, { unique: true });
metricBucketSchema.index({ start: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.models.MetricBucket || mongoose.model('MetricBucket', metricBucketSchema);
