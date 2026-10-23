"use client";

import { useId, useState, type ReactNode } from "react";
import { pointHint } from "@/features/astrology/point-hints";
import { chartAngle, chartPoint, forwardMidpoint, SIGN_GLYPHS, signElement, type NatalChartBody, type NatalChartView } from "@/features/astrology/wheel";

const ELEMENT_COLOR = {
  fogo: "#b96a42",
  terra: "#687b59",
  ar: "#7283b1",
  agua: "#4e8390",
} as const;

const SIZE = 520;
const CENTER = SIZE / 2;

function textGlyph(symbol: string) {
  return `${symbol}\uFE0E`;
}

function beside(longitude: number, ascendant: number, amount: number) {
  const angle = chartAngle(longitude, ascendant);
  return { x: -Math.sin(angle) * amount, y: -Math.cos(angle) * amount };
}

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

type ActiveTip = {
  pointId: string;
  x: number;
  y: number;
};

function tooltipStyle(x: number, y: number) {
  const align = x < 120 ? "0" : x > SIZE - 120 ? "-100%" : "-50%";
  const vertical = y < 96 ? "16px" : "calc(-100% - 12px)";
  return {
    left: `${(x / SIZE) * 100}%`,
    top: `${(y / SIZE) * 100}%`,
    transform: `translate(${align}, ${vertical})`,
  };
}

function positionLine(body: NatalChartBody) {
  const house = body.houseNumber === null ? "" : ` · casa ${body.houseNumber}`;
  const motion = body.retrograde ? " · retrógrado" : "";
  return `${body.signName}${house}${motion}`;
}

function planetRadii(bodies: NatalChartView["bodies"]) {
  const placed: Array<{ longitude: number; radius: number }> = [];
  return bodies.map((body) => {
    if (body.pointId === "ascendant" || body.pointId === "midheaven") return { ...body, radius: 214 };
    let radius = 168;
    while (
      radius > 122 &&
      placed.some((item) => {
        const distance = Math.min(
          Math.abs(item.longitude - body.longitude),
          360 - Math.abs(item.longitude - body.longitude),
        );
        return distance < 8 && Math.abs(item.radius - radius) < 18;
      })
    ) {
      radius -= 18;
    }
    placed.push({ longitude: body.longitude, radius });
    return { ...body, radius };
  });
}

function GlyphTip({
  body,
  x,
  y,
  active,
  onShow,
  onHide,
  children,
}: {
  body: NatalChartBody;
  x: number;
  y: number;
  active: boolean;
  onShow: () => void;
  onHide: () => void;
  children: ReactNode;
}) {
  const hint = pointHint(body.pointId);
  return (
    <g
      role="img"
      tabIndex={0}
      aria-label={`${body.label}. ${hint} ${positionLine(body)}.`}
      className="cursor-pointer outline-none"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") onShow();
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") onHide();
      }}
      onFocus={onShow}
      onBlur={onHide}
      onPointerUp={(event) => {
        if (event.pointerType !== "mouse") onShow();
      }}
    >
      <circle cx={x} cy={y} r="16" fill="transparent" stroke={active ? "#482931" : "none"} strokeWidth="1" />
      {children}
    </g>
  );
}

