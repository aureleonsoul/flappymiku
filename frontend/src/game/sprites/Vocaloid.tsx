/**
 * SVG-based Vocaloid chibi sprite.
 *
 * Each character has its own signature silhouette + accent piece so they're
 * recognisable at a glance: Miku's long teal twin-tails, Rin's white bow + bob,
 * Len's small ponytail, Luka's long pink hair, KAITO's blue scarf, MEIKO's red
 * headband.
 */
import React from "react";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import type { CharacterId } from "../../storage/profile";

interface Props {
  id: CharacterId;
  size?: number;
  flap?: number;
  angle?: number;
  silhouette?: boolean;
}

interface Palette {
  hair: string;
  hairDark: string;
  outfit: string;
  outfitTrim: string;
  tie: string;
}

const PALETTES: Record<CharacterId, Palette> = {
  miku: { hair: "#39C5BB", hairDark: "#1f7e78", outfit: "#ffffff", outfitTrim: "#39C5BB", tie: "#ff4d6d" },
  rin:  { hair: "#FCE205", hairDark: "#a88f00", outfit: "#ffffff", outfitTrim: "#FFD23F", tie: "#ff8a3d" },
  len:  { hair: "#FFD23F", hairDark: "#a8821a", outfit: "#ffffff", outfitTrim: "#FFD23F", tie: "#ff8a3d" },
  luka: { hair: "#F58FB4", hairDark: "#a64273", outfit: "#ffffff", outfitTrim: "#FFD23F", tie: "#000000" },
  kaito:{ hair: "#3F6CC0", hairDark: "#1f3a6e", outfit: "#7AB0EC", outfitTrim: "#1f3a6e", tie: "#ffffff" },
  meiko:{ hair: "#7a3a1e", hairDark: "#3e1a09", outfit: "#C0272D", outfitTrim: "#6f1115", tie: "#ffffff" },
};

const SILHOUETTE: Palette = {
  hair: "#1a1f33", hairDark: "#000", outfit: "#1a1f33",
  outfitTrim: "#000", tie: "#1a1f33",
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
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G origin="32, 32" rotation={rotationDeg}>
        {/* shadow */}
        <Ellipse cx={32} cy={55} rx={14} ry={3} fill="#000" opacity={0.18} />

        {/* hair back (different per character) */}
        <HairBack id={id} p={p} flap={flap} silhouette={silhouette} />

        {/* torso / outfit */}
        <Body id={id} p={p} silhouette={silhouette} />

        {/* wing/arm — flap animation */}
        <G origin="38, 38" rotation={-flap * 55}>
          <Path
            d={`M38 38 Q ${38 + 14} ${38 - 4 + flap * 2}  ${38 + 16} ${38 + 6 + flap * 2} Q ${38 + 8} ${38 + 8 + flap * 4} 38 ${38 + 6} Z`}
            fill={p.hair}
            stroke={silhouette ? p.hair : p.hairDark}
            strokeWidth={0.8}
          />
        </G>
        <G origin="26, 38" rotation={flap * 30}>
          <Path d="M26 38 Q14 36 12 44 Q20 46 26 44 Z" fill={p.hairDark} opacity={0.85} />
        </G>

        {/* head circle - hair frame */}
        <Circle cx={32} cy={24} r={14} fill={p.hair} stroke={silhouette ? p.hair : p.hairDark} strokeWidth={1} />
        {/* face */}
        <Circle cx={33} cy={26} r={10} fill={silhouette ? p.outfit : "#fde6cf"} />

        {/* front hair / character-specific accessory */}
        <HairFront id={id} p={p} silhouette={silhouette} />

        {/* face details */}
        {!silhouette ? (
          <G>
            <Ellipse cx={29} cy={26} rx={2.2} ry={3} fill="#fff" />
            <Ellipse cx={37} cy={26} rx={2.2} ry={3} fill="#fff" />
            <Ellipse cx={29} cy={26.5} rx={1.3} ry={2} fill={p.hairDark} />
            <Ellipse cx={37} cy={26.5} rx={1.3} ry={2} fill={p.hairDark} />
            <Circle cx={29.3} cy={25.7} r={0.6} fill="#fff" />
            <Circle cx={37.3} cy={25.7} r={0.6} fill="#fff" />
            <Circle cx={27} cy={30} r={1.5} fill="#ff7896" opacity={0.55} />
            <Circle cx={39} cy={30} r={1.5} fill="#ff7896" opacity={0.55} />
            <Path d="M31 30 Q 33 31 35 30" stroke="#8a4a4a" strokeWidth={1} fill="none" strokeLinecap="round" />
          </G>
        ) : null}
      </G>
    </Svg>
  );
});

