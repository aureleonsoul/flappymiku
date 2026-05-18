/**
 * Procedural audio engine for Flappy Miku — fully native.
 *
 * The original implementation tried to use the browser Web Audio API
 * (`AudioContext`), which is undefined in the React Native runtime, so the
 * game shipped silent on real devices. This rewrite synthesises 16-bit PCM
 * directly in JavaScript, wraps it in a WAV header, base64-encodes the
 * result, and hands the `data:audio/wav;base64,…` URI to `expo-av`. The end
 * result: real native playback on iOS, Android, and the Expo web preview,
 * with no bundled audio assets.
 *
 * Public surface is intentionally identical to the previous version so the
 * call sites in `game.tsx`, `characters.tsx`, and `_layout.tsx` keep working
 * unchanged.
 *
 *   init()                — preload all SFX + 5 stage music tracks
 *   isReady()             — true once SFX are preloaded
 *   isMuted()             — current user mute preference (persisted)
 *   setMuted(bool)        — persist user mute preference + apply
 *   toggleMuted()         — flip + return new state
 *   setSuspended(bool)    — pause music when app is backgrounded (NOT persisted)
 *   resume()              — no-op (kept for API parity)
 *   startMusic(stage)     — fade target stage in, others out (idempotent)
 *   stopMusic()           — fade all music out
 *   playFlap(stage)
 *   playScore()
 *   playHit()
 *   playStageTransition()
 *   playClick()
 *   playUnlock()
 *   playReviveSuccess()
 */
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MUTE_KEY = "flappymiku.audio.muted.v1";

/* Sample rates — SFX get higher fidelity (short anyway); music uses 16 kHz
 * to keep base64 payload + decode time small while still sounding chiptune.
 */
const SFX_SR = 22050;
const MUSIC_SR = 16000;
const MUSIC_VOLUME = 0.55;

type WaveType = "sine" | "square" | "sawtooth" | "triangle";

interface Note {
  /** beat offset within the bar (1 beat = quarter note) */
  beat: number;
  /** frequency in Hz */
  hz: number;
  /** note length in beats */
  len: number;
  wave: WaveType;
  /** peak gain 0..1 */
  gain: number;
  /** apply an exponential slide so the final freq = hz * slideTo */
  slideTo?: number;
}

interface MusicTrack {
  bpm: number;
  beatsPerBar: number;
  notes: Note[];
}

// Hard-coded note-name → Hz table to dodge a music-theory dependency.
const N: Record<string, number> = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77,
  C6: 1046.5, D6: 1174.66, E6: 1318.51, F6: 1396.91, G6: 1567.98, A6: 1760.0,
};

/* ============================================================
 *  Stage music patterns — one bar each, looped natively by expo-av.
 * ============================================================ */

const STAGE1: MusicTrack = {
  bpm: 120,
  beatsPerBar: 8,
  notes: [
    { beat: 0, hz: N.C3, len: 0.5, wave: "square", gain: 0.13 },
    { beat: 2, hz: N.G3, len: 0.5, wave: "square", gain: 0.13 },
    { beat: 4, hz: N.A3, len: 0.5, wave: "square", gain: 0.13 },
    { beat: 6, hz: N.F3, len: 0.5, wave: "square", gain: 0.13 },
    { beat: 0, hz: N.C5, len: 0.5, wave: "sine", gain: 0.18 },
    { beat: 0.5, hz: N.E5, len: 0.5, wave: "sine", gain: 0.18 },
    { beat: 1, hz: N.G5, len: 0.5, wave: "sine", gain: 0.18 },
    { beat: 1.5, hz: N.E5, len: 0.5, wave: "sine", gain: 0.18 },
    { beat: 2, hz: N.D5, len: 0.5, wave: "sine", gain: 0.18 },
    { beat: 2.5, hz: N.F5, len: 0.5, wave: "sine", gain: 0.18 },
    { beat: 3, hz: N.A5, len: 0.5, wave: "sine", gain: 0.18 },
    { beat: 3.5, hz: N.F5, len: 0.5, wave: "sine", gain: 0.18 },
    { beat: 4, hz: N.E5, len: 0.5, wave: "sine", gain: 0.18 },
    { beat: 4.5, hz: N.G5, len: 0.5, wave: "sine", gain: 0.18 },
    { beat: 5, hz: N.C6, len: 0.5, wave: "sine", gain: 0.18 },
    { beat: 5.5, hz: N.G5, len: 0.5, wave: "sine", gain: 0.18 },
    { beat: 6, hz: N.F5, len: 0.5, wave: "sine", gain: 0.18 },
    { beat: 6.5, hz: N.A5, len: 0.5, wave: "sine", gain: 0.18 },
    { beat: 7, hz: N.G5, len: 0.5, wave: "sine", gain: 0.18 },
    { beat: 7.5, hz: N.E5, len: 0.5, wave: "sine", gain: 0.18 },
  ],
};

