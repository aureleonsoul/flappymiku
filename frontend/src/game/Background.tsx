/**
 * Stage-driven background. Each stage renders a different SVG scene. When the
 * stage changes the engine starts a 1.5 s crossfade by ramping `fade` from 0
 * to 1; we render both the previous and current scene during that window.
 *
 * Performance notes:
 *  - Scene geometry (clouds, stars, rooftops, etc.) is generated once via
 *    `useMemo` keyed on stage + width + height, so the SVG nodes are stable.
 *  - Time-driven animations (rain, twinkle, neon pulse, nebula sweep) use
 *    `time` from the world state — a simple scalar — to avoid re-creating
 *    elements every frame.
 */
import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Line,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

interface BgProps {
  stage: number;
  prevStage: number;
  fade: number;   // 0..1 — opacity for current stage
  width: number;
  height: number;
  time: number;   // cumulative game seconds
}

export const Background: React.FC<BgProps> = React.memo(function Background({
  stage,
  prevStage,
  fade,
  width,
  height,
  time,
}) {
  return (
    <View style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      {/* Previous scene fades out */}
      {prevStage !== stage && fade < 1 ? (
        <View style={[StyleSheet.absoluteFill, { opacity: 1 - fade }]}>
          <Scene stage={prevStage} width={width} height={height} time={time} />
        </View>
      ) : null}
      {/* Current scene fades in */}
      <View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        <Scene stage={stage} width={width} height={height} time={time} />
      </View>
    </View>
  );
});

const Scene: React.FC<{ stage: number; width: number; height: number; time: number }> = ({
  stage,
  width,
  height,
  time,
}) => {
  switch (stage) {
    case 1:
      return <FestivalScene width={width} height={height} time={time} />;
    case 2:
      return <SunsetScene width={width} height={height} time={time} />;
    case 3:
      return <ConcertHallScene width={width} height={height} time={time} />;
    case 4:
      return <CyberScene width={width} height={height} time={time} />;
    default:
      return <SpaceScene width={width} height={height} time={time} />;
  }
};

// ============================ STAGE 1 — Festival ============================

const FestivalScene: React.FC<{ width: number; height: number; time: number }> = ({
  width,
  height,
  time,
}) => {
  const clouds = useMemo(
    () =>
      new Array(4).fill(0).map((_, i) => ({
        x: ((i * 0.27 + 0.07) * width),
        y: 40 + i * 38,
        scale: 1 + (i % 2) * 0.3,
      })),
    [width]
  );
  const hillH = 110;
  const hillY = height - hillH;
  const drift = (time * 14) % width;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="festSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#87CEEB" />
          <Stop offset="1" stopColor="#cdefff" />
        </LinearGradient>
        <RadialGradient id="sun" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFE259" />
          <Stop offset="1" stopColor="#FFA751" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#festSky)" />
      {/* Sun */}
      <Circle cx={width - 56} cy={64} r={28} fill="#FFE259" />
      <Circle cx={width - 56} cy={64} r={56} fill="url(#sun)" />
      {/* Clouds (parallax) */}
      {clouds.map((c, i) => {
        const x = (c.x - drift + width) % (width + 80) - 40;
        return <Cloud key={i} x={x} y={c.y} s={c.scale} />;
      })}
      {/* Rolling hills */}
      <Path
        d={`M0 ${hillY} Q ${width * 0.25} ${hillY - 60} ${width * 0.5} ${hillY} T ${width} ${hillY} L ${width} ${height} L 0 ${height} Z`}
        fill="#7ed957"
      />
      <Path
        d={`M0 ${hillY + 30} Q ${width * 0.3} ${hillY - 20} ${width * 0.6} ${hillY + 20} T ${width} ${hillY + 20} L ${width} ${height} L 0 ${height} Z`}
        fill="#5fb43d"
        opacity={0.85}
      />
    </Svg>
  );
};

const Cloud: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <G opacity={0.92}>
    <Circle cx={x} cy={y} r={14 * s} fill="#ffffff" />
    <Circle cx={x + 14 * s} cy={y - 6 * s} r={16 * s} fill="#ffffff" />
    <Circle cx={x + 30 * s} cy={y} r={14 * s} fill="#ffffff" />
    <Circle cx={x + 18 * s} cy={y + 6 * s} r={12 * s} fill="#ffffff" />
  </G>
);

// ============================ STAGE 2 — Sunset ============================

