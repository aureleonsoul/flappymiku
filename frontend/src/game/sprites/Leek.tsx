import React from "react";
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

interface Props {
  width: number;
  height: number;
  /** Which half to draw — "top" hangs down from ceiling, "bottom" sits on ground */
  variant: "top" | "bottom";
}

/** A negi (leek): green leafy half and white bulb half. */
export const Leek: React.FC<Props> = React.memo(function Leek({ width, height, variant }) {
  // Bulb takes ~38% of the leek length, on the gap side.
  const bulbLen = Math.min(80, height * 0.38);
  const leafLen = height - bulbLen;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="leaf" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#3aa84a" />
          <Stop offset="0.5" stopColor="#7ed957" />
          <Stop offset="1" stopColor="#3aa84a" />
        </LinearGradient>
        <LinearGradient id="bulb" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#eef9d8" />
          <Stop offset="0.5" stopColor="#ffffff" />
          <Stop offset="1" stopColor="#dff6c8" />
        </LinearGradient>
      </Defs>
      {variant === "top" ? (
        <G>
          {/* leaves at the top */}
          <Rect x={4} y={0} width={width - 8} height={leafLen} fill="url(#leaf)" stroke="rgba(0,0,0,0.35)" strokeWidth={1} />
          {/* leaf stripes */}
          {Array.from({ length: Math.floor(leafLen / 12) }).map((_, i) => (
            <Path
              key={i}
              d={`M${8} ${10 + i * 12} L${width - 8} ${10 + i * 12}`}
              stroke="rgba(0,0,0,0.18)"
              strokeWidth={1}
            />
          ))}
          {/* bulb at the bottom (gap side) */}
          <Rect
            x={0}
            y={leafLen}
            width={width}
            height={bulbLen}
            fill="url(#bulb)"
            stroke="rgba(0,0,0,0.35)"
            strokeWidth={1}
          />
          {/* root flourish at gap edge */}
          <Path
            d={`M0 ${height - 10} Q ${width / 2} ${height + 8} ${width} ${height - 10}`}
            fill="#fff8e0"
            stroke="rgba(0,0,0,0.35)"
            strokeWidth={1}
          />
        </G>
      ) : (
        <G>
          {/* bulb at the top (gap side) */}
          <Rect
            x={0}
            y={0}
            width={width}
            height={bulbLen}
            fill="url(#bulb)"
            stroke="rgba(0,0,0,0.35)"
            strokeWidth={1}
          />
          {/* root flourish at gap edge */}
          <Path
            d={`M0 10 Q ${width / 2} -8 ${width} 10`}
            fill="#fff8e0"
            stroke="rgba(0,0,0,0.35)"
            strokeWidth={1}
          />
          {/* leaves at the bottom */}
          <Rect x={4} y={bulbLen} width={width - 8} height={leafLen} fill="url(#leaf)" stroke="rgba(0,0,0,0.35)" strokeWidth={1} />
          {Array.from({ length: Math.floor(leafLen / 12) }).map((_, i) => (
            <Path
              key={i}
              d={`M${8} ${bulbLen + 10 + i * 12} L${width - 8} ${bulbLen + 10 + i * 12}`}
              stroke="rgba(0,0,0,0.18)"
              strokeWidth={1}
            />
          ))}
        </G>
      )}
    </Svg>
  );
});
