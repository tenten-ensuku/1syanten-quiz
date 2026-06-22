export type AudioTone = "tap" | "ok" | "ng";

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

let audioContext: AudioContext | null = null;
let audioResumePromise: Promise<void> | null = null;
let hasQueuedInitialTone = false;

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

    return audioContext;
  } catch {
    audioContext = null;
    return null;
  }
}

function scheduleTone(context: AudioContext, type: AudioTone) {
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

export function playTone(type: AudioTone) {
  const context = ensureAudioContext();
  if (!context) {
    return;
  }

  if (context.state === "running") {
    scheduleTone(context, type);
    return;
  }

  if (hasQueuedInitialTone) {
    return;
  }

  hasQueuedInitialTone = true;
  audioResumePromise ??= context.resume();
  void audioResumePromise
    .then(() => {
      if (context.state === "running") {
        scheduleTone(context, type);
      }
    })
    .catch(() => undefined)
    .finally(() => {
      audioResumePromise = null;
      hasQueuedInitialTone = false;
    });
}
