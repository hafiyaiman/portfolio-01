import type { Telemetry } from "../stores/useGameStore";
import { tireMix } from "./tireMix";

type Voice = { source: OscillatorNode; gain: GainNode };
type Noise = { source: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode };
type SoundFrame = Telemetry & { resetId: number; softResetId: number; paused: boolean };
type SampleKey = "flutterMain" | "flutterShort" | "redline" | "tireSlide";

/**
 * Generate asymmetric soft-clipping saturation curve for realistic
 * straight-pipe exhaust roar and combustion bark under throttle load.
 */
function makeDriveCurve(samples = 512): Float32Array<ArrayBuffer> {
  const buffer = new ArrayBuffer(samples * 4);
  const curve = new Float32Array(buffer);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    // Cubic saturation with mild odd/even harmonic coloring:
    curve[i] = Math.tanh(1.85 * x) + 0.12 * Math.tanh(3.2 * x * x) * Math.sign(x);
  }
  return curve;
}

/**
 * Generate stick-slip friction curve for textured asphalt tire sliding.
 */
function makeTireFrictionCurve(samples = 256): Float32Array<ArrayBuffer> {
  const buffer = new ArrayBuffer(samples * 4);
  const curve = new Float32Array(buffer);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = Math.tanh(2.5 * x) * 0.85 + 0.15 * Math.sin(x * Math.PI * 3);
  }
  return curve;
}

/**
 * Procedural SR20DET Silvia S15 sound engine:
 * - Firing harmonics + crank sub-bass + mechanical valvetrain
 * - WaveShaper exhaust bark & straight-pipe resonance
 * - Turbo spool whistle & induction whoosh
 * - Multi-chop metallic 'stu-tu-tu-tu' compressor surge flutter
 * - Multi-layered asphalt tire friction & stick-slip drift scream (no fake sine beeps)
 */
export class VehicleSound {
  readonly context: AudioContext;
  private master: GainNode;
  private engineBus: GainNode;
  private driveNode: WaveShaperNode;
  private exhaustFilter: BiquadFilterNode;
  private exhaustBass: BiquadFilterNode;
  private exhaustBark: BiquadFilterNode;
  private firing: Voice;
  private sub: Voice;
  private mechanical: Voice;
  private turboWhistle: Voice;
  private turboWhistle2: Voice;
  private intakeWhoosh: Noise;

  // Realistic drift tire friction layers:
  private tireRumble: Noise;
  private tireTear: Noise;
  private tireScreech: Noise;
  private tireSizzle: Noise;
  private tireShaper: WaveShaperNode;
  private tireFlutterLFO: Voice;

  private flutterBus: GainNode;
  private tireBus: GainNode;
  private noiseBuffer: AudioBuffer;
  private nodes: AudioNode[] = [];
  private sources: AudioScheduledSourceNode[] = [];
  private transients = new Set<AudioScheduledSourceNode>();
  private previous?: SoundFrame;
  private shiftUntil = 0;
  private lastPop = -10;
  private lastFlutter = -10;
  private lastLimiterPop = -10;
  private wasActive = false;

  // ─── Real Audio Sample Buffers & Voices (T28 Dose Flutter, Drift Tire) ──
  private disposed = false;
  private buffers: Partial<Record<SampleKey, AudioBuffer>> = {};
  private tireSlideLoop?: { source: AudioBufferSourceNode; gain: GainNode };

  constructor(context: AudioContext) {
    this.context = context;

    // Master bus & compressor
    const compressor = this.track(context.createDynamicsCompressor());
    compressor.threshold.value = -14;
    compressor.knee.value = 10;
    compressor.ratio.value = 4.5;
    compressor.attack.value = 0.002;
    compressor.release.value = 0.15;

    this.master = this.track(context.createGain());
    this.master.gain.value = 0;
    compressor.connect(this.master).connect(context.destination);

    const highpass = this.track(context.createBiquadFilter());
    highpass.type = "highpass";
    highpass.frequency.value = 24;
    highpass.connect(compressor);

    // 4-second noise buffer for textures
    this.noiseBuffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
    const noiseData = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }

