/**
 * Event Logging Configuration
 *
 * Configuration for the event logging system including batch writing,
 * Write-Ahead Log (WAL), and CloudEvents settings.
 *
 * Follows 12-factor methodology: configuration from environment variables.
 */

/**
 * Event logging configuration object
 */
export const eventConfig = {
  /**
   * Batch Writer Settings
   */
  batchSize: parseInt(process.env.EVENT_BATCH_SIZE || '100', 10),
  flushIntervalMs: parseInt(process.env.EVENT_FLUSH_INTERVAL_MS || '50', 10),

  /**
   * Write-Ahead Log (WAL) Settings
   * WAL provides crash recovery for events that fail to write to database
   */
  enableWAL: process.env.EVENT_ENABLE_WAL !== 'false',
  walPath: process.env.EVENT_WAL_PATH || './data/event-wal.jsonl',

  /**
   * CloudEvents Settings
   * @see https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md
   */
  cloudEventsSpecVersion: '1.0.2',
  cloudEventsTypePrefix: 'com.enterprise',
  cloudEventsSource: process.env.APP_URL || 'http://localhost:3000',

  /**
   * Performance Settings
   */
  maxBufferSizeBytes: parseInt(process.env.EVENT_MAX_BUFFER_SIZE || '10485760', 10), // 10MB default
  enableEventCapture: process.env.ENABLE_EVENT_CAPTURE !== 'false',

  /**
   * Emergency Buffer Settings
   * Used when both database and WAL fail
   */
  emergencyBufferPath: process.env.EVENT_EMERGENCY_BUFFER_PATH || './data/event-emergency.jsonl',
} as const;

export default eventConfig;
