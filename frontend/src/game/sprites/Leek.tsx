/**
 * Leek / negi pipe obstacle. Visual style is driven by `stage`:
 *   1 → classic green
 *   2 → warm orange-yellow with glow
 *   3 → electric-blue with pulsing neon
 *   4 → hot pink/magenta with sharper caps + lightning bolt decoration
 *   5+ → holographic rainbow that slowly cycles hue and shimmers
 */
import React from "react";
import Svg, { Defs, G, LinearGradient, Line, Path, Rect, Stop } from "react-native-svg";

interface Props {
  width: number;
  height: number;
  variant: "top" | "bottom";
  stage: number;
  /** cumulative game seconds, used for pulsing/shimmer */
  time: number;
}

interface Palette {
  leaf1: string;
  leaf2: string;
  bulb1: string;
  bulb2: string;
  outline: string;
  glow?: string;     // outer glow colour (stages 2+)
  glowAlpha: number;
  sharpCaps: boolean;
  lightning: boolean;
}

function paletteFor(stage: number, time: number): Palette {
  const s = Math.min(stage, 5);
  if (s <= 1) {
    return {
      leaf1: "#3aa84a",
      leaf2: "#7ed957",
      bulb1: "#eef9d8",
      bulb2: "#ffffff",
      outline: "rgba(0,0,0,0.35)",
      glowAlpha: 0,
      sharpCaps: false,
      lightning: false,
    };
  }
  if (s === 2) {
    return {
      leaf1: "#d97706",
      leaf2: "#fbbf24",
      bulb1: "#fff7d6",
      bulb2: "#ffffff",
      outline: "rgba(120,40,0,0.55)",
      glow: "#FFD23F",
      glowAlpha: 0.55,
      sharpCaps: false,
      lightning: false,
    };
  }
  if (s === 3) {
    const pulse = 0.55 + 0.35 * Math.sin(time * 4);
    return {
      leaf1: "#1d4ed8",
      leaf2: "#60a5fa",
      bulb1: "#dbeafe",
      bulb2: "#ffffff",
      outline: "rgba(20,80,180,0.7)",
      glow: "#22d3ee",
      glowAlpha: pulse,
      sharpCaps: false,
      lightning: false,
    };
  }
  if (s === 4) {
    return {
      leaf1: "#9d174d",
      leaf2: "#f472b6",
      bulb1: "#fce7f3",
      bulb2: "#ffffff",
      outline: "rgba(180,30,90,0.85)",
      glow: "#ff2bd6",
      glowAlpha: 0.65,
      sharpCaps: true,
      lightning: true,
    };
  }
  // 5+ holographic rainbow — colours cycle via time
  const t = (time * 60) % 360;
  const h1 = `hsl(${(t) % 360}, 90%, 55%)`;
  const h2 = `hsl(${(t + 60) % 360}, 95%, 65%)`;
  const shimmer = 0.55 + 0.35 * Math.sin(time * 6);
  return {
    leaf1: h1,
    leaf2: h2,
    bulb1: "#ffffff",
    bulb2: `hsl(${(t + 120) % 360}, 95%, 90%)`,
    outline: "rgba(255,255,255,0.45)",
    glow: h2,
    glowAlpha: shimmer,
    sharpCaps: true,
    lightning: false,
  };
}

export const Leek: React.FC<Props> = React.memo(function Leek({
  width,
  height,
  variant,
  stage,
  time,
}) {
  const p = paletteFor(stage, time);
  const bulbLen = Math.min(80, height * 0.38);
  const leafLen = height - bulbLen;
  const isTop = variant === "top";
  const leafY = isTop ? 0 : bulbLen;
  const bulbY = isTop ? leafLen : 0;
  const leafGradId = `lg-${stage}-${variant}`;
  const bulbGradId = `bg-${stage}-${variant}`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={leafGradId} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={p.leaf1} />
          <Stop offset="0.5" stopColor={p.leaf2} />
          <Stop offset="1" stopColor={p.leaf1} />
        </LinearGradient>
        <LinearGradient id={bulbGradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={p.bulb1} />
          <Stop offset="0.5" stopColor={p.bulb2} />
          <Stop offset="1" stopColor={p.bulb1} />
        </LinearGradient>
      </Defs>

      {/* Outer glow (stages 2+) — drawn first so it sits behind everything else */}
      {p.glow ? (
        <G opacity={p.glowAlpha}>
          <Rect x={-3} y={leafY - 2} width={width + 6} height={leafLen + 4} fill={p.glow} opacity={0.35} />
          <Rect x={-3} y={bulbY - 2} width={width + 6} height={bulbLen + 4} fill={p.glow} opacity={0.25} />
        </G>
      ) : null}

      {/* Leaves */}
      <Rect
        x={4}
        y={leafY}
        width={width - 8}
        height={leafLen}
        fill={`url(#${leafGradId})`}
        stroke={p.outline}
        strokeWidth={1}
      />
      {/* leaf stripes */}
      {Array.from({ length: Math.floor(leafLen / 12) }).map((_, i) => (
        <Line
          key={i}
          x1={8}
          y1={leafY + 10 + i * 12}
          x2={width - 8}
          y2={leafY + 10 + i * 12}
          stroke="rgba(0,0,0,0.18)"
          strokeWidth={1}
        />
      ))}

      {/* Bulb */}
      {p.sharpCaps ? (
        <Path
          d={
            isTop
              ? `M0 ${leafLen} L${width} ${leafLen} L${width} ${height - 12} L${width / 2} ${height} L0 ${height - 12} Z`
              : `M0 ${12} L${width / 2} 0 L${width} 12 L${width} ${bulbLen} L0 ${bulbLen} Z`
          }
          fill={`url(#${bulbGradId})`}
          stroke={p.outline}
          strokeWidth={1}
        />
      ) : (
        <>
          <Rect
            x={0}
            y={bulbY}
            width={width}
            height={bulbLen}
            fill={`url(#${bulbGradId})`}
            stroke={p.outline}
            strokeWidth={1}
          />
          <Path
            d={
              isTop
                ? `M0 ${height - 10} Q ${width / 2} ${height + 8} ${width} ${height - 10}`
                : `M0 10 Q ${width / 2} -8 ${width} 10`
            }
            fill="#fff8e0"
            stroke={p.outline}
            strokeWidth={1}
          />
        </>
      )}

      {/* Stage 4: tiny lightning bolt on the side */}
      {p.lightning ? (
        <G opacity={0.85}>
          <Path
            d={isTop
              ? `M ${width - 14} ${bulbY + 12} L ${width - 6} ${bulbY + 16} L ${width - 10} ${bulbY + 22} L ${width - 4} ${bulbY + 30} L ${width - 12} ${bulbY + 26} L ${width - 8} ${bulbY + 36}`
              : `M ${width - 14} ${bulbY + bulbLen - 36} L ${width - 6} ${bulbY + bulbLen - 32} L ${width - 10} ${bulbY + bulbLen - 26} L ${width - 4} ${bulbY + bulbLen - 18} L ${width - 12} ${bulbY + bulbLen - 22} L ${width - 8} ${bulbY + bulbLen - 12}`}
            stroke="#FFE259"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      ) : null}
    </Svg>
  );
});
