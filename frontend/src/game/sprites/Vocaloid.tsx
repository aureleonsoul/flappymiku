/**
 * SVG-based Vocaloid chibi sprite.
 *
 * The same body silhouette is reused for every character — only colors and a
 * few hair-style variations change. This keeps the renderer cheap (we mount
 * the same component every frame) and means every Vocaloid stays
 * stylistically consistent.
 */
import React from "react";
import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
  Rect,
} from "react-native-svg";
import type { CharacterId } from "../../storage/profile";

interface Props {
  id: CharacterId;
  size?: number;
  /** Wing flap progress 0..1 (used for arm/wing animation) */
  flap?: number;
  /** Body rotation in radians (tilt based on vertical velocity) */
  angle?: number;
  /** Render as a locked silhouette */
  silhouette?: boolean;
}

interface Palette {
  hair: string;
  hairDark: string;
  outfit: string;
  outfitTrim: string;
  tie: string;
  hairStyle: "twin-tails" | "bob" | "ponytail" | "long" | "kaito" | "meiko";
}

const PALETTES: Record<CharacterId, Palette> = {
  miku: {
    hair: "#39C5BB",
    hairDark: "#1f7e78",
    outfit: "#ffffff",
    outfitTrim: "#39C5BB",
    tie: "#ff4d6d",
    hairStyle: "twin-tails",
  },
  rin: {
    hair: "#FCE205",
    hairDark: "#a88f00",
    outfit: "#ffffff",
    outfitTrim: "#FCE205",
    tie: "#ff8a3d",
    hairStyle: "bob",
  },
  len: {
    hair: "#FFD23F",
    hairDark: "#a8821a",
    outfit: "#ffffff",
    outfitTrim: "#FFD23F",
    tie: "#ff8a3d",
    hairStyle: "ponytail",
  },
  luka: {
    hair: "#E94196",
    hairDark: "#8c1f5c",
    outfit: "#ffffff",
    outfitTrim: "#E94196",
    tie: "#FFD23F",
    hairStyle: "long",
  },
  kaito: {
    hair: "#4178BC",
    hairDark: "#1f3a6e",
    outfit: "#7AB0EC",
    outfitTrim: "#1f3a6e",
    tie: "#ffffff",
    hairStyle: "kaito",
  },
  meiko: {
    hair: "#7a3a1e",
    hairDark: "#3e1a09",
    outfit: "#C0272D",
    outfitTrim: "#6f1115",
    tie: "#ffffff",
    hairStyle: "meiko",
  },
};

const SILHOUETTE: Palette = {
  hair: "#1a1f33",
  hairDark: "#000",
  outfit: "#1a1f33",
  outfitTrim: "#000",
  tie: "#1a1f33",
  hairStyle: "twin-tails",
};

export const Vocaloid: React.FC<Props> = React.memo(function Vocaloid({
  id,
  size = 64,
  flap = 0,
  angle = 0,
  silhouette = false,
}) {
  const p = silhouette ? SILHOUETTE : PALETTES[id];
  const rotationDeg = (angle * 180) / Math.PI;
  // The original drawing used 64x64 logical coordinates.
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G origin="32, 32" rotation={rotationDeg}>
        {/* shadow */}
        <Ellipse cx={32} cy={54} rx={14} ry={3} fill="#000" opacity={0.18} />

        {/* hair style — back (drawn first so face overlaps) */}
        <HairBack style={p.hairStyle} p={p} flap={flap} />

        {/* body / outfit */}
        <Rect
          x={23}
          y={32}
          width={18}
          height={16}
          rx={4}
          fill={p.outfit}
          stroke={silhouette ? p.outfitTrim : "#222"}
          strokeWidth={1.2}
        />
        {/* collar */}
        <Path
          d="M23 32 L41 32 L38 38 L32 35 L26 38 Z"
          fill={p.outfitTrim}
          stroke={silhouette ? p.outfitTrim : "#222"}
          strokeWidth={0.8}
        />
        {/* tie */}
        <Path
          d="M30 36 L34 36 L35 44 L29 44 Z"
          fill={p.tie}
          stroke={silhouette ? p.tie : "#222"}
          strokeWidth={0.6}
        />

        {/* wing/arm — flap animation */}
        <G origin="38, 38" rotation={-flap * 50}>
          <Path
            d={`M38 38 Q ${38 + 14} ${38 - 4 + flap * 2}  ${38 + 16} ${38 + 6 + flap * 2} Q ${38 + 8} ${38 + 8 + flap * 4} 38 ${38 + 6} Z`}
            fill={p.hair}
            stroke={silhouette ? p.hair : p.hairDark}
            strokeWidth={0.8}
          />
        </G>
        {/* back arm */}
        <G origin="26, 38" rotation={flap * 30}>
          <Path
            d="M26 38 Q14 36 12 44 Q20 46 26 44 Z"
            fill={p.hairDark}
            opacity={0.85}
          />
        </G>

        {/* head circle - hair frame */}
        <Circle cx={32} cy={24} r={14} fill={p.hair} stroke={silhouette ? p.hair : p.hairDark} strokeWidth={1} />

        {/* face */}
        <Circle cx={33} cy={26} r={10} fill={silhouette ? p.outfit : "#fde6cf"} />

        {/* hair bangs / front */}
        <HairFront style={p.hairStyle} p={p} silhouette={silhouette} />

        {!silhouette ? (
          <>
            {/* eyes */}
            <Ellipse cx={29} cy={26} rx={2.2} ry={3} fill="#fff" />
            <Ellipse cx={37} cy={26} rx={2.2} ry={3} fill="#fff" />
            <Ellipse cx={29} cy={26.5} rx={1.3} ry={2} fill={p.hairDark} />
            <Ellipse cx={37} cy={26.5} rx={1.3} ry={2} fill={p.hairDark} />
            <Circle cx={29.3} cy={25.7} r={0.6} fill="#fff" />
            <Circle cx={37.3} cy={25.7} r={0.6} fill="#fff" />
            {/* blush */}
            <Circle cx={27} cy={30} r={1.5} fill="#ff7896" opacity={0.55} />
            <Circle cx={39} cy={30} r={1.5} fill="#ff7896" opacity={0.55} />
            {/* mouth */}
            <Path d="M31 30 Q 33 31 35 30" stroke="#8a4a4a" strokeWidth={1} fill="none" strokeLinecap="round" />
          </>
        ) : null}
      </G>
    </Svg>
  );
});

