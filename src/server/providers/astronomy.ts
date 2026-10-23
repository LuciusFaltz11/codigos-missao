import { Engine, VERSION, type Chart } from "caelus";
import { embeddedData } from "caelus/data-embedded";
import { z } from "zod";
import type { IntegrationState } from "@/server/env";

const positionSchema = z.object({
  pointId: z.string().min(1),
  longitude: z.number().finite(),
  retrograde: z.boolean().nullable(),
});

const calculationSchema = z.object({
  engine: z.string().min(1),
  engineVersion: z.string().min(1),
  positions: z.array(positionSchema),
  cusps: z.array(z.number().finite()).length(12),
  ascendantLongitude: z.number().finite(),
  midheavenLongitude: z.number().finite(),
  parameters: z.record(z.string(), z.string()),
});

export type NatalCalculation = z.infer<typeof calculationSchema>;

export type AstronomyInput = {
  utcIso: string;
  latitude: number;
  longitude: number;
  houseSystem: "placidus" | "whole_sign";
  zodiac: "tropical" | "sidereal";
  nodeMode: "true" | "mean";
  fortunaRule: "pending_approval" | "day_night_traditional";
};

export type AstronomyResult =
  | { status: "not_configured" | "license_unconfirmed" }
  | { status: "failed"; errorCode: string }
  | { status: "complete"; calculation: NatalCalculation };

export interface AstronomyProvider {
  state: IntegrationState;
  calculate(input: AstronomyInput): Promise<AstronomyResult>;
}

export function parseNatalCalculation(payload: unknown): NatalCalculation {
  return calculationSchema.parse(payload);
}

export class NotConfiguredAstronomyProvider implements AstronomyProvider {
  state: IntegrationState;
  constructor(state: IntegrationState = "not_configured") {
    this.state = state;
  }
  async calculate(): Promise<AstronomyResult> {
    return { status: this.state === "license_unconfirmed" ? "license_unconfirmed" : "not_configured" };
  }
}

export class SwissWorkerAstronomyProvider implements AstronomyProvider {
  state: IntegrationState = "configured";
  constructor(
    private readonly url: string,
    private readonly secret: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async calculate(input: AstronomyInput): Promise<AstronomyResult> {
    try {
      const response = await this.fetchImpl(this.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.secret}`,
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) return { status: "failed", errorCode: "worker_http_error" };
      const calculation = parseNatalCalculation(await response.json());
      return { status: "complete", calculation };
    } catch {
      return { status: "failed", errorCode: "worker_invalid_response" };
    }
  }
}

const EPHEMERIS_BODIES = [
  ["sun", "sun"],
  ["moon", "moon"],
  ["mercury", "mercury"],
  ["venus", "venus"],
  ["mars", "mars"],
  ["jupiter", "jupiter"],
  ["saturn", "saturn"],
  ["uranus", "uranus"],
  ["neptune", "neptune"],
  ["pluto", "pluto"],
  ["chiron", "chiron"],
] as const;

let sharedEngine: Engine | null = null;

function caelusEngine() {
  sharedEngine ??= new Engine(embeddedData);
  return sharedEngine;
}

function utcParts(utcIso: string) {
  const instant = new Date(utcIso);
  if (Number.isNaN(instant.getTime())) return null;
  return {
    year: instant.getUTCFullYear(),
    month: instant.getUTCMonth() + 1,
    day: instant.getUTCDate(),
    hour: instant.getUTCHours(),
    minute: instant.getUTCMinutes(),
    second: instant.getUTCSeconds(),
  };
}

export class CaelusAstronomyProvider implements AstronomyProvider {
  state: IntegrationState = "configured";

  async calculate(input: AstronomyInput): Promise<AstronomyResult> {
    if (input.zodiac !== "tropical") {
      return { status: "failed", errorCode: "sidereal_ayanamsa_unconfigured" };
    }
    const parts = utcParts(input.utcIso);
    if (!parts) return { status: "failed", errorCode: "invalid_instant" };

    let chart: Chart;
    try {
      chart = caelusEngine().chart(
        parts.year,
        parts.month,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second,
        input.latitude,
        input.longitude,
        { houseSystem: input.houseSystem, zodiac: "tropical" },
      );
    } catch {
      return { status: "failed", errorCode: "calculation_error" };
    }

    if (chart.houseSystem !== input.houseSystem) {
      return { status: "failed", errorCode: "house_system_unavailable" };
    }

    const nodeBody = input.nodeMode === "mean" ? "mean_node" : "true_node";
    const required = [...EPHEMERIS_BODIES.map(([, body]) => body), nodeBody];
    if (required.some((body) => chart.unavailable.includes(body) || !chart.bodies[body])) {
      return { status: "failed", errorCode: "body_unavailable" };
    }
    const unvalidated = chart.warnings.some(
      (warning) => warning.kind === "outside_validated_range" && required.includes(warning.body),
    );
    if (unvalidated) return { status: "failed", errorCode: "position_unvalidated" };

    const positions: Array<{ pointId: string; longitude: number; retrograde: boolean | null }> = EPHEMERIS_BODIES.map(([pointId, body]) => {
      const position = chart.bodies[body]!;
      return { pointId, longitude: position.lon, retrograde: position.retrograde };
    });
    const node = chart.bodies[nodeBody]!;
    positions.push({ pointId: "north_node", longitude: node.lon, retrograde: node.retrograde });

    if (input.fortunaRule === "day_night_traditional") {
      const fortune = caelusEngine().lots(chart).find((lot) => lot.lot === "fortune");
      if (!fortune) return { status: "failed", errorCode: "fortune_unavailable" };
      positions.push({ pointId: "part_of_fortune", longitude: fortune.lon, retrograde: null });
    }

    return {
      status: "complete",
      calculation: {
        engine: "caelus",
        engineVersion: VERSION,
        positions,
        cusps: chart.cusps,
        ascendantLongitude: chart.angles.asc,
        midheavenLongitude: chart.angles.mc,
        parameters: {
          zodiac: "tropical",
          houseSystem: chart.houseSystem,
          nodeMode: input.nodeMode,
          dataTier: "embedded",
          fortuna: input.fortunaRule,
        },
      },
    };
  }
}

export function createAstronomyProvider(input: {
  engine: string;
  licenseConfirmed: boolean;
  workerUrl?: string;
  workerSecret?: string;
}): AstronomyProvider {
  if (input.engine === "caelus") return new CaelusAstronomyProvider();
  if (input.engine !== "swiss_worker") return new NotConfiguredAstronomyProvider("not_configured");
  if (!input.licenseConfirmed) return new NotConfiguredAstronomyProvider("license_unconfirmed");
  if (!input.workerUrl || !input.workerSecret) return new NotConfiguredAstronomyProvider("not_configured");
  return new SwissWorkerAstronomyProvider(input.workerUrl, input.workerSecret);
}