    // ─── SR20DET Engine Chain ──────────────────────────────────────────
    this.engineBus = this.track(context.createGain());
    this.engineBus.gain.value = 0.72;

    this.driveNode = this.track(context.createWaveShaper());
    this.driveNode.curve = makeDriveCurve();
    this.driveNode.oversample = "2x";

    this.exhaustFilter = this.track(context.createBiquadFilter());
    this.exhaustFilter.type = "lowpass";
    this.exhaustFilter.frequency.value = 1100;
    this.exhaustFilter.Q.value = 0.9;

    // Deep exhaust manifold rumble (160 Hz)
    this.exhaustBass = this.track(context.createBiquadFilter());
    this.exhaustBass.type = "peaking";
    this.exhaustBass.frequency.value = 165;
    this.exhaustBass.Q.value = 1.6;
    this.exhaustBass.gain.value = 6;

    // Straight-pipe metallic rasp & bark (1.2 kHz - 2.8 kHz under load)
    this.exhaustBark = this.track(context.createBiquadFilter());
    this.exhaustBark.type = "peaking";
    this.exhaustBark.frequency.value = 1350;
    this.exhaustBark.Q.value = 2.1;
    this.exhaustBark.gain.value = 4;

    this.engineBus
      .connect(this.driveNode)
      .connect(this.exhaustFilter)
      .connect(this.exhaustBass)
      .connect(this.exhaustBark)
      .connect(highpass);

    // Subtle acoustic exhaust reflection delay
    const reflection = this.track(context.createDelay(0.2));
    reflection.delayTime.value = 0.048;
    const reflectionGain = this.track(context.createGain());
    reflectionGain.gain.value = 0.18;
    this.exhaustBark.connect(reflection).connect(reflectionGain).connect(highpass);

    // Custom SR20DET cylinder firing harmonic spectrum (firing frequency = RPM / 30)
    this.firing = this.oscillator(this.engineBus, "sine", 32, 0.42);
    const real = new Float32Array(48);
    const imaginary = new Float32Array(48);
    // Real SR20DET straight-pipe harmonic distribution measured from reference video:
    imaginary[1] = 1.0;   // 1st harmonic: fundamental combustion pulse
    imaginary[2] = 0.82;  // 2nd harmonic: dominant inline-4 exhaust pulse
    imaginary[3] = 0.32;  // 3rd harmonic: unequal runner metallic rasp
    imaginary[4] = 0.16;  // 4th harmonic: cylinder pair overlap
    imaginary[5] = 0.08;
    imaginary[6] = 0.12;  // 6th harmonic resonance
    imaginary[7] = 0.04;
    imaginary[8] = 0.06;
    for (let i = 9; i < 48; i++) {
      imaginary[i] = (0.24 / Math.pow(i, 0.75)) * (i % 2 === 0 ? 1.2 : 0.6);
    }
    for (let i = 1; i < 48; i++) {
      real[i] = Math.sin(i * 1.5) * imaginary[i] * 0.22;
    }
    this.firing.source.setPeriodicWave(context.createPeriodicWave(real, imaginary));

    // Crankshaft rotation sub-bass (RPM / 60)
    this.sub = this.oscillator(this.engineBus, "triangle", 16, 0.24);

    // Valvetrain & camshaft mechanical chatter
    this.mechanical = this.oscillator(highpass, "triangle", 96, 0.03);

    // Garrett ball-bearing turbo whistle (dual detuned high-pitch resonance)
    this.turboWhistle = this.oscillator(highpass, "sine", 1800, 0);
    this.turboWhistle2 = this.oscillator(highpass, "sine", 1824, 0);

    // High-flow intercooler intake whoosh
    this.intakeWhoosh = this.noise(this.engineBus, "bandpass", 750, 1.2);