const HairBack: React.FC<{ style: Palette["hairStyle"]; p: Palette; flap: number }> = ({ style, p, flap }) => {
  switch (style) {
    case "twin-tails":
      return (
        <G>
          {/* upper tail */}
          <Path
            d={`M26 22 Q ${10 - flap * 3} ${14} 4 28 Q 18 30 24 30 Z`}
            fill={p.hair}
            stroke={p.hairDark}
            strokeWidth={0.6}
          />
          {/* lower tail */}
          <Path
            d={`M26 30 Q ${8 + flap * 3} ${36} 2 42 Q 18 42 24 36 Z`}
            fill={p.hair}
            stroke={p.hairDark}
            strokeWidth={0.6}
          />
          {/* hair ties */}
          <Rect x={20} y={18} width={5} height={6} fill="#2a2a2a" />
          <Rect x={20} y={28} width={5} height={6} fill="#2a2a2a" />
        </G>
      );
    case "bob":
      // wide bob with a big bow
      return (
        <G>
          <Path d="M16 22 Q 18 14 32 12 Q 46 14 48 22 L 48 36 L 16 36 Z" fill={p.hair} stroke={p.hairDark} strokeWidth={0.6} />
          {/* bow */}
          <Path d="M22 14 L18 10 L24 12 Z" fill={p.tie} />
          <Path d="M22 14 L18 18 L24 16 Z" fill={p.tie} />
          <Circle cx={23} cy={14} r={1.5} fill={p.hairDark} />
        </G>
      );
    case "ponytail":
      return (
        <G>
          {/* small ponytail behind head */}
          <Path d={`M44 22 Q ${52 + flap * 2} 24 50 38 Q 44 36 40 32 Z`} fill={p.hair} stroke={p.hairDark} strokeWidth={0.6} />
          <Rect x={42} y={20} width={4} height={5} fill="#2a2a2a" />
        </G>
      );
    case "long":
      return (
        <G>
          {/* long pink hair flowing back */}
          <Path d={`M14 22 Q ${6 - flap * 2} 36 12 54 Q 22 50 24 36 Z`} fill={p.hair} stroke={p.hairDark} strokeWidth={0.6} />
          <Path d={`M50 22 Q ${58 + flap * 2} 36 52 54 Q 42 50 40 36 Z`} fill={p.hair} stroke={p.hairDark} strokeWidth={0.6} />
        </G>
      );
    case "kaito":
      return (
        <G>
          {/* short shaggy back */}
          <Path d="M18 22 Q 20 14 32 12 Q 44 14 46 22 L 46 28 L 18 28 Z" fill={p.hair} stroke={p.hairDark} strokeWidth={0.6} />
          {/* scarf */}
          <Rect x={20} y={36} width={24} height={4} fill="#ffffff" />
          <Rect x={20} y={40} width={4} height={8} fill="#ffffff" />
        </G>
      );
    case "meiko":
      return (
        <G>
          {/* short brown hair */}
          <Path d="M18 22 Q 22 12 32 12 Q 42 12 46 22 L 44 28 L 20 28 Z" fill={p.hair} stroke={p.hairDark} strokeWidth={0.6} />
        </G>
      );
    default:
      return null;
  }
};

const HairFront: React.FC<{ style: Palette["hairStyle"]; p: Palette; silhouette: boolean }> = ({
  style,
  p,
  silhouette,
}) => {
  if (silhouette) {
    return (
      <Path
        d="M22 22 Q 26 10 32 14 Q 38 10 42 22 Q 38 22 36 18 Q 32 22 28 18 Q 24 22 22 22 Z"
        fill={p.hair}
      />
    );
  }
  switch (style) {
    case "len":
    case "ponytail":
      return (
        <G>
          <Path
            d="M22 22 Q 24 12 32 14 Q 40 12 42 22 Q 38 22 36 18 Q 32 22 28 18 Q 24 22 22 22 Z"
            fill={p.hair}
            stroke={p.hairDark}
            strokeWidth={0.6}
          />
        </G>
      );
    case "kaito":
      return (
        <Path
          d="M22 24 Q 24 16 32 16 Q 40 16 42 24 Q 38 22 34 24 Q 30 22 26 24 Q 24 24 22 24 Z"
          fill={p.hair}
          stroke={p.hairDark}
          strokeWidth={0.6}
        />
      );
    case "meiko":
      return (
        <Path
          d="M22 22 Q 26 14 32 16 Q 38 14 42 22 Q 38 22 35 20 Q 32 22 29 20 Q 26 22 22 22 Z"
          fill={p.hair}
          stroke={p.hairDark}
          strokeWidth={0.6}
        />
      );
    default:
      return (
        <Path
          d="M22 22 Q 24 12 32 14 Q 40 12 42 22 Q 38 22 36 18 Q 32 22 28 18 Q 24 22 22 22 Z"
          fill={p.hair}
          stroke={p.hairDark}
          strokeWidth={0.6}
        />
      );
  }
};
