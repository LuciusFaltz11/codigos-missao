export const READING_DELIVERY_PHASES = ["queued", "interpreting", "composing", "ready", "failed"] as const;

export type ReadingDeliveryPhase = (typeof READING_DELIVERY_PHASES)[number];

export type ReadingDeliveryState = {
  phase: ReadingDeliveryPhase;
  progress: number;
  poll: boolean;
  interpretationReady: boolean;
  deliveryReady: boolean;
};

const FAILED_READING = new Set(["permanent_failed", "failed_validation", "editorial_blocked"]);

export function resolveReadingDelivery(input: {
  readingStatus: string | null;
  interpretationValid: boolean;
  reportStatus: string | null;
  reportHasFile: boolean;
}): ReadingDeliveryState {
  const failed = FAILED_READING.has(input.readingStatus ?? "") || input.reportStatus === "failed";
  if (failed) {
    return {
      phase: "failed",
      progress: 0,
      poll: false,
      interpretationReady: input.interpretationValid,
      deliveryReady: false,
    };
  }

  const deliveryReady = input.interpretationValid && input.reportStatus === "ready" && input.reportHasFile;
  if (deliveryReady) {
    return {
      phase: "ready",
      progress: 100,
      poll: false,
      interpretationReady: true,
      deliveryReady: true,
    };
  }

  if (input.interpretationValid) {
    return {
      phase: "composing",
      progress: 80,
      poll: true,
      interpretationReady: true,
      deliveryReady: false,
    };
  }

  if (input.readingStatus === "processing" || input.readingStatus === "retryable_failed") {
    return {
      phase: "interpreting",
      progress: 45,
      poll: true,
      interpretationReady: false,
      deliveryReady: false,
    };
  }

  return {
    phase: "queued",
    progress: 15,
    poll: true,
    interpretationReady: false,
    deliveryReady: false,
  };
}
