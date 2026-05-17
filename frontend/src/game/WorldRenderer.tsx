/** Single entity renderer that draws the whole game world from world.state. */
import React from "react";
import { View, StyleSheet, Text, Platform } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import { GAME } from "./constants";
import type { WorldState } from "./engine";
import { Leek } from "./sprites/Leek";
import { Vocaloid } from "./sprites/Vocaloid";
import type { CharacterId } from "../storage/profile";

interface Props {
  state: WorldState;
  characterId: CharacterId;
}

export const WorldRenderer: React.FC<Props> = ({ state, characterId }) => {
  const { width, height, playableHeight, pipes, y, angle, flap, score, status, invincibleTimer } = state;

  const invinciFlash = invincibleTimer > 0 && Math.floor(invincibleTimer * 12) % 2 === 0;

  return (
    <View style={[styles.fill, { width, height }]} pointerEvents="none">
      {/* Sky gradient */}
      <ExpoLinearGradient
        colors={["#ffd1e4", "#c7b5ff", "#a8e8ff"]}
        locations={[0, 0.45, 1]}
        style={[styles.fill, { width, height }]}
      />

      {/* Stage lights overlay */}
      <Svg width={width} height={playableHeight} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="beam1" x1="0" y1="0" x2="0.3" y2="1">
            <Stop offset="0" stopColor="#39C5BB" stopOpacity="0.55" />
            <Stop offset="1" stopColor="#39C5BB" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="beam2" x1="0" y1="0" x2="-0.3" y2="1">
            <Stop offset="0" stopColor="#ff6f9c" stopOpacity="0.55" />
            <Stop offset="1" stopColor="#ff6f9c" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={`M${width * 0.25} 0 L${width * 0.35} 0 L${width * 0.55} ${playableHeight} L${width * 0.05} ${playableHeight} Z`} fill="url(#beam1)" />
        <Path d={`M${width * 0.65} 0 L${width * 0.75} 0 L${width * 0.95} ${playableHeight} L${width * 0.45} ${playableHeight} Z`} fill="url(#beam2)" />
      </Svg>

      {/* Stage truss & speakers (decorative silhouette near horizon) */}
      <View style={[styles.stage, { top: playableHeight - 80, width }]} pointerEvents="none">
        <View style={[styles.truss, { width }]} />
        <View style={[styles.speaker, styles.speakerLeft]} />
        <View style={[styles.speaker, styles.speakerRight]} />
      </View>

      {/* Pipes (leeks) */}
      {pipes.map((p) => {
        const topH = p.gapY;
        const botY = p.gapY + GAME.PIPE_GAP;
        const botH = playableHeight - botY;
        return (
          <React.Fragment key={p.id}>
            <View style={{ position: "absolute", left: p.x, top: 0, width: GAME.PIPE_WIDTH, height: topH }}>
              <Leek width={GAME.PIPE_WIDTH} height={topH} variant="top" />
            </View>
            <View style={{ position: "absolute", left: p.x, top: botY, width: GAME.PIPE_WIDTH, height: botH }}>
              <Leek width={GAME.PIPE_WIDTH} height={botH} variant="bottom" />
            </View>
          </React.Fragment>
        );
      })}

      {/* Ground */}
      <View style={[styles.ground, { top: playableHeight, width, height: GAME.GROUND_H }]}>
        <View style={styles.grassTop} />
        <View style={styles.grassMid} />
        <ExpoLinearGradient colors={["#caa472", "#8a6a3b"]} style={styles.dirt} />
      </View>

      {/* Player */}
      <View
        style={{
          position: "absolute",
          left: GAME.PLAYER_X - GAME.PLAYER_R - 10,
          top: y - GAME.PLAYER_R - 10,
          width: GAME.PLAYER_R * 2 + 20,
          height: GAME.PLAYER_R * 2 + 20,
          opacity: invinciFlash ? 0.55 : 1,
        }}
      >
        <Vocaloid id={characterId} size={GAME.PLAYER_R * 2 + 20} flap={flap} angle={angle} />
      </View>

      {/* HUD score */}
      {status !== "over" ? (
        <View style={[styles.scoreWrap, { width }]} pointerEvents="none">
          <Text style={styles.scoreShadow}>{score}</Text>
          <Text style={styles.score}>{score}</Text>
        </View>
      ) : null}

      {status === "ready" ? (
        <View style={[styles.readyWrap, { width, top: playableHeight * 0.32 }]} pointerEvents="none">
          <Text style={styles.readyTitle}>{Platform.OS === "web" ? "TAP OR PRESS SPACE" : "TAP TO FLAP"}</Text>
          <Text style={styles.readySub}>Get ready!</Text>
        </View>
      ) : null}
    </View>
  );
};

// (kept for parity with previous canvas implementation; not currently used)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _SkyCircleUnused = Circle;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _RectUnused = Rect;

const styles = StyleSheet.create({
  fill: { position: "absolute", left: 0, top: 0 },
  stage: { position: "absolute", left: 0, height: 80 },
  truss: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 6,
    backgroundColor: "rgba(20,15,40,0.55)",
  },
  speaker: {
    position: "absolute",
    width: 22,
    height: 70,
    backgroundColor: "rgba(20,15,40,0.55)",
    top: 6,
  },
  speakerLeft: { left: 8 },
  speakerRight: { right: 8 },
  ground: { position: "absolute", left: 0 },
  grassTop: { width: "100%", height: 14, backgroundColor: "#7ed957" },
  grassMid: { width: "100%", height: 6, backgroundColor: "#5fb43d" },
  dirt: { width: "100%", flex: 1 },
  scoreWrap: {
    position: "absolute",
    top: 56,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreShadow: {
    position: "absolute",
    fontSize: 64,
    fontWeight: "900",
    color: "rgba(0,0,0,0.35)",
    transform: [{ translateY: 2 }],
  },
  score: {
    fontSize: 64,
    fontWeight: "900",
    color: "#ffffff",
    textShadowColor: "#39C5BB",
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 2 },
  },
  readyWrap: { position: "absolute", left: 0, alignItems: "center" },
  readyTitle: {
    color: "#1f7e78",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
    textShadowColor: "rgba(255,255,255,0.9)",
    textShadowRadius: 4,
  },
  readySub: {
    marginTop: 8,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
