export class AudioManager {
  private context: AudioContext | undefined;
  private master: GainNode | undefined;
  private musicTimer: number | undefined;
  private breakMuted = false;
  private unlocked = false;
  soundEnabled = true;
  musicEnabled = true;

  unlock(): void {
    if (this.unlocked) return;
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return;
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = 0.75;
    this.master.connect(this.context.destination);
    this.unlocked = true;
    if (this.musicEnabled) this.startMusic();
  }

  applySettings(soundEnabled: boolean, musicEnabled: boolean): void {
    this.soundEnabled = soundEnabled;
    this.musicEnabled = musicEnabled;
    if (musicEnabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  setBreakMuted(muted: boolean): void {
    this.breakMuted = muted;
    if (this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.75, this.context?.currentTime ?? 0, 0.02);
    }
  }

  handleVisibility(visible: boolean): void {
    if (!this.context) return;
    if (!visible) {
      void this.context.suspend();
    } else if (this.unlocked && !this.breakMuted) {
      void this.context.resume();
    }
  }

  playClick(): void {
    this.playTone(520, 0.045, "sine", 0.055);
  }

  playBump(): void {
    this.playTone(110, 0.09, "sawtooth", 0.07);
  }

  playExit(): void {
    this.playTone(740, 0.075, "triangle", 0.065);
    window.setTimeout(() => this.playTone(980, 0.06, "triangle", 0.045), 50);
  }

  playComplete(): void {
    [440, 554, 659, 880].forEach((frequency, index) => {
      window.setTimeout(() => this.playTone(frequency, 0.1, "triangle", 0.06), index * 70);
    });
  }

  private startMusic(): void {
    if (!this.unlocked || this.musicTimer !== undefined) return;
    const notes = [196, 247, 294, 247, 220, 262, 330, 262];
    let step = 0;
    this.musicTimer = window.setInterval(() => {
      if (!this.musicEnabled || this.breakMuted || document.hidden) return;
      this.playTone(notes[step % notes.length], 0.14, "sine", 0.018);
      step += 1;
    }, 520);
  }

  private stopMusic(): void {
    if (this.musicTimer !== undefined) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = undefined;
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType, volume: number): void {
    if (!this.soundEnabled || this.breakMuted) return;
    if (!this.context || !this.master) return;
    void this.context.resume();

    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
