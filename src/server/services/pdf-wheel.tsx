import React from "react";
import { Circle, G, Line, Path, Svg, Text } from "@react-pdf/renderer";
import { chartPoint, forwardMidpoint, SIGN_GLYPHS, signElement, type NatalChartView } from "@/features/astrology/wheel";

const SIZE = 280;
const CENTER = SIZE / 2;
const GOLD = "#C7A96B";
const WINE = "#1E332D";
const INK = "#0B0A09";
const MUTED = "#60605F";
const IVORY = "#F3F3F3";
const BORDER = "#D9D9D9";
const GOLD_SOFT = "#F6F1E6";

const ELEMENT_COLOR = {
  fogo: "#C58E8D",
  terra: "#1E332D",
  ar: "#5679BC",
  agua: "#60605F",
} as const;

function at(longitude: number, ascendant: number, radius: number) {
  const point = chartPoint(longitude, ascendant, radius);
  return { x: CENTER + point.x, y: CENTER + point.y };
}

function sector(start: number, end: number, inner: number, outer: number, ascendant: number) {
  const outerStart = at(start, ascendant, outer);
  const outerEnd = at(end, ascendant, outer);
  const innerEnd = at(end, ascendant, inner);
  const innerStart = at(start, ascendant, inner);
  return `M ${outerStart.x} ${outerStart.y} A ${outer} ${outer} 0 0 0 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${inner} ${inner} 0 0 1 ${innerStart.x} ${innerStart.y} Z`;
}

function planetRadii(chart: NatalChartView) {
  const placed: Array<{ longitude: number; radius: number }> = [];
  return chart.bodies.map((body) => {
    if (body.pointId === "ascendant" || body.pointId === "midheaven") {
      return { ...body, radius: 118 };
    }
    let radius = 92;
    while (
      radius > 64 &&
      placed.some((item) => {
        const distance = Math.min(
          Math.abs(item.longitude - body.longitude),
          360 - Math.abs(item.longitude - body.longitude),
        );
        return distance < 9 && Math.abs(item.radius - radius) < 10;
      })
    ) {
      radius -= 10;
    }
    placed.push({ longitude: body.longitude, radius });
    return { ...body, radius };
  });
}

export function PdfNatalWheel({
  chart,
  markedPointIds,
}: {
  chart: NatalChartView;
  markedPointIds: readonly string[];
}) {
  const marked = new Set(markedPointIds);
  const ascendant = chart.ascendantLongitude;
  const bodies = planetRadii(chart);

  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <Circle cx={CENTER} cy={CENTER} r="134" fill="#FFFFFF" stroke={BORDER} />
      {Array.from({ length: 12 }, (_, index) => {
        const start = index * 30;
        const element = signElement(index);
        return (
          <Path
            key={start}
            d={sector(start, start + 30, 106, 132, ascendant)}
            fill={ELEMENT_COLOR[element]}
            fillOpacity={0.18}
            stroke="#FFFFFF"
          />
        );
      })}
      <Circle cx={CENTER} cy={CENTER} r="106" fill="none" stroke={GOLD} />
      <Circle cx={CENTER} cy={CENTER} r="70" fill="none" stroke={BORDER} />
      <Circle cx={CENTER} cy={CENTER} r="42" fill={IVORY} stroke={BORDER} />
      {SIGN_GLYPHS.map((glyph, index) => {
        const position = at(index * 30 + 15, ascendant, 119);
        return (
          <Text
            key={glyph}
            x={position.x}
            y={position.y + 3}
            style={{ fontSize: 8, fill: INK, fontFamily: "Times-Roman" }}
            textAnchor="middle"
          >
            {`${glyph}\uFE0E`}
          </Text>
        );
      })}
      {chart.cusps.map((cusp, index) => {
        const outer = at(cusp, ascendant, 100);
        const inner = at(cusp, ascendant, 42);
        const axis = index === 0 || index === 9;
        return (
          <Line
            key={`${cusp}-${index}`}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke={axis ? WINE : GOLD}
            strokeWidth={axis ? 1.2 : 0.6}
          />
        );
      })}
      {chart.cusps.map((cusp, index) => {
        const next = chart.cusps[(index + 1) % chart.cusps.length];
        if (next === undefined) return null;
        const position = at(forwardMidpoint(cusp, next), ascendant, 56);
        return (
          <Text
            key={`casa-${index}`}
            x={position.x}
            y={position.y + 3}
            style={{ fontSize: 7, fill: MUTED, fontFamily: "Helvetica" }}
            textAnchor="middle"
          >
            {index + 1}
          </Text>
        );
      })}
      {bodies.map((body) => {
        const position = at(body.longitude, ascendant, body.radius);
        const isMarked = marked.has(body.pointId);
        const isAngle = body.pointId === "ascendant" || body.pointId === "midheaven";
        return (
          <G key={body.pointId}>
            {isMarked ? <Circle cx={position.x} cy={position.y} r="7" fill={GOLD_SOFT} stroke={GOLD} strokeWidth={0.8} /> : null}
            <Text
              x={position.x}
              y={position.y + 3}
              style={{
                fontSize: isAngle ? 7 : 8,
                fill: isMarked ? WINE : INK,
                fontFamily: "Times-Roman",
              }}
              textAnchor="middle"
            >
              {body.glyph}
            </Text>
          </G>
        );
      })}
    </Svg>
  );
}
