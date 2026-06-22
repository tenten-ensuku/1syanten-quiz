export type AudioTone = "tap" | "ok" | "ng";

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

let audioContext: AudioContext | null = null;

function ensureAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const audioWindow = window as AudioWindow;
    const AudioContextConstructor =
      audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioContextConstructor) {
      return null;
    }

    if (!audioContext || audioContext.state === "closed") {
      audioContext = new AudioContextConstructor();
    }

    if (audioContext.state !== "running") {
      void audioContext.resume().catch(() => undefined);
    }

    return audioContext;
  } catch {
    audioContext = null;
    return null;
  }
}

export function playTone(type: AudioTone) {
  const context = ensureAudioContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.connect(gain);
  gain.connect(context.destination);

  if (type === "ok") {
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(660, now);
    oscillator.frequency.exponentialRampToValueAtTime(990, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    oscillator.start(now);
    oscillator.stop(now + 0.18);
    return;
  }

  if (type === "ng") {
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(190, now);
    oscillator.frequency.exponentialRampToValueAtTime(92, now + 0.2);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.23);
    oscillator.start(now);
    oscillator.stop(now + 0.25);
    return;
  }

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(520, now);
  gain.gain.setValueAtTime(0.035, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
  oscillator.start(now);
  oscillator.stop(now + 0.055);
}