const SunsetScene: React.FC<{ width: number; height: number; time: number }> = ({
  width,
  height,
  time,
}) => {
  const rooftops = useMemo(() => {
    const items: { x: number; w: number; h: number }[] = [];
    let x = 0;
    while (x < width) {
      const w = 30 + Math.random() * 60;
      const h = 60 + Math.random() * 90;
      items.push({ x, w, h });
      x += w + 2;
    }
    return items;
  }, [width]);
  const drift = (time * 10) % width;
  const groundY = height - 90;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="sunsetSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FF7043" />
          <Stop offset="0.55" stopColor="#F48FB1" />
          <Stop offset="1" stopColor="#7c2c8a" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#sunsetSky)" />
      {/* Setting sun */}
      <Circle cx={width / 2} cy={groundY - 40} r={48} fill="#FFD23F" opacity={0.85} />
      {/* Drifting clouds */}
      {[0, 1, 2].map((i) => {
        const x = ((i * 0.35 + 0.05) * width - drift + width) % (width + 100) - 50;
        return <Cloud key={i} x={x} y={70 + i * 36} s={1.1} />;
      })}
      {/* City silhouette */}
      {rooftops.map((b, i) => (
        <Rect key={i} x={b.x} y={groundY - b.h} width={b.w} height={b.h} fill="#2a0f3d" />
      ))}
      {/* Tiny lit windows */}
      {rooftops.map((b, i) =>
        Array.from({ length: 4 }).map((_, k) => (
          <Rect
            key={`${i}-${k}`}
            x={b.x + 4 + (k % 2) * (b.w - 12)}
            y={groundY - b.h + 12 + Math.floor(k / 2) * 16}
            width={4}
            height={4}
            fill="#FFE259"
            opacity={0.65 + 0.35 * Math.sin(time * 2 + i + k)}
          />
        ))
      )}
    </Svg>
  );
};

// ============================ STAGE 3 — Concert Hall ============================

const ConcertHallScene: React.FC<{ width: number; height: number; time: number }> = ({
  width,
  height,
  time,
}) => {
  const beams = useMemo(
    () => [
      { hue: "#39C5BB", off: 0 },
      { hue: "#ff6f9c", off: 1.1 },
      { hue: "#FFD23F", off: 2.2 },
      { hue: "#8b5cf6", off: 3.3 },
      { hue: "#22d3ee", off: 4.4 },
    ],
    []
  );
  const heads = useMemo(
    () =>
      new Array(28).fill(0).map((_, i) => ({
        x: (i / 28) * width + Math.random() * (width / 56),
        s: 6 + Math.random() * 4,
      })),
    [width]
  );
  const groundY = height - 90;
  const origin = { x: width / 2, y: height - 70 };
  return (
    <Svg width={width} height={height}>
      <Rect x={0} y={0} width={width} height={height} fill="#0D1B2A" />
      {/* Radiating spotlight beams from the bottom center */}
      {beams.map((b, i) => {
        const sway = Math.sin(time * 0.8 + b.off) * 80;
        const topX = origin.x + sway + (i - beams.length / 2) * (width / beams.length);
        return (
          <G key={i} opacity={0.55}>
            <Defs>
              <LinearGradient id={`beam-${i}`} x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0" stopColor={b.hue} stopOpacity="0.55" />
                <Stop offset="1" stopColor={b.hue} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Polygon
              points={`${origin.x - 6},${origin.y} ${origin.x + 6},${origin.y} ${topX + 60},0 ${topX - 60},0`}
              fill={`url(#beam-${i})`}
            />
          </G>
        );
      })}
      {/* Crowd silhouettes */}
      {heads.map((h, i) => (
        <Circle key={i} cx={h.x} cy={groundY - 4} r={h.s} fill="#000" opacity={0.85} />
      ))}
      <Rect x={0} y={groundY} width={width} height={90} fill="#000" opacity={0.85} />
    </Svg>
  );
};

// ============================ STAGE 4 — Cyber Night ============================