    // Subtle combustion cycle detuning flutter
    const engineDetuneLFO = this.oscillator(this.firing.source.detune, "sine", 21, 9);
    engineDetuneLFO.gain.connect(this.sub.source.detune);

    // ─── Realistic Drift Tire Friction System ───────────────────────────
    const tireBus = this.track(context.createGain());
    tireBus.gain.value = 1.0;
    tireBus.connect(highpass);

    this.tireShaper = this.track(context.createWaveShaper());
    this.tireShaper.curve = makeTireFrictionCurve();
    this.tireShaper.oversample = "2x";
    this.tireShaper.connect(tireBus);

    // 1. Asphalt aggregate rumble (coarse road surface tear)
    this.tireRumble = this.noise(tireBus, "bandpass", 420, 1.2);

    // 2. Rubber compound shearing & tearing (driven through non-linear shaper)
    this.tireTear = this.noise(this.tireShaper, "bandpass", 1350, 1.8);

    // 3. Resonant stick-slip screaming squeal (broadband noise through dual resonant bands)
    this.tireScreech = this.noise(this.tireShaper, "bandpass", 2300, 4.2);

    // 4. Burning rubber smoke sizzle (fine grain high-frequency hiss)
    this.tireSizzle = this.noise(tireBus, "highpass", 3600, 0.7);

    // Stick-slip micro-chatter modulation
    this.tireFlutterLFO = this.oscillator(this.tireScreech.filter.frequency, "sine", 48, 85);
    this.tireFlutterLFO.gain.connect(this.tireTear.filter.frequency);

    // ─── Turbo Flutter Bus ─────────────────────────────────────────────
    this.flutterBus = this.track(context.createGain());
    this.flutterBus.gain.value = 1.0;
    this.flutterBus.connect(compressor);

