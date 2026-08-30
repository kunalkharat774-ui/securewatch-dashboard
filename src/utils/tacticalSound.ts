const createTone = (frequency: number, duration = 0.08, type: OscillatorType = 'sine', volume = 0.03) => {
  if (typeof window === 'undefined') return;

  const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return;

  const context = new AudioCtor();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gainNode.gain.setValueAtTime(volume, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start();
  oscillator.stop(context.currentTime + duration);

  oscillator.onended = () => {
    void context.close();
  };
};

export const tacticalAudio = {
  playSectorSwitch: () => {
    createTone(420, 0.06, 'triangle', 0.018);
    setTimeout(() => createTone(620, 0.05, 'sine', 0.014), 40);
  },
  playTargetLock: () => {
    createTone(280, 0.05, 'sawtooth', 0.02);
    setTimeout(() => createTone(540, 0.12, 'square', 0.018), 70);
  },
  playRadarPing: () => {
    createTone(760, 0.08, 'sine', 0.02);
    setTimeout(() => createTone(920, 0.07, 'triangle', 0.016), 50);
  },
};