const STAGE2: MusicTrack = {
  bpm: 120,
  beatsPerBar: 8,
  notes: [
    { beat: 0, hz: N.A3, len: 2, wave: "triangle", gain: 0.16 },
    { beat: 2, hz: N.F3, len: 2, wave: "triangle", gain: 0.16 },
    { beat: 4, hz: N.G3, len: 2, wave: "triangle", gain: 0.16 },
    { beat: 6, hz: N.E3, len: 2, wave: "triangle", gain: 0.16 },
    { beat: 0.5, hz: N.A4, len: 1, wave: "sine", gain: 0.13 },
    { beat: 1.5, hz: N.C5, len: 1, wave: "sine", gain: 0.13 },
    { beat: 2.5, hz: N.E5, len: 1, wave: "sine", gain: 0.13 },
    { beat: 3.5, hz: N.D5, len: 1, wave: "sine", gain: 0.13 },
    { beat: 4.5, hz: N.C5, len: 1, wave: "sine", gain: 0.13 },
    { beat: 5.5, hz: N.B4, len: 1, wave: "sine", gain: 0.13 },
    { beat: 6.5, hz: N.G4, len: 1.5, wave: "sine", gain: 0.13 },
  ],
};

const STAGE3: MusicTrack = {
  bpm: 140,
  beatsPerBar: 8,
  notes: [
    { beat: 0, hz: N.E3, len: 0.4, wave: "square", gain: 0.16 },
    { beat: 1, hz: N.E3, len: 0.4, wave: "square", gain: 0.16 },
    { beat: 2, hz: N.A3, len: 0.4, wave: "square", gain: 0.16 },
    { beat: 3, hz: N.A3, len: 0.4, wave: "square", gain: 0.16 },
    { beat: 4, hz: N.D3, len: 0.4, wave: "square", gain: 0.16 },
    { beat: 5, hz: N.D3, len: 0.4, wave: "square", gain: 0.16 },
    { beat: 6, hz: N.G3, len: 0.4, wave: "square", gain: 0.16 },
    { beat: 7, hz: N.G3, len: 0.4, wave: "square", gain: 0.16 },
    ...Array.from({ length: 16 }).map((_, i) => {
      const seq = [
        N.E5, N.G5, N.B5, N.E6, N.B5, N.G5, N.A5, N.E5,
        N.A5, N.C6, N.E6, N.A5, N.G5, N.E5, N.D5, N.B4,
      ];
      return {
        beat: i * 0.5,
        hz: seq[i],
        len: 0.4,
        wave: "sawtooth" as WaveType,
        gain: 0.12,
      };
    }),
  ],
};

const STAGE4: MusicTrack = {
  bpm: 155,
  beatsPerBar: 8,
  notes: [
    ...Array.from({ length: 16 }).map((_, i) => ({
      beat: i * 0.5,
      hz: i % 4 === 0 ? N.A3 : i % 4 === 2 ? N.F3 : N.E3,
      len: 0.45,
      wave: "square" as WaveType,
      gain: 0.18,
    })),
    ...Array.from({ length: 16 }).map((_, i) => {
      const seq = [
        N.A4, N.C5, N.E5, N.A5, N.G5, N.E5, N.C5, N.A4,
        N.F4, N.A4, N.C5, N.F5, N.E5, N.C5, N.A4, N.F4,
      ];
      return {
        beat: i * 0.5,
        hz: seq[i],
        len: 0.4,
        wave: "square" as WaveType,
        gain: 0.11,
      };
    }),
  ],
};

