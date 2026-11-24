import React from "react";
import { Circle, G, Line, Path, Svg, Text } from "@react-pdf/renderer";
import { pointGlyphParts, signGlyphParts, type GlyphPart } from "@/features/astrology/glyph-paths";
import { chartAngle, chartPoint, forwardMidpoint, signElement, type NatalChartView } from "@/features/astrology/wheel";

const SIZE = 360;
const CENTER = SIZE / 2;
const SCALE = SIZE / 520;
const GOLD = "#C7A96B";
const WINE = "#1E332D";
const INK = "#0B0A09";
const MUTED = "#60605F";
const LINE = "#C2C2C2";
const CANVAS = "#F3F3F3";

const ELEMENT_COLOR = {
  fogo: "#C58E8D",
  terra: "#1E332D",
  ar: "#5679BC",
  agua: "#60605F",
} as const;

function scaled(value: number) {
  return value * SCALE;
}

function at(longitude: number, ascendant: number, radius: number) {
  const point = chartPoint(longitude, ascendant, radius);
  return { x: CENTER + point.x, y: CENTER + point.y };
}

function beside(longitude: number, ascendant: number, amount: number) {
  const angle = chartAngle(longitude, ascendant);
  return { x: -Math.sin(angle) * amount, y: -Math.cos(angle) * amount };
}

function sector(start: number, end: number, inner: number, outer: number, ascendant: number) {
  const outerStart = at(start, ascendant, outer);
  const outerEnd = at(end, ascendant, outer);
  const innerEnd = at(end, ascendant, inner);
  const innerStart = at(start, ascendant, inner);
  return `M ${outerStart.x} ${outerStart.y} A ${outer} ${outer} 0 0 0 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${inner} ${inner} 0 0 1 ${innerStart.x} ${innerStart.y} Z`;
}

function planetRadii(bodies: NatalChartView["bodies"]) {
  const placed: Array<{ longitude: number; radius: number }> = [];
  return bodies.map((body) => {
    let radius = scaled(168);
    while (
      radius > scaled(122) &&
      placed.some((item) => {
        const distance = Math.min(
          Math.abs(item.longitude - body.longitude),
          360 - Math.abs(item.longitude - body.longitude),
        );
        return distance < 8 && Math.abs(item.radius - radius) < scaled(18);
      })
    ) {
      radius -= scaled(18);
    }
    placed.push({ longitude: body.longitude, radius });
    return { ...body, radius };
  });
}

function GlyphMark({
  parts,
  x,
  y,
  size,
  color,
}: {
  parts: GlyphPart[];
  x: number;
  y: number;
  size: number;
  color: string;
}) {
  const s = size / 24;
  return (
    <G transform={`translate(${x - size / 2} ${y - size / 2}) scale(${s})`}>
      {parts.map((part, index) =>
        part.type === "circle" ? (
          <Circle
            key={index}
            cx={part.cx}
            cy={part.cy}
            r={part.r}
            fill={part.fill ? color : "none"}
            stroke={color}
            strokeWidth={2.1}
          />
        ) : (
          <Path
            key={index}
            d={part.d}
            fill={part.fill ? color : "none"}
            stroke={color}
            strokeWidth={2.1}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ),
      )}
    </G>
  );
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
  const planets = planetRadii(chart.bodies.filter((body) => body.pointId !== "ascendant" && body.pointId !== "midheaven"));
  const angles = chart.bodies.filter((body) => body.pointId === "ascendant" || body.pointId === "midheaven");

  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <Circle cx={CENTER} cy={CENTER} r={scaled(248)} fill="#FFFFFF" stroke={LINE} />
      {Array.from({ length: 12 }, (_, index) => {
        const start = index * 30;
        const element = signElement(index);
        return (
          <Path
            key={start}
            d={sector(start, start + 30, scaled(198), scaled(246), ascendant)}
            fill={ELEMENT_COLOR[element]}
            fillOpacity={0.18}
            stroke="#FFFFFF"
          />
        );
      })}
      <Circle cx={CENTER} cy={CENTER} r={scaled(198)} fill="none" stroke={GOLD} />
      <Circle cx={CENTER} cy={CENTER} r={scaled(132)} fill="none" stroke={LINE} />
      <Circle cx={CENTER} cy={CENTER} r={scaled(78)} fill={CANVAS} stroke={LINE} />
      {Array.from({ length: 36 }, (_, index) => {
        const longitude = index * 10;
        const outer = at(longitude, ascendant, scaled(index % 3 === 0 ? 198 : 192));
        const inner = at(longitude, ascendant, scaled(index % 3 === 0 ? 184 : 188));
        return (
          <Line
            key={longitude}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke={MUTED}
            strokeWidth={index % 3 === 0 ? 1.1 : 0.55}
          />
        );
      })}
      {Array.from({ length: 12 }, (_, index) => {
        const position = at(index * 30 + 15, ascendant, scaled(222));
        return (
          <GlyphMark
            key={`sign-${index}`}
            parts={signGlyphParts(index)}
            x={position.x}
            y={position.y}
            size={scaled(18)}
            color={INK}
          />
        );
      })}
      {chart.cusps.map((cusp, index) => {
        const outer = at(cusp, ascendant, scaled(184));
        const inner = at(cusp, ascendant, scaled(78));
        const axis = index === 0 || index === 9;
        return (
          <Line
            key={`${cusp}-${index}`}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke={axis ? WINE : GOLD}
            strokeWidth={axis ? 1.5 : 0.75}
          />
        );
      })}
      {chart.cusps.map((cusp, index) => {
        const next = chart.cusps[(index + 1) % chart.cusps.length];
        if (next === undefined) return null;
        const position = at(forwardMidpoint(cusp, next), ascendant, scaled(104));
        return (
          <Text
            key={`casa-${index}`}
            x={position.x}
            y={position.y + 3}
            style={{ fontSize: scaled(12), fill: MUTED, fontFamily: "Helvetica" }}
            textAnchor="middle"
          >
            {index + 1}
          </Text>
        );
      })}
      {planets.map((body) => {
        const position = at(body.longitude, ascendant, body.radius);
        const retrogradeMark = beside(body.longitude, ascendant, scaled(11));
        const isMarked = marked.has(body.pointId);
        const color = isMarked ? WINE : INK;
        return (
          <G key={body.pointId}>
            {isMarked ? (
              <Circle cx={position.x} cy={position.y} r={scaled(15)} fill="none" stroke={GOLD} strokeWidth={1.6} />
            ) : null}
            <GlyphMark parts={pointGlyphParts(body.pointId)} x={position.x} y={position.y} size={scaled(16)} color={color} />
            {body.retrograde ? (
              <Text
                x={position.x + retrogradeMark.x}
                y={position.y + retrogradeMark.y + 2}
                style={{ fontSize: scaled(8), fill: WINE, fontFamily: "Helvetica-Bold" }}
                textAnchor="middle"
              >
                R
              </Text>
            ) : null}
          </G>
        );
      })}
      {angles.map((body) => {
        const position = at(body.longitude, ascendant, scaled(208));
        const offset = beside(body.longitude, ascendant, scaled(14));
        const x = position.x + offset.x;
        const y = position.y + offset.y;
        const isMarked = marked.has(body.pointId);
        return (
          <G key={body.pointId}>
            {isMarked ? <Circle cx={x} cy={y} r={scaled(15)} fill="none" stroke={GOLD} strokeWidth={1.6} /> : null}
            <Text
              x={x}
              y={y + 3}
              style={{ fontSize: scaled(11), fill: WINE, fontFamily: "Helvetica-Bold" }}
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
