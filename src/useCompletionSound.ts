import { useEffect, useRef } from "react";

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext;
  const AudioContextClass =
    window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext = new AudioContextClass();
  return audioContext;
}

export function unlockCompletionSound(): void {
  const context = getAudioContext();
  if (context?.state === "suspended") {
    void context.resume();
  }
}

function playCompletionSound(): void {
  const context = getAudioContext();
  if (!context) return;

  const play = () => {
    const start = context.currentTime + 0.02;
    const master = context.createGain();
    master.gain.setValueAtTime(0.14, start);
    master.gain.exponentialRampToValueAtTime(0.0001, start + 0.72);
    master.connect(context.destination);

    [
      { frequency: 523.25, offset: 0, duration: 0.24, volume: 0.62 },
      { frequency: 659.25, offset: 0.09, duration: 0.28, volume: 0.52 },
      { frequency: 783.99, offset: 0.18, duration: 0.34, volume: 0.48 },
      { frequency: 1046.5, offset: 0.34, duration: 0.38, volume: 0.34 }
    ].forEach(({ frequency, offset, duration, volume }) => {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      const noteStart = start + offset;
      const noteEnd = noteStart + duration;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      envelope.gain.setValueAtTime(0.0001, noteStart);
      envelope.gain.exponentialRampToValueAtTime(volume, noteStart + 0.018);
      envelope.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
      oscillator.connect(envelope);
      envelope.connect(master);
      oscillator.start(noteStart);
      oscillator.stop(noteEnd + 0.02);
    });
  };

  if (context.state === "suspended") {
    void context.resume().then(play).catch(() => undefined);
  } else {
    play();
  }
}

export function useCompletionSound(levelId: number, complete: boolean): void {
  const previous = useRef({ levelId, complete });

  useEffect(() => {
    const unlock = () => unlockCompletionSound();
    window.addEventListener("pointerdown", unlock, {
      capture: true,
      once: true
    });
    window.addEventListener("keydown", unlock, { capture: true, once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
  }, []);

  useEffect(() => {
    if (previous.current.levelId !== levelId) {
      previous.current = { levelId, complete };
      return;
    }
    if (!previous.current.complete && complete) {
      playCompletionSound();
    }
    previous.current.complete = complete;
  }, [complete, levelId]);
}