const HairBack: React.FC<{ id: CharacterId; p: Palette; flap: number; silhouette: boolean }> = ({
  id,
  p,
  flap,
  silhouette,
}) => {
  const stroke = silhouette ? p.hair : p.hairDark;
  switch (id) {
    case "miku":
      // Long teal twin-tails extending far down past the body.
      return (
        <G>
          {/* upper twintail */}
          <Path
            d={`M22 22 Q ${4 - flap * 3} ${22} ${-2} ${52} Q 14 50 22 38 Z`}
            fill={p.hair}
            stroke={stroke}
            strokeWidth={0.6}
          />
          {/* lower twintail */}
          <Path
            d={`M42 22 Q ${60 + flap * 3} ${22} ${66} ${52} Q 50 50 42 38 Z`}
            fill={p.hair}
            stroke={stroke}
            strokeWidth={0.6}
          />
          {/* hair ties */}
          <Rect x={18} y={18} width={6} height={6} fill="#2a2a2a" rx={1} />
          <Rect x={40} y={18} width={6} height={6} fill="#2a2a2a" rx={1} />
        </G>
      );
    case "rin":
      // Short bob with wide white bow on top.
      return (
        <G>
          <Path d="M16 22 Q 18 12 32 10 Q 46 12 48 22 L 48 36 L 16 36 Z" fill={p.hair} stroke={stroke} strokeWidth={0.6} />
          {/* big white bow */}
          <Path d="M32 8 L24 4 L26 12 Z" fill="#ffffff" stroke={stroke} strokeWidth={0.6} />
          <Path d="M32 8 L40 4 L38 12 Z" fill="#ffffff" stroke={stroke} strokeWidth={0.6} />
          <Circle cx={32} cy={9} r={2} fill={stroke} />
        </G>
      );
    case "len":
      // Short blonde hair with small back ponytail.
      return (
        <G>
          <Path d="M16 22 Q 18 12 32 12 Q 46 12 48 22 L 48 30 L 16 30 Z" fill={p.hair} stroke={stroke} strokeWidth={0.6} />
          {/* small ponytail behind */}
          <Path d={`M46 24 Q ${54 + flap * 2} 26 50 38 Q 44 34 42 30 Z`} fill={p.hair} stroke={stroke} strokeWidth={0.6} />
          <Rect x={42} y={22} width={5} height={5} fill="#2a2a2a" />
        </G>
      );
    case "luka":
      // Long flowing pink hair on both sides + gold headband.
      return (
        <G>
          <Path d={`M12 22 Q ${4 - flap * 2} 36 8 56 Q 22 52 24 34 Z`} fill={p.hair} stroke={stroke} strokeWidth={0.6} />
          <Path d={`M52 22 Q ${60 + flap * 2} 36 56 56 Q 42 52 40 34 Z`} fill={p.hair} stroke={stroke} strokeWidth={0.6} />
          <Path d="M18 24 Q 18 16 32 14 Q 46 16 46 24 L 46 30 L 18 30 Z" fill={p.hair} stroke={stroke} strokeWidth={0.6} />
        </G>
      );
    case "kaito":
      // Short blue hair + signature white scarf around the neck.
      return (
        <G>
          <Path d="M18 22 Q 20 12 32 10 Q 44 12 46 22 L 46 28 L 18 28 Z" fill={p.hair} stroke={stroke} strokeWidth={0.6} />
          {/* big white scarf */}
          <Path d="M16 36 Q 32 32 48 36 Q 48 42 32 42 Q 16 42 16 36 Z" fill="#ffffff" stroke={stroke} strokeWidth={0.8} />
          <Path d="M22 42 L 20 52 L 26 50 Z" fill="#ffffff" stroke={stroke} strokeWidth={0.6} />
        </G>
      );
    case "meiko":
      // Short brown hair + red headband.
      return (
        <G>
          <Path d="M16 22 Q 20 10 32 10 Q 44 10 48 22 L 46 30 L 18 30 Z" fill={p.hair} stroke={stroke} strokeWidth={0.6} />
          {/* red headband stripe */}
          <Rect x={16} y={16} width={32} height={4} fill="#C0272D" stroke={stroke} strokeWidth={0.6} />
        </G>
      );
    default:
      return null;
  }
};