export function NatalWheel({
  chart,
  highlightPointId,
  heading = "Mapa astral",
}: {
  chart: NatalChartView;
  highlightPointId: string | null;
  heading?: string;
}) {
  const headingId = useId();
  const descId = useId();
  const ascendant = chart.ascendantLongitude;
  const planets = planetRadii(chart.bodies.filter((body) => body.pointId !== "ascendant" && body.pointId !== "midheaven"));
  const angles = chart.bodies.filter((body) => body.pointId === "ascendant" || body.pointId === "midheaven");
  const [active, setActive] = useState<ActiveTip | null>(null);
  const activeBody = chart.bodies.find((body) => body.pointId === active?.pointId) ?? null;

  return (
    <section className="grid gap-5" aria-labelledby={headingId}>
      <h2 id={headingId} className="font-display text-3xl">
        {heading}
      </h2>
      <div className="relative">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="group" aria-labelledby={`${headingId} ${descId}`} className="h-auto w-full">
        <desc id={descId}>
          Roda com os doze signos, as casas e as posições calculadas. A lista seguinte traz signo, grau e casa de cada ponto.
        </desc>
        <circle cx={CENTER} cy={CENTER} r="248" fill="#fff" stroke="#e7e2da" />
        {Array.from({ length: 12 }, (_, index) => {
          const start = index * 30;
          const element = signElement(index);
          return (
            <path
              key={start}
              d={sector(start, start + 30, 198, 246, ascendant)}
              fill={ELEMENT_COLOR[element]}
              opacity="0.18"
              stroke="#ffffff"
            />
          );
        })}
        <circle cx={CENTER} cy={CENTER} r="198" fill="none" stroke="#b99b62" />
        <circle cx={CENTER} cy={CENTER} r="132" fill="none" stroke="#e7e2da" />
        <circle cx={CENTER} cy={CENTER} r="78" fill="#f8f6f1" stroke="#e7e2da" />
        {Array.from({ length: 36 }, (_, index) => {
          const longitude = index * 10;
          const outer = at(longitude, ascendant, index % 3 === 0 ? 198 : 192);
          const inner = at(longitude, ascendant, index % 3 === 0 ? 184 : 188);
          return (
            <line
              key={longitude}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="#5e5664"
              strokeWidth={index % 3 === 0 ? 1.2 : 0.6}
            />
          );
        })}
        {SIGN_GLYPHS.map((glyph, index) => {
          const position = at(index * 30 + 15, ascendant, 222);
          return (
            <text key={glyph} x={position.x} y={position.y} textAnchor="middle" dominantBaseline="middle" fontSize="18" fill="#241d22">
              {textGlyph(glyph)}
            </text>
          );
        })}
        {chart.cusps.map((cusp, index) => {
          const outer = at(cusp, ascendant, 184);
          const inner = at(cusp, ascendant, 78);
          const axis = index === 0 || index === 9;
          return (
            <line
              key={`${cusp}-${index}`}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={axis ? "#482931" : "#b99b62"}
              strokeWidth={axis ? 1.6 : 0.8}
            />
          );
        })}
        {chart.cusps.map((cusp, index) => {
          const next = chart.cusps[(index + 1) % chart.cusps.length];
          if (next === undefined) return null;
          const position = at(forwardMidpoint(cusp, next), ascendant, 104);
          return (
            <text key={`casa-${index}`} x={position.x} y={position.y} textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="#5e5664">
              {index + 1}
            </text>
          );
        })}
        {planets.map((body) => {
          const position = at(body.longitude, ascendant, body.radius);
          const retrogradeMark = beside(body.longitude, ascendant, 11);
          const highlighted = body.pointId === highlightPointId;
          return (
            <GlyphTip
              key={body.pointId}
              body={body}
              x={position.x}
              y={position.y}
              active={body.pointId === active?.pointId}
              onShow={() => setActive({ pointId: body.pointId, x: position.x, y: position.y })}
              onHide={() => setActive((current) => (current?.pointId === body.pointId ? null : current))}
            >
              {highlighted ? <circle cx={position.x} cy={position.y} r="13" fill="#e8dcc6" /> : null}
              <text x={position.x} y={position.y} textAnchor="middle" dominantBaseline="middle" fontSize="16" fill={highlighted ? "#482931" : "#241d22"} pointerEvents="none">
                {textGlyph(body.glyph)}
              </text>
              {body.retrograde ? (
                <text
                  x={position.x + retrogradeMark.x}
                  y={position.y + retrogradeMark.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="8"
                  fill="#482931"
                  pointerEvents="none"
                >
                  R
                </text>
              ) : null}
            </GlyphTip>
          );
        })}
        {angles.map((body) => {
          const position = at(body.longitude, ascendant, 208);
          const offset = beside(body.longitude, ascendant, 14);
          const x = position.x + offset.x;
          const y = position.y + offset.y;
          return (
            <GlyphTip
              key={body.pointId}
              body={body}
              x={x}
              y={y}
              active={body.pointId === active?.pointId}
              onShow={() => setActive({ pointId: body.pointId, x, y })}
              onHide={() => setActive((current) => (current?.pointId === body.pointId ? null : current))}
            >
              <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="700" fill="#482931" pointerEvents="none">
                {body.glyph}
              </text>
            </GlyphTip>
          );
        })}
      </svg>
      {active && activeBody ? (
        <div role="tooltip" className="pointer-events-none absolute z-10 w-max max-w-56 rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-sm" style={tooltipStyle(active.x, active.y)}>
          <p className="font-medium">{activeBody.label}</p>
          <p className="mt-1 text-muted">{pointHint(activeBody.pointId)}</p>
          <p className="mt-1">{positionLine(activeBody)}</p>
        </div>
      ) : null}
      </div>
      <ul className="grid gap-2 sm:hidden">
        {chart.bodies.map((body) => (
          <li key={body.pointId} className={`rounded-xl px-3 py-2 text-sm ${body.pointId === highlightPointId ? "bg-gold-soft" : ""}`}>
            <p className="font-medium">
              {textGlyph(body.glyph)} {body.label}
            </p>
            <p>
              {body.signName} {body.degreeLabel} · casa {body.houseNumber ?? "—"} · {body.retrograde === null ? "—" : body.retrograde ? "retrógrado" : "direto"}
            </p>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Posições do mapa: ponto, signo, grau, casa e movimento</caption>
          <thead>
            <tr className="border-b border-border text-muted">
              <th scope="col" className="py-2 pr-3 font-medium">Ponto</th>
              <th scope="col" className="py-2 pr-3 font-medium">Signo</th>
              <th scope="col" className="py-2 pr-3 font-medium">Grau</th>
              <th scope="col" className="py-2 pr-3 font-medium">Casa</th>
              <th scope="col" className="py-2 font-medium">Movimento</th>
            </tr>
          </thead>
          <tbody>
            {chart.bodies.map((body) => (
              <tr key={body.pointId} className={body.pointId === highlightPointId ? "bg-gold-soft" : undefined}>
                <th scope="row" className="py-2 pr-3 font-medium">
                  {textGlyph(body.glyph)} {body.label}
                </th>
                <td className="py-2 pr-3">{body.signName}</td>
                <td className="py-2 pr-3">{body.degreeLabel}</td>
                <td className="py-2 pr-3">{body.houseNumber ?? "—"}</td>
                <td className="py-2">{body.retrograde === null ? "—" : body.retrograde ? "Retrógrado" : "Direto"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
