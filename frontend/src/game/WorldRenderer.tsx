/**
 * Renders the entire game world from world.state every tick:
 * dynamic background, pipes (with wobble + per-stage art), ground, player,
 * HUD score and the brief "STAGE N" flash banner.
 */
import React from "react";
import { View, StyleSheet, Text, Platform } from "react-native";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import { GAME, stageForScore, STAGE_NAMES } from "./constants";
import { Background } from "./Background";
import type { WorldState } from "./engine";
import { pipeGapYWithWobble } from "./engine";
import { Leek } from "./sprites/Leek";
import { Vocaloid } from "./sprites/Vocaloid";
import type { CharacterId } from "../storage/profile";

interface Props {
  state: WorldState;
  characterId: CharacterId;
}

export const WorldRenderer: React.FC<Props> = ({ state, characterId }) => {
  const {
    width,
    height,
    playableHeight,
    pipes,
    y,
    angle,
    flap,
    score,
    status,
    invincibleTimer,
    stage,
    prevStage,
    stageFade,
    stageFlashTimer,
    time,
  } = state;

  const invinciFlash = invincibleTimer > 0 && Math.floor(invincibleTimer * 12) % 2 === 0;
  const params = stageForScore(score);

  // Ground colour shifts with stage so it doesn't clash with a navy/space sky.
  const isDarkStage = stage >= 3;
  const groundTop = isDarkStage ? "#1f2030" : "#7ed957";
  const groundMid = isDarkStage ? "#0e0f1c" : "#5fb43d";
  const dirt: [string, string] = isDarkStage ? ["#332543", "#0a0014"] : ["#caa472", "#8a6a3b"];

  return (
    <View style={[styles.fill, { width, height }]} pointerEvents="none">
      {/* Dynamic background */}
      <Background
        stage={stage}
        prevStage={prevStage}
        fade={stageFade}
        width={width}
        height={playableHeight}
        time={time}
      />

      {/* Pipes (leeks) */}
      {pipes.map((p) => {
        const effGapY = pipeGapYWithWobble(p, time, params.wobbleAmp);
        const topH = Math.max(1, effGapY);
        const botY = effGapY + params.gap;
        const botH = Math.max(1, playableHeight - botY);
        return (
          <React.Fragment key={p.id}>
            <View style={{ position: "absolute", left: p.x, top: 0, width: GAME.PIPE_WIDTH, height: topH }}>
              <Leek width={GAME.PIPE_WIDTH} height={topH} variant="top" stage={p.stage} time={time} />
            </View>
            <View style={{ position: "absolute", left: p.x, top: botY, width: GAME.PIPE_WIDTH, height: botH }}>
              <Leek width={GAME.PIPE_WIDTH} height={botH} variant="bottom" stage={p.stage} time={time} />
            </View>
          </React.Fragment>
        );
      })}

      {/* Ground */}
      <View style={[styles.ground, { top: playableHeight, width, height: GAME.GROUND_H }]}>
        <View style={[styles.grassTop, { backgroundColor: groundTop }]} />
        <View style={[styles.grassMid, { backgroundColor: groundMid }]} />
        <ExpoLinearGradient colors={dirt} style={styles.dirt} />
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
          <Text style={[styles.score, { color: isDarkStage ? "#ffffff" : "#ffffff" }]}>{score}</Text>
        </View>
      ) : null}

      {status === "ready" ? (
        <View style={[styles.readyWrap, { width, top: playableHeight * 0.32 }]} pointerEvents="none">
          <Text style={styles.readyTitle}>{Platform.OS === "web" ? "TAP OR PRESS SPACE" : "TAP TO FLAP"}</Text>
          <Text style={styles.readySub}>Get ready!</Text>
        </View>
      ) : null}

      {/* Stage flash banner (visible for ~1s after every stage change) */}
      {stageFlashTimer > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.stageFlashWrap,
            { width, top: playableHeight * 0.42, opacity: Math.min(1, stageFlashTimer * 1.6) },
          ]}
        >
          <View style={styles.stageBadge}>
            <Text style={styles.stageBadgeNum}>STAGE {stage}</Text>
            <Text style={styles.stageBadgeName}>
              {STAGE_NAMES[stage] ?? `LEVEL ${stage}`}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { position: "absolute", left: 0, top: 0 },
  ground: { position: "absolute", left: 0 },
  grassTop: { width: "100%", height: 14 },
  grassMid: { width: "100%", height: 6 },
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
    color: "rgba(0,0,0,0.45)",
    transform: [{ translateY: 2 }],
  },
  score: {
    fontSize: 64,
    fontWeight: "900",
    textShadow: "0px 2px 4px #39C5BB",
  },
  readyWrap: { position: "absolute", left: 0, alignItems: "center" },
  readyTitle: {
    color: "#1f7e78",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
    textShadow: "0px 0px 4px rgba(255,255,255,0.9)",
  },
  readySub: {
    marginTop: 8,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
  stageFlashWrap: { position: "absolute", left: 0, alignItems: "center" },
  stageBadge: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    backgroundColor: "rgba(10,8,28,0.7)",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#39C5BB",
    alignItems: "center",
  },
  stageBadgeNum: { color: "#39C5BB", fontWeight: "900", fontSize: 22, letterSpacing: 4 },
  stageBadgeName: { color: "#ffffff", fontWeight: "800", fontSize: 12, letterSpacing: 3, marginTop: 2 },
});