const STAGE5: MusicTrack = {
  bpm: 170,
  beatsPerBar: 8,
  notes: [
    ...Array.from({ length: 8 }).map((_, i) => ({
      beat: i,
      hz: i % 2 === 0 ? N.A3 : N.E3,
      len: 0.85,
      wave: "sawtooth" as WaveType,
      gain: 0.12,
    })),
    ...Array.from({ length: 32 }).map((_, i) => {
      const seq = [
        N.A5, N.C6, N.E6, N.A6, N.E6, N.C6, N.E6, N.A5,
        N.B5, N.D6, N.F6, N.A6, N.F6, N.D6, N.F6, N.B5,
        N.C6, N.E6, N.G6, N.C6, N.G6, N.E6, N.G6, N.C6,
        N.A5, N.E6, N.A6, N.E6, N.C6, N.A5, N.E6, N.A5,
      ];
      return {
        beat: i * 0.25,
        hz: seq[i],
        len: 0.22,
        wave: "sine" as WaveType,
        gain: 0.1,
      };
    }),
  ],
};

const TRACKS: Record<number, MusicTrack> = {
  1: STAGE1,
  2: STAGE2,
  3: STAGE3,
  4: STAGE4,
  5: STAGE5,
};

/* ============================================================
 *  PCM synthesis helpers
 * ============================================================ */

/**
 * Add a single tone with attack/decay envelope into the buffer.
 * The buffer accumulates samples in float [-1, 1]; we clip later.
 */
function synthNote(
  buffer: Float32Array,
  sampleRate: number,
  startSec: number,
  durSec: number,
  hz: number,
  wave: WaveType,
  gain: number,
  slideTo?: number,
): void {
  const startIdx = Math.max(0, Math.floor(startSec * sampleRate));
  const endIdx = Math.min(buffer.length, Math.floor((startSec + durSec) * sampleRate));
  if (endIdx <= startIdx) return;
  const span = endIdx - startIdx;
  const attackSamples = Math.min(Math.floor(0.005 * sampleRate), span);
  let phase = 0;
  for (let i = startIdx; i < endIdx; i++) {
    const idxInNote = i - startIdx;
    const t = idxInNote / span;
    const curHz = slideTo ? hz * Math.pow(slideTo, t) : hz;
    phase += (2 * Math.PI * curHz) / sampleRate;
    let s = 0;
    switch (wave) {
      case "sine":
        s = Math.sin(phase);
        break;
      case "square":
        s = Math.sin(phase) >= 0 ? 1 : -1;
        break;
      case "sawtooth": {
        const ph = (phase / (2 * Math.PI)) % 1;
        s = 2 * ph - 1;
        break;
      }
      case "triangle": {
        const ph = (phase / (2 * Math.PI)) % 1;
        s = ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph;
        break;
      }
    }
    // Envelope: short linear attack, then exponential decay to silence.
    let env: number;
    if (idxInNote < attackSamples) {
      env = idxInNote / attackSamples;
    } else {
      const dt = (idxInNote - attackSamples) / Math.max(1, span - attackSamples);
      env = Math.pow(0.001, dt); // -60 dB at the tail
    }
    buffer[i] += s * env * gain;
  }
}

/** Render one bar of a music track into a Float32 buffer. */
function renderTrack(track: MusicTrack, sampleRate: number): Float32Array {
  const secPerBeat = 60 / track.bpm;
  const barDur = track.beatsPerBar * secPerBeat;
  const samples = Math.floor(barDur * sampleRate);
  const buf = new Float32Array(samples);
  for (const n of track.notes) {
    synthNote(buf, sampleRate, n.beat * secPerBeat, n.len * secPerBeat, n.hz, n.wave, n.gain, n.slideTo);
  }
  return buf;
}

/* ============================================================
 *  WAV encoder + base64
 * ============================================================ */