const HairFront: React.FC<{ id: CharacterId; p: Palette; silhouette: boolean }> = ({
  id,
  p,
  silhouette,
}) => {
  const stroke = silhouette ? p.hair : p.hairDark;
  if (silhouette) {
    return (
      <Path
        d="M22 22 Q 26 10 32 14 Q 38 10 42 22 Q 38 22 36 18 Q 32 22 28 18 Q 24 22 22 22 Z"
        fill={p.hair}
      />
    );
  }
  switch (id) {
    case "miku":
      // Straight bangs across the forehead.
      return (
        <Path
          d="M22 22 Q 24 14 32 16 Q 40 14 42 22 Q 38 20 36 22 Q 32 20 28 22 Q 24 20 22 22 Z"
          fill={p.hair}
          stroke={stroke}
          strokeWidth={0.6}
        />
      );
    case "rin":
      // Forehead bangs splitting in the middle.
      return (
        <Path
          d="M22 22 Q 22 13 32 15 Q 42 13 42 22 Q 38 18 34 22 Q 32 18 30 22 Q 26 18 22 22 Z"
          fill={p.hair}
          stroke={stroke}
          strokeWidth={0.6}
        />
      );
    case "len":
      // Side bangs swept right covering forehead.
      return (
        <Path
          d="M20 22 Q 22 12 32 16 Q 42 12 44 22 Q 38 16 32 22 Q 26 18 20 22 Z"
          fill={p.hair}
          stroke={stroke}
          strokeWidth={0.6}
        />
      );
    case "luka":
      // Center-parted long bangs.
      return (
        <G>
          <Path
            d="M22 22 Q 22 12 32 14 Q 42 12 42 22 Q 38 18 33 22 Q 32 18 31 22 Q 26 18 22 22 Z"
            fill={p.hair}
            stroke={stroke}
            strokeWidth={0.6}
          />
        </G>
      );
    case "kaito":
      // Messy short bangs.
      return (
        <Path
          d="M22 24 Q 24 16 32 16 Q 40 16 42 24 Q 38 22 34 24 Q 30 22 26 24 Q 24 24 22 24 Z"
          fill={p.hair}
          stroke={stroke}
          strokeWidth={0.6}
        />
      );
    case "meiko":
      // Short side-swept bangs.
      return (
        <Path
          d="M22 22 Q 26 14 32 16 Q 38 14 42 22 Q 38 22 35 20 Q 32 22 29 20 Q 26 22 22 22 Z"
          fill={p.hair}
          stroke={stroke}
          strokeWidth={0.6}
        />
      );
  }
};

const Body: React.FC<{ id: CharacterId; p: Palette; silhouette: boolean }> = ({ id, p, silhouette }) => {
  const stroke = silhouette ? p.outfitTrim : "#222";
  // Common torso shape.
  const torso = (
    <Rect x={23} y={32} width={18} height={16} rx={4} fill={p.outfit} stroke={stroke} strokeWidth={1.2} />
  );
  switch (id) {
    case "miku":
      // White top + teal collar + red tie.
      return (
        <G>
          {torso}
          <Path d="M23 32 L41 32 L38 38 L32 35 L26 38 Z" fill="#39C5BB" stroke={stroke} strokeWidth={0.8} />
          <Path d="M30 36 L34 36 L35 44 L29 44 Z" fill="#ff4d6d" stroke={stroke} strokeWidth={0.6} />
          {/* shoulder straps */}
          <Rect x={24} y={32} width={2} height={10} fill="#39C5BB" />
          <Rect x={38} y={32} width={2} height={10} fill="#39C5BB" />
        </G>
      );
    case "rin":
    case "len":
      // White top + yellow collar + orange tie.
      return (
        <G>
          {torso}
          <Path d="M23 32 L41 32 L38 38 L32 35 L26 38 Z" fill="#FFD23F" stroke={stroke} strokeWidth={0.8} />
          <Path d="M30 36 L34 36 L35 44 L29 44 Z" fill="#ff8a3d" stroke={stroke} strokeWidth={0.6} />
          {/* yellow shoulder bars */}
          <Rect x={23} y={32} width={18} height={2} fill="#FFD23F" />
        </G>
      );
    case "luka":
      // White top + black/gold corset.
      return (
        <G>
          {torso}
          <Path d="M23 32 L41 32 L38 38 L32 35 L26 38 Z" fill="#000000" stroke={stroke} strokeWidth={0.8} />
          <Rect x={28} y={38} width={8} height={10} fill="#FFD23F" stroke={stroke} strokeWidth={0.6} />
        </G>
      );
    case "kaito":
      // Blue coat + scarf already drawn behind.
      return (
        <G>
          <Rect x={23} y={32} width={18} height={16} rx={4} fill={p.outfit} stroke={stroke} strokeWidth={1.2} />
          {/* yellow trim down center */}
          <Rect x={31} y={32} width={2} height={16} fill="#FFD23F" stroke={stroke} strokeWidth={0.4} />
        </G>
      );
    case "meiko":
      // Red top + brown belt.
      return (
        <G>
          <Rect x={23} y={32} width={18} height={16} rx={4} fill="#C0272D" stroke={stroke} strokeWidth={1.2} />
          <Rect x={23} y={42} width={18} height={3} fill="#7a3a1e" />
          {/* white cuffs at neckline */}
          <Rect x={23} y={32} width={18} height={2} fill="#ffffff" />
        </G>
      );
  }
};