const CyberScene: React.FC<{ width: number; height: number; time: number }> = ({
  width,
  height,
  time,
}) => {
  const buildings = useMemo(() => {
    const items: { x: number; w: number; h: number; color: string }[] = [];
    let x = 0;
    const palette = ["#ff2bd6", "#22d3ee", "#a855f7", "#ec4899"];
    while (x < width) {
      const w = 30 + Math.random() * 70;
      const h = 120 + Math.random() * 200;
      items.push({ x, w, h, color: palette[items.length % palette.length] });
      x += w + 4;
    }
    return items;
  }, [width]);
  const rain = useMemo(
    () =>
      new Array(60).fill(0).map(() => ({
        x: Math.random() * (width + 100),
        y: Math.random() * 600,
        len: 10 + Math.random() * 14,
        speed: 380 + Math.random() * 180,
      })),
    [width]
  );
  const groundY = height - 90;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="cyberSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#120024" />
          <Stop offset="1" stopColor="#2a004a" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#cyberSky)" />
      {/* Laser streaks */}
      {[0, 1, 2].map((i) => {
        const y = 70 + i * 50 + Math.sin(time * 1.6 + i) * 12;
        return (
          <Line
            key={i}
            x1={-20}
            y1={y}
            x2={width + 20}
            y2={y + (i % 2 === 0 ? -10 : 12)}
            stroke={i % 2 === 0 ? "#ff2bd6" : "#22d3ee"}
            strokeWidth={1.5}
            opacity={0.55 + 0.4 * Math.sin(time * 3 + i)}
          />
        );
      })}
      {/* Neon building outlines */}
      {buildings.map((b, i) => (
        <G key={i}>
          <Rect x={b.x} y={groundY - b.h} width={b.w} height={b.h} fill="#0a0014" />
          <Rect
            x={b.x + 0.5}
            y={groundY - b.h + 0.5}
            width={b.w - 1}
            height={b.h - 1}
            fill="none"
            stroke={b.color}
            strokeWidth={1.5}
            opacity={0.85}
          />
          {/* lit windows */}
          {Array.from({ length: Math.floor(b.h / 18) }).map((_, k) => (
            <Rect
              key={k}
              x={b.x + 4 + ((k % 2) * (b.w - 12))}
              y={groundY - b.h + 10 + k * 18}
              width={4}
              height={4}
              fill={b.color}
              opacity={0.7 + 0.3 * Math.sin(time * 4 + i + k)}
            />
          ))}
        </G>
      ))}
      {/* Rain */}
      {rain.map((r, i) => {
        const y = (r.y + time * r.speed) % (height + 100) - 50;
        return (
          <Line
            key={i}
            x1={r.x - 4}
            y1={y}
            x2={r.x}
            y2={y + r.len}
            stroke="#9ee7ff"
            strokeWidth={1}
            opacity={0.45}
          />
        );
      })}
    </Svg>
  );
};

// ============================ STAGE 5+ — Outer Space ============================

const SpaceScene: React.FC<{ width: number; height: number; time: number }> = ({
  width,
  height,
  time,
}) => {
  const stars = useMemo(
    () =>
      new Array(70).fill(0).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.6 + Math.random() * 1.6,
        ph: Math.random() * Math.PI * 2,
        sp: 0.8 + Math.random() * 1.4,
      })),
    [width, height]
  );
  const hexes = useMemo(() => {
    const items: { cx: number; cy: number }[] = [];
    const step = 60;
    for (let y = 60; y < height - 90; y += step) {
      for (let x = (y / step) % 2 === 0 ? step / 2 : 0; x < width; x += step) {
        items.push({ cx: x, cy: y });
      }
    }
    return items;
  }, [width, height]);
  return (
    <Svg width={width} height={height}>
      <Rect x={0} y={0} width={width} height={height} fill="#000000" />
      {/* Nebula washes */}
      <Defs>
        <RadialGradient id="neb1" cx="30%" cy="35%" r="55%">
          <Stop offset="0" stopColor="#8b5cf6" stopOpacity="0.55" />
          <Stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="neb2" cx="70%" cy="55%" r="50%">
          <Stop offset="0" stopColor="#22d3ee" stopOpacity="0.45" />
          <Stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="neb3" cx="50%" cy="85%" r="50%">
          <Stop offset="0" stopColor="#ff6f9c" stopOpacity="0.45" />
          <Stop offset="1" stopColor="#ff6f9c" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#neb1)" />
      <Rect x={0} y={0} width={width} height={height} fill="url(#neb2)" />
      <Rect x={0} y={0} width={width} height={height} fill="url(#neb3)" />
      {/* Hex grid (faint, far away) */}
      {hexes.map((h, i) => (
        <Polygon
          key={i}
          points={hexPoints(h.cx, h.cy, 14)}
          fill="none"
          stroke="#39C5BB"
          strokeWidth={0.4}
          opacity={0.18 + 0.05 * Math.sin(time * 0.5 + i * 0.2)}
        />
      ))}
      {/* Twinkling stars */}
      {stars.map((s, i) => (
        <Circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill="#ffffff"
          opacity={0.5 + 0.5 * Math.sin(time * s.sp + s.ph)}
        />
      ))}
    </Svg>
  );
};

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

// keep imports tree-shake-stable
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _u = Ellipse;