/** Encode a Float32 buffer as a 16-bit PCM mono WAV byte array. */
function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const dv = new DataView(buffer);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) dv.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  dv.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, numChannels, true);
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, byteRate, true);
  dv.setUint16(32, blockAlign, true);
  dv.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  dv.setUint32(40, dataSize, true);

  // Soft-clip and write samples.
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    let v = samples[i];
    if (v > 1) v = 1;
    else if (v < -1) v = -1;
    dv.setInt16(offset, v < 0 ? v * 0x8000 : v * 0x7fff, true);
    offset += 2;
  }
  return new Uint8Array(buffer);
}

const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Chunked base64 encoder — works in any RN runtime without `btoa`. */
function bytesToBase64(bytes: Uint8Array): string {
  const len = bytes.length;
  const chunks: string[] = [];
  let buf = "";
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;
    buf += B64_CHARS[b1 >> 2];
    buf += B64_CHARS[((b1 & 0x03) << 4) | (b2 >> 4)];
    buf += i + 1 < len ? B64_CHARS[((b2 & 0x0f) << 2) | (b3 >> 6)] : "=";
    buf += i + 2 < len ? B64_CHARS[b3 & 0x3f] : "=";
    if (buf.length >= 16384) {
      chunks.push(buf);
      buf = "";
    }
  }
  if (buf.length) chunks.push(buf);
  return chunks.join("");
}

function wavDataUri(samples: Float32Array, sampleRate: number): string {
  return `data:audio/wav;base64,${bytesToBase64(encodeWav(samples, sampleRate))}`;
}

/** Allow other tasks (UI) to breathe during heavy preload. */
const yieldToEventLoop = (): Promise<void> =>
  new Promise((r) => setTimeout(r, 0));

/* ============================================================
 *  SFX presets
 * ============================================================ */

const FLAP_PITCHES = [1, 1, 1.1, 1.22, 1.36, 1.52]; // index by stage 1..5

function renderFlap(stage: number): Float32Array {
  const dur = 0.11;
  const samples = Math.floor(dur * SFX_SR);
  const buf = new Float32Array(samples);
  const pitch = FLAP_PITCHES[Math.min(5, Math.max(1, stage))] ?? 1;
  synthNote(buf, SFX_SR, 0, 0.09, 520 * pitch, "sine", 0.36, 1.6);
  return buf;
}

function renderScore(): Float32Array {
  const samples = Math.floor(0.13 * SFX_SR);
  const buf = new Float32Array(samples);
  synthNote(buf, SFX_SR, 0, 0.12, N.A5, "triangle", 0.35, 1.2);
  return buf;
}

function renderHit(): Float32Array {
  const dur = 0.34;
  const samples = Math.floor(dur * SFX_SR);
  const buf = new Float32Array(samples);
  // Noise burst (first 80 ms)
  const noiseEnd = Math.floor(0.08 * SFX_SR);
  for (let i = 0; i < noiseEnd; i++) {
    const env = Math.pow(0.001, i / noiseEnd);
    buf[i] += (Math.random() * 2 - 1) * 0.5 * env;
  }
  // Descending square buzz over the whole duration
  synthNote(buf, SFX_SR, 0, 0.32, 220, "square", 0.45, 60 / 220);
  return buf;
}

function renderStageTransition(): Float32Array {
  const dur = 0.7;
  const samples = Math.floor(dur * SFX_SR);
  const buf = new Float32Array(samples);
  const notes = [N.C5, N.E5, N.G5, N.C6];
  notes.forEach((hz, i) => synthNote(buf, SFX_SR, i * 0.12, 0.2, hz, "sine", 0.32));
  return buf;
}

function renderClick(): Float32Array {
  const samples = Math.floor(0.07 * SFX_SR);
  const buf = new Float32Array(samples);
  synthNote(buf, SFX_SR, 0, 0.06, N.A5, "sine", 0.3);
  return buf;
}

function renderUnlock(): Float32Array {
  const dur = 0.6;
  const samples = Math.floor(dur * SFX_SR);
  const buf = new Float32Array(samples);
  const notes = [N.C5, N.E5, N.G5, N.C6];
  notes.forEach((hz, i) => synthNote(buf, SFX_SR, i * 0.1, 0.18, hz, "triangle", 0.36));
  return buf;
}