    this.tireBus = tireBus;
    void this.loadAudioSamples();
  }

  private async loadAudioSamples() {
    const urls: Record<SampleKey, string> = {
      flutterMain: "/audio/s15_flutter_main.mp3",
      flutterShort: "/audio/s15_flutter_short.mp3",
      redline: "/audio/s15_redline.mp3",
      tireSlide: "/audio/tire_slide.mp3",
    };

    for (const [k, url] of Object.entries(urls)) {
      const key = k as SampleKey;
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const arrayBuf = await res.arrayBuffer();
        if (this.disposed) return;
        const audioBuf = await this.context.decodeAudioData(arrayBuf);
        if (this.disposed) return;
        this.buffers[key] = audioBuf;

        if (key === "tireSlide") {
          this.initLoopNode(this.seamlessTireBuffer(audioBuf), (src, gn) => {
            gn.gain.value = 0;
            const lowpass = this.track(this.context.createBiquadFilter());
            lowpass.type = "lowpass";
            lowpass.frequency.value = 3800;
            const highpass = this.track(this.context.createBiquadFilter());
            highpass.type = "highpass";
            highpass.frequency.value = 350;
            src.connect(highpass).connect(lowpass).connect(gn).connect(this.tireBus);
            this.tireSlideLoop = { source: src, gain: gn };
          });
        }
      } catch (err) {
        console.warn(`[VehicleSound] Failed to load ${key}:`, err);
      }
    }
  }

  private seamlessTireBuffer(buffer: AudioBuffer) {
    const overlap = Math.min(Math.floor(buffer.sampleRate * 0.12), Math.floor(buffer.length / 4));
    if (overlap < 2) return buffer;
    const length = buffer.length - overlap;
    const loop = this.context.createBuffer(buffer.numberOfChannels, length, buffer.sampleRate);
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const input = buffer.getChannelData(channel), output = loop.getChannelData(channel);
      output.set(input.subarray(0, length));
      // Blend the end into the beginning so playback can wrap without a click.
      for (let i = 0; i < overlap; i++) {
        const phase = i / (overlap - 1) * Math.PI / 2;
        output[i] = input[length + i] * Math.cos(phase) + input[i] * Math.sin(phase);
      }
    }
    return loop;
  }

  private initLoopNode(
    buffer: AudioBuffer,
    onReady: (source: AudioBufferSourceNode, gain: GainNode) => void
  ) {
    if (this.disposed) return;
    try {
      const source = this.track(this.context.createBufferSource());
      source.buffer = buffer;
      source.loop = true;
      const gain = this.track(this.context.createGain());
      onReady(source, gain);
      source.start(0);
      this.sources.push(source);
    } catch {}
  }

  private track<T extends AudioNode>(node: T): T { this.nodes.push(node); return node; }

  private oscillator(destination: AudioNode | AudioParam, type: OscillatorType, frequency: number, volume: number): Voice {
    const source = this.track(this.context.createOscillator());
    const gain = this.track(this.context.createGain());
    source.type = type;
    source.frequency.value = frequency;
    gain.gain.value = volume;
    source.connect(gain);
    if (destination instanceof AudioNode) gain.connect(destination); else gain.connect(destination);
    source.start();
    this.sources.push(source);
    return { source, gain };
  }

  private noise(destination: AudioNode, type: BiquadFilterType, frequency: number, q: number): Noise {
    const source = this.track(this.context.createBufferSource());
    const filter = this.track(this.context.createBiquadFilter());
    const gain = this.track(this.context.createGain());
    source.buffer = this.noiseBuffer;
    source.loop = true;
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(destination);
    source.start(0, Math.random() * 2);
    this.sources.push(source);
    return { source, filter, gain };
  }

  private smooth(param: AudioParam, value: number, time = 0.055) {
    param.setTargetAtTime(value, this.context.currentTime, time);
  }

  /**
   * Metallic exhaust pop & anti-lag crackle on lift-off or gear shifts.
   */
  private exhaustCrackle(frequency: number, volume: number, duration: number, offset = 0) {
    if (this.transients.size >= 16) return;
    const now = this.context.currentTime + offset;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();

    source.buffer = this.noiseBuffer;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(frequency, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, frequency * 0.25), now + duration);
    filter.Q.value = 1.4;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter).connect(gain).connect(this.engineBus);
    this.transients.add(source);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
      this.transients.delete(source);
    };
    source.start(now, Math.random() * 2);
    source.stop(now + duration + 0.02);
  }

  /**
   * Authentic SR20DET T28 compressor surge flutter ("stu-tu-tu-tu-tu-tu").
   * Directly uses real S15 T28 recorded dose audio when available.
   */
  private turboFlutter(boost: number) {
    if (this.transients.size >= 16) return;
    const sample = boost > 0.42
      ? (this.buffers.flutterMain ?? this.buffers.flutterShort)
      : (this.buffers.flutterShort ?? this.buffers.flutterMain);

    if (sample) {
      try {
        const source = this.context.createBufferSource();
        source.buffer = sample;
        source.playbackRate.value = Math.max(0.85, Math.min(1.15, 0.94 + boost * 0.1 + (Math.random() * 0.04 - 0.02)));
        const gain = this.context.createGain();
        const vol = Math.min(1.35, 0.55 + boost * 0.75);
        gain.gain.value = vol;

        source.connect(gain).connect(this.flutterBus);
        this.transients.add(source);
        source.onended = () => {
          try {
            source.disconnect();
            gain.disconnect();
          } catch {}
          this.transients.delete(source);
        };
        source.start(0);
        return;
      } catch {}
    }

    this.turboFlutterProcedural(boost);
  }

  private turboFlutterProcedural(boost: number) {
    if (this.transients.size >= 16) return;
    const now = this.context.currentTime;
    const boostClamped = Math.max(0.12, Math.min(1.0, boost));
    const count = Math.max(4, Math.min(8, Math.round(4 + boostClamped * 4)));

    let offset = 0;
    for (let i = 0; i < count; i++) {
      const chopTime = now + offset;
      // Exponential decay envelope across the chops
      const chopGain = Math.min(1.0, 0.85 * boostClamped * Math.exp(-i * 0.38));
      const chopDuration = Math.max(0.038, 0.058 - i * 0.003);

      // Layer 1: Resonant metallic blade chirp (descending pitch per chop)
      const chirp = this.context.createOscillator();
      const chirpFilter = this.context.createBiquadFilter();
      const chirpGain = this.context.createGain();

      chirp.type = i === 0 ? "sine" : "triangle";
      const startFreq = (2350 - i * 85) * (0.95 + boostClamped * 0.18);
      const endFreq = Math.max(780, startFreq * 0.46);

      chirp.frequency.setValueAtTime(startFreq, chopTime);
      chirp.frequency.exponentialRampToValueAtTime(endFreq, chopTime + chopDuration);

      chirpFilter.type = "bandpass";
      chirpFilter.frequency.setValueAtTime(startFreq, chopTime);
      chirpFilter.frequency.exponentialRampToValueAtTime(endFreq, chopTime + chopDuration);
      chirpFilter.Q.value = 6.0;

      chirpGain.gain.setValueAtTime(0.001, chopTime);
      chirpGain.gain.linearRampToValueAtTime(chopGain * 0.48, chopTime + 0.004);
      chirpGain.gain.exponentialRampToValueAtTime(0.001, chopTime + chopDuration);

      chirp.connect(chirpFilter).connect(chirpGain).connect(this.flutterBus);
      this.transients.add(chirp);
      chirp.onended = () => {
        chirp.disconnect();
        chirpFilter.disconnect();
        chirpGain.disconnect();
        this.transients.delete(chirp);
      };
      chirp.start(chopTime);
      chirp.stop(chopTime + chopDuration + 0.01);

      // Layer 2: Pressurized air pulsation (whoosh noise burst)
      const noise = this.context.createBufferSource();
      const noiseFilter = this.context.createBiquadFilter();
      const noiseGain = this.context.createGain();

      noise.buffer = this.noiseBuffer;
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(1900 * Math.pow(0.95, i), chopTime);
      noiseFilter.frequency.exponentialRampToValueAtTime(700, chopTime + chopDuration);
      noiseFilter.Q.value = 3.5;

      noiseGain.gain.setValueAtTime(0.001, chopTime);
      noiseGain.gain.linearRampToValueAtTime(chopGain * 0.52, chopTime + 0.005);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, chopTime + chopDuration);

      noise.connect(noiseFilter).connect(noiseGain).connect(this.flutterBus);
      this.transients.add(noise);
      noise.onended = () => {
        noise.disconnect();
        noiseFilter.disconnect();
        noiseGain.disconnect();
        this.transients.delete(noise);
      };
      noise.start(chopTime, Math.random() * 2);
      noise.stop(chopTime + chopDuration + 0.015);

      // Layer 3: Low-frequency intake runner thud on first 3 chops
      if (i < 3) {
        const thud = this.context.createOscillator();
        const thudGain = this.context.createGain();
        thud.type = "sine";
        thud.frequency.setValueAtTime(260 - i * 35, chopTime);
        thud.frequency.exponentialRampToValueAtTime(95, chopTime + 0.045);

        thudGain.gain.setValueAtTime(0.001, chopTime);
        thudGain.gain.linearRampToValueAtTime(chopGain * 0.32, chopTime + 0.003);
        thudGain.gain.exponentialRampToValueAtTime(0.001, chopTime + 0.045);

        thud.connect(thudGain).connect(this.flutterBus);
        this.transients.add(thud);
        thud.onended = () => {
          thud.disconnect();
          thudGain.disconnect();
          this.transients.delete(thud);
        };
        thud.start(chopTime);
        thud.stop(chopTime + 0.05);
      }

      // Rhythmic surge timing: fast initial chop (~46ms), stretching slightly as boost vents
      offset += 0.046 + i * 0.0045;
    }
  }

  update(state: SoundFrame, volume: number, muted: boolean) {
    const now = this.context.currentTime;
    const active = !state.paused && !muted && volume > 0;
    this.smooth(this.master.gain, active ? volume * 0.82 : 0, 0.025);

    const reset = this.previous?.resetId !== state.resetId || this.previous?.softResetId !== state.softResetId;
    if (reset) {
      this.shiftUntil = 0;
      this.lastFlutter = -10;
      this.stopBursts();
    }

    if (active && this.wasActive && !reset && this.previous && !this.previous.paused) {
      const prevThrottle = this.previous.throttle;
      const currThrottle = state.throttle;
      const prevBoost = this.previous.boost;

      // Throttle lift-off detection (responsive trigger for turbo flutter)
      const lifted = (prevThrottle - currThrottle > 0.32 || (prevThrottle > 0.45 && currThrottle < 0.22));
      const shifted = state.gear > 0 && this.previous.gear > 0 && state.gear !== this.previous.gear;

      // Turbo flutter trigger: whenever lifting off with built boost or shifting under boost
      if ((lifted || shifted) && (prevBoost > 0.12 || state.boost > 0.12) && now - this.lastFlutter > 0.38) {
        this.lastFlutter = now;
        this.turboFlutter(Math.max(prevBoost, state.boost));
      }

      // Gear shift ignition cut & transmission clunk
      if (state.gear !== this.previous.gear) {
        this.shiftUntil = now + 0.12;
        this.exhaustCrackle(380, 0.38, 0.07);
        if (state.throttle > 0.35) {
          this.exhaustCrackle(175, 0.58, 0.09, 0.09);
        }
      }

      // High-RPM overrun exhaust backfire pops & crackles
      if (prevThrottle > 0.65 && currThrottle < 0.2 && state.rpm > 3100 && now - this.lastPop > 0.6) {
        this.lastPop = now;
        this.exhaustCrackle(1950, 0.38, 0.22);
        this.exhaustCrackle(135, 0.42, 0.08, 0.06);
        this.exhaustCrackle(240, 0.26, 0.07, 0.16);
      }
    }

    if (!active) this.stopBursts();

    // Ignition cut on shifts
    const cut = now < this.shiftUntil ? 0.2 : 1;
    const rpm = Math.max(850, Math.min(7800, state.rpm));
    const rawThrottle = Math.max(0, Math.min(1, state.throttle));
    const load = rawThrottle * cut;

    // Firing frequency: four cylinders, two firings per revolution (f = RPM / 30)
    const firingHz = rpm / 30;
    this.smooth(this.firing.source.frequency, firingHz, 0.035);
    this.smooth(this.sub.source.frequency, rpm / 60, 0.04);
    this.smooth(this.mechanical.source.frequency, firingHz * 3, 0.045);

    // ─── Authentic Throttle Load Dynamics ─────────────────────────────
    // Idle vs Power Stroke vs Overrun Deceleration:
    // When throttle is released: volume drops immediately to quiet overrun burble (no fake revs!)
    // When throttle is pressed: volume roars up with straight-pipe bark
    const isIdle = rpm < 1300 && load < 0.12;
    const isOverrun = !isIdle && load < 0.06;

    let firingVol: number;
    let subVol: number;
    if (isIdle) {
      firingVol = 0.22; // Deep, calm 4-cylinder idle pulse
      subVol = 0.20;
    } else if (isOverrun) {
      firingVol = 0.11 * cut; // Quiet off-throttle deceleration burble
      subVol = 0.09 * cut;
    } else {
      firingVol = (0.16 + load * 0.52 + (rpm / 7600) * 0.14) * cut; // Aggressive on-boost power roar
      subVol = (0.10 + load * 0.22 + (rpm / 7600) * 0.12) * cut;
    }

    this.smooth(this.firing.gain.gain, firingVol, 0.03);
    this.smooth(this.sub.gain.gain, subVol, 0.03);
    this.smooth(this.mechanical.gain.gain, (0.01 + load * 0.03 + (rpm / 7600) * 0.02) * cut, 0.03);

    // Exhaust filters: open aggressively under load to let the straight-pipe bark roar
    // When off-throttle, filter closes down to 320 Hz for quiet deceleration
    const exhaustFreq = 320 + (rpm / 7600) * 280 + Math.pow(load, 0.75) * 2900;
    this.smooth(this.exhaustFilter.frequency, exhaustFreq, 0.035);
    this.smooth(this.exhaustBass.frequency, 135 + (rpm / 7600) * 75, 0.04);
    this.smooth(this.exhaustBark.frequency, 1050 + load * 1100 + (rpm / 7600) * 500, 0.04);
    this.smooth(this.exhaustBark.gain, 2.0 + load * 8.5, 0.035);

    // ─── Redline Rev Limiter (2-step ignition cut bounce at 7550+ RPM) ──
    if (rpm >= 7550 && rawThrottle > 0.6 && now - this.lastLimiterPop > 0.052) {
      this.lastLimiterPop = now;
      this.exhaustCrackle(1850 + Math.random() * 400, 0.55, 0.035);
      this.exhaustCrackle(160, 0.65, 0.05, 0.01);
    }

    // Turbo spool whistle & induction sound
    const boost = Math.max(0, Math.min(1, state.boost));
    const whistleFreq = 1600 + boost * 3200;
    this.smooth(this.turboWhistle.source.frequency, whistleFreq, 0.12);
    this.smooth(this.turboWhistle2.source.frequency, whistleFreq * 1.018, 0.12);
    const whistleVol = Math.pow(boost, 1.3) * (0.05 + load * 0.07);
    this.smooth(this.turboWhistle.gain.gain, whistleVol, 0.08);
    this.smooth(this.turboWhistle2.gain.gain, whistleVol * 0.75, 0.08);

    // Induction air rushing into the intercooler
    this.smooth(this.intakeWhoosh.filter.frequency, 400 + rpm * 0.22 + boost * 1400);
    this.smooth(this.intakeWhoosh.gain.gain, (0.01 + load * 0.16 + boost * 0.12) * cut);

    // ─── Real Recorded Asphalt Drift Sliding ───────────────────────────
    const { slip, speed, intensity: driftIntensity, playbackRate } = tireMix(state, active && !reset);
    const fade = driftIntensity > 0 ? 0.07 : 0.12;

    if (this.tireSlideLoop) {
      this.smooth(this.tireSlideLoop.source.playbackRate, playbackRate, 0.16);
      this.smooth(this.tireSlideLoop.gain.gain, driftIntensity * 0.55, fade);
    }

    // Asphalt aggregate rumble (coarse road surface grind)
    this.smooth(this.tireRumble.gain.gain, driftIntensity * 0.05, fade);
    this.smooth(this.tireRumble.filter.frequency, 320 + slip * 380 + speed * 4);

    // Mute synthetic screech when real tire slide sample is loaded
    const hasTireSample = !!this.tireSlideLoop;
    const screechVol = hasTireSample
      ? 0
      : driftIntensity * 0.22;
    this.smooth(this.tireScreech.gain.gain, screechVol, fade);
    this.smooth(this.tireTear.gain.gain, hasTireSample ? 0 : driftIntensity * 0.15, fade);

    // Smoke sizzle on deep angle slides
    const sizzleVol = hasTireSample ? 0 : driftIntensity * 0.025;
    this.smooth(this.tireSizzle.gain.gain, sizzleVol, fade);

    this.previous = { ...state };
    this.wasActive = active;
  }

  private stopBursts() {
    for (const source of this.transients) {
      try {
        source.stop();
      } catch {}
    }
    this.transients.clear();
  }

  dispose() {
    this.disposed = true;
    this.stopBursts();
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {}
    }
    for (const node of this.nodes) {
      try {
        node.disconnect();
      } catch {}
    }
    void this.context.close().catch(() => {});
  }
}