function renderReviveSuccess(): Float32Array {
  const dur = 0.55;
  const samples = Math.floor(dur * SFX_SR);
  const buf = new Float32Array(samples);
  const notes = [N.G4, N.C5, N.E5];
  notes.forEach((hz, i) => synthNote(buf, SFX_SR, i * 0.12, 0.24, hz, "sine", 0.34));
  return buf;
}

/* ============================================================
 *  AudioManager
 * ============================================================ */

type SfxKey =
  | "flap1" | "flap2" | "flap3" | "flap4" | "flap5"
  | "score" | "hit" | "stageTransition" | "click" | "unlock" | "revive";

class AudioManager {
  private muted = false;
  private suspended = false;
  private initStarted = false;
  private initialised = false;

  // Loaded SFX players. Calls become no-ops until populated.
  private sfx: Partial<Record<SfxKey, Audio.Sound>> = {};
  // Loaded music players (one per stage).
  private music: Record<number, Audio.Sound | null> = { 1: null, 2: null, 3: null, 4: null, 5: null };
  private musicVolumes: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  private musicLoaded = false;
  private currentStage = 1;
  private rampToken = 0;

  /** Bring up the audio engine. Idempotent. */
  init = async (): Promise<void> => {
    if (this.initStarted) return;
    this.initStarted = true;

    // Restore persisted mute pref first so initial volumes apply correctly.
    try {
      const stored = await AsyncStorage.getItem(MUTE_KEY);
      if (stored === "1") this.muted = true;
    } catch {
      /* ignore */
    }

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
        allowsRecordingIOS: false,
      });
    } catch (e) {
      console.warn("[audio] setAudioMode failed:", e);
    }

    // Preload SFX serially so we don't allocate ~5x ArrayBuffers in flight.
    await this.preloadSfx();
    this.initialised = true;

    // Music is heavier; let it stream in the background.
    void this.preloadMusic();
  };

  isReady = (): boolean => this.initialised;
  isMuted = (): boolean => this.muted;

  setMuted = (m: boolean): void => {
    if (this.muted === m) return;
    this.muted = m;
    AsyncStorage.setItem(MUTE_KEY, m ? "1" : "0").catch(() => undefined);
    void this.applyMusicVolumes();
  };

  toggleMuted = (): boolean => {
    this.setMuted(!this.muted);
    return this.muted;
  };

  /** Pause music while app is in background. Does NOT persist. */
  setSuspended = (s: boolean): void => {
    if (this.suspended === s) return;
    this.suspended = s;
    void this.applyMusicVolumes();
  };

  /** Kept for API compatibility — expo-av needs no manual resume. */
  resume = (): void => {
    /* no-op */
  };

  /* ---------- Music ---------- */

  startMusic = (stage: number): void => {
    this.currentStage = Math.min(5, Math.max(1, stage));
    void this.applyMusicVolumes();
  };

  stopMusic = (): void => {
    this.currentStage = 0; // sentinel — every stage will fade to 0
    void this.applyMusicVolumes();
  };

  /* ---------- SFX ---------- */

  playFlap = (stage = 1): void => {
    const key = (`flap${Math.min(5, Math.max(1, stage))}` as SfxKey);
    this.fireSfx(key);
  };
  playScore = (): void => this.fireSfx("score");
  playHit = (): void => this.fireSfx("hit");
  playStageTransition = (): void => this.fireSfx("stageTransition");
  playClick = (): void => this.fireSfx("click");
  playUnlock = (): void => this.fireSfx("unlock");
  playReviveSuccess = (): void => this.fireSfx("revive");

  /* ---------- internals ---------- */

  private fireSfx = (key: SfxKey): void => {
    if (this.muted || this.suspended) return;
    const s = this.sfx[key];
    if (!s) return;
    // replayAsync resets to start; safe to spam.
    s.replayAsync().catch(() => undefined);
  };

  private preloadSfx = async (): Promise<void> => {
    const sources: { key: SfxKey; render: () => Float32Array }[] = [
      { key: "flap1", render: () => renderFlap(1) },
      { key: "flap2", render: () => renderFlap(2) },
      { key: "flap3", render: () => renderFlap(3) },
      { key: "flap4", render: () => renderFlap(4) },
      { key: "flap5", render: () => renderFlap(5) },
      { key: "score", render: renderScore },
      { key: "hit", render: renderHit },
      { key: "stageTransition", render: renderStageTransition },
      { key: "click", render: renderClick },
      { key: "unlock", render: renderUnlock },
      { key: "revive", render: renderReviveSuccess },
    ];
    for (const { key, render } of sources) {
      try {
        const uri = wavDataUri(render(), SFX_SR);
        const { sound } = await Audio.Sound.createAsync({ uri }, { volume: 1.0, shouldPlay: false });
        this.sfx[key] = sound;
      } catch (e) {
        console.warn("[audio] sfx preload failed:", key, e);
      }
      await yieldToEventLoop();
    }
  };

  private preloadMusic = async (): Promise<void> => {
    for (let s = 1; s <= 5; s++) {
      try {
        const track = TRACKS[s];
        const buf = renderTrack(track, MUSIC_SR);
        const uri = wavDataUri(buf, MUSIC_SR);
        // Load with shouldPlay: false to avoid web's autoplay policy
        // tripping on first load. We call playAsync() the first time we
        // need a stage audible (after a user gesture). On native iOS /
        // Android this also avoids unnecessary work until music is needed.
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { volume: 0, isLooping: true, shouldPlay: false },
        );
        this.music[s] = sound;
      } catch (e) {
        console.warn("[audio] music preload failed for stage", s, e);
        this.music[s] = null;
      }
      // Yield between each ~1 MB allocation so the UI thread isn't blocked.
      await yieldToEventLoop();
    }
    this.musicLoaded = true;
    // Apply whatever stage was requested while we were loading.
    void this.applyMusicVolumes();
  };

  // Tracks which stage music tracks have been kicked off via playAsync().
  // expo-av needs an explicit play call before our volume ramp does anything.
  private musicStarted: Record<number, boolean> = { 1: false, 2: false, 3: false, 4: false, 5: false };

  /**
   * Ramp every track's volume toward its target. Only the `currentStage`
   * (when not muted/suspended) plays at full music volume; everything else
   * fades to 0. Each new call cancels the previous ramp via `rampToken`.
   */
  private applyMusicVolumes = async (): Promise<void> => {
    if (!this.musicLoaded) return;
    const token = ++this.rampToken;
    const STEPS = 10;
    const TOTAL_MS = 900;
    const stepMs = TOTAL_MS / STEPS;

    const start: Record<number, number> = {};
    const target: Record<number, number> = {};
    for (let s = 1; s <= 5; s++) {
      start[s] = this.musicVolumes[s] ?? 0;
      const isCurrent = s === this.currentStage;
      target[s] = this.muted || this.suspended || !isCurrent ? 0 : MUSIC_VOLUME;
    }

    // Make sure looping playback is actually running for every track. We
    // defer the initial playAsync() until now so that, on web, it happens
    // after a user gesture (avoiding the browser autoplay policy).
    for (let s = 1; s <= 5; s++) {
      const snd = this.music[s];
      if (!snd || this.musicStarted[s]) continue;
      if (this.muted || this.suspended) continue;
      this.musicStarted[s] = true;
      snd.playAsync().catch(() => {
        // Likely web autoplay policy — try again next ramp.
        this.musicStarted[s] = false;
      });
    }

    for (let i = 1; i <= STEPS; i++) {
      await new Promise((r) => setTimeout(r, stepMs));
      if (token !== this.rampToken) return; // newer ramp took over
      const t = i / STEPS;
      for (let s = 1; s <= 5; s++) {
        const v = start[s] + (target[s] - start[s]) * t;
        this.musicVolumes[s] = v;
        const snd = this.music[s];
        if (snd) {
          snd.setVolumeAsync(Math.max(0, Math.min(1, v))).catch(() => undefined);
        }
      }
    }
  };
}

export const audioManager = new AudioManager();
