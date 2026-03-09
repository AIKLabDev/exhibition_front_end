import fs from 'node:fs';
import path from 'node:path';

const SAMPLE_RATE = 44100;
const MASTER_GAIN = 0.82;

const NOTE_INDEX = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(a, b, value) {
  const x = clamp((value - a) / Math.max(0.000001, b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

function midiToFreq(midi) {
  return 440 * (2 ** ((midi - 69) / 12));
}

function noteToFreq(note) {
  const match = /^([A-G](?:#|b)?)(-?\d)$/.exec(note);
  if (!match) throw new Error(`Invalid note: ${note}`);

  const [, name, octaveText] = match;
  const octave = Number(octaveText);
  const midi = NOTE_INDEX[name] + (octave + 1) * 12;
  return midiToFreq(midi);
}

function createStereoBuffer(durationSec) {
  const length = Math.max(1, Math.floor(durationSec * SAMPLE_RATE));
  return {
    left: new Float32Array(length),
    right: new Float32Array(length),
    length,
  };
}

function createNoise(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return (state / 0xffffffff) * 2 - 1;
  };
}

function panGains(pan) {
  const clamped = clamp(pan, -1, 1);
  const left = Math.sqrt((1 - clamped) * 0.5);
  const right = Math.sqrt((1 + clamped) * 0.5);
  return [left, right];
}

function oscSample(wave, phase) {
  const wrapped = phase % (Math.PI * 2);
  if (wave === 'triangle') return (2 / Math.PI) * Math.asin(Math.sin(wrapped));
  if (wave === 'square') return Math.sign(Math.sin(wrapped));
  if (wave === 'saw') return 1 - 2 * (wrapped / (Math.PI * 2));
  if (wave === 'softsaw') return 0.62 * (1 - 2 * (wrapped / (Math.PI * 2))) + 0.38 * Math.sin(wrapped);
  return Math.sin(wrapped);
}

function mixSample(buffer, index, sample, pan = 0) {
  if (index < 0 || index >= buffer.length) return;
  const [leftGain, rightGain] = panGains(pan);
  buffer.left[index] += sample * leftGain;
  buffer.right[index] += sample * rightGain;
}

function addTone(buffer, startSec, durationSec, startFreq, options = {}) {
  const {
    endFreq = startFreq,
    volume = 0.2,
    wave = 'sine',
    attack = 0.01,
    release = 0.08,
    decay = 0,
    panStart = 0,
    panEnd = panStart,
    vibratoHz = 0,
    vibratoDepth = 0,
    tremoloHz = 0,
    tremoloDepth = 0,
    drive = 0,
    phaseOffset = 0,
  } = options;

  const start = Math.max(0, Math.floor(startSec * SAMPLE_RATE));
  const length = Math.max(1, Math.floor(durationSec * SAMPLE_RATE));
  const end = Math.min(buffer.length, start + length);

  let phase = phaseOffset;
  for (let i = start; i < end; i += 1) {
    const localIndex = i - start;
    const t = localIndex / SAMPLE_RATE;
    const normalized = t / Math.max(durationSec, 0.000001);
    const freqBase = startFreq * ((endFreq / Math.max(0.0001, startFreq)) ** normalized);
    const vibrato = vibratoHz > 0 ? Math.sin(Math.PI * 2 * vibratoHz * t) * vibratoDepth : 0;
    const currentFreq = Math.max(1, freqBase * (1 + vibrato));
    phase += (Math.PI * 2 * currentFreq) / SAMPLE_RATE;

    let env = 1;
    if (attack > 0) env *= smoothstep(0, attack, t);
    if (release > 0) env *= 1 - smoothstep(durationSec - release, durationSec, t);
    if (decay > 0) env *= Math.exp(-decay * normalized);
    if (tremoloHz > 0 && tremoloDepth > 0) {
      env *= 1 - tremoloDepth + tremoloDepth * ((Math.sin(Math.PI * 2 * tremoloHz * t) + 1) * 0.5);
    }

    let sample = oscSample(wave, phase) * volume * env;
    if (drive > 0) {
      sample = Math.tanh(sample * (1 + drive * 12)) / Math.tanh(1 + drive * 12);
    }

    const pan = panStart + (panEnd - panStart) * normalized;
    mixSample(buffer, i, sample, pan);
  }
}

function addNoise(buffer, startSec, durationSec, options = {}) {
  const {
    volume = 0.1,
    attack = 0.001,
    release = 0.05,
    decay = 0,
    seed = 1,
    lowpass = 0.2,
    highpass = 0,
    panStart = 0,
    panEnd = panStart,
  } = options;

  const start = Math.max(0, Math.floor(startSec * SAMPLE_RATE));
  const length = Math.max(1, Math.floor(durationSec * SAMPLE_RATE));
  const end = Math.min(buffer.length, start + length);
  const rand = createNoise(seed);

  let low = 0;
  let lowForHigh = 0;
  for (let i = start; i < end; i += 1) {
    const localIndex = i - start;
    const t = localIndex / SAMPLE_RATE;
    const normalized = t / Math.max(durationSec, 0.000001);
    const raw = rand();

    low += (raw - low) * clamp(lowpass, 0.001, 1);
    lowForHigh += (raw - lowForHigh) * clamp(highpass || 0.001, 0.001, 1);

    let sample = low;
    if (highpass > 0) {
      sample = raw - lowForHigh;
    }

    let env = 1;
    if (attack > 0) env *= smoothstep(0, attack, t);
    if (release > 0) env *= 1 - smoothstep(durationSec - release, durationSec, t);
    if (decay > 0) env *= Math.exp(-decay * normalized);

    const pan = panStart + (panEnd - panStart) * normalized;
    mixSample(buffer, i, sample * volume * env, pan);
  }
}

function addDrone(buffer, startSec, durationSec, notes, options = {}) {
  const {
    volume = 0.18,
    wave = 'softsaw',
    panSpread = 0.28,
    vibratoHz = 0.18,
    vibratoDepth = 0.01,
    attack = 0.25,
    release = 0.45,
    drive = 0.08,
  } = options;

  notes.forEach((note, index) => {
    const freq = typeof note === 'number' ? note : noteToFreq(note);
    const position = notes.length === 1 ? 0 : index / (notes.length - 1);
    const pan = (position - 0.5) * 2 * panSpread;
    addTone(buffer, startSec, durationSec, freq, {
      endFreq: freq * 0.995,
      volume: volume / notes.length,
      wave,
      attack,
      release,
      vibratoHz: vibratoHz + index * 0.05,
      vibratoDepth,
      panStart: pan,
      panEnd: -pan * 0.35,
      drive,
      decay: 0.18,
      phaseOffset: index * 0.4,
    });
  });
}

function addBoom(buffer, startSec, options = {}) {
  const {
    duration = 0.55,
    startFreq = 95,
    endFreq = 40,
    volume = 0.45,
    pan = 0,
  } = options;

  addTone(buffer, startSec, duration, startFreq, {
    endFreq,
    wave: 'sine',
    volume,
    attack: 0.002,
    release: duration * 0.5,
    decay: 5.2,
    panStart: pan,
    panEnd: pan * 0.2,
  });

  addTone(buffer, startSec, duration * 0.7, startFreq * 1.8, {
    endFreq: endFreq * 1.5,
    wave: 'triangle',
    volume: volume * 0.28,
    attack: 0.001,
    release: duration * 0.35,
    decay: 7.2,
    panStart: pan * 0.4,
    panEnd: pan * 0.1,
  });
}

function addHeartbeat(buffer, startSec, volume = 0.26) {
  addBoom(buffer, startSec, { duration: 0.22, startFreq: 82, endFreq: 48, volume });
  addBoom(buffer, startSec + 0.34, { duration: 0.18, startFreq: 72, endFreq: 42, volume: volume * 0.8 });
}

function addImpact(buffer, startSec, options = {}) {
  const {
    bodyFreq = 140,
    endFreq = 55,
    volume = 0.34,
    pan = 0,
  } = options;

  addNoise(buffer, startSec, 0.065, {
    volume: volume * 0.9,
    attack: 0.001,
    release: 0.03,
    highpass: 0.24,
    seed: 900 + Math.floor(startSec * 1000),
    panStart: pan - 0.08,
    panEnd: pan + 0.08,
  });
  addBoom(buffer, startSec, {
    duration: 0.26,
    startFreq: bodyFreq,
    endFreq,
    volume: volume * 0.52,
    pan,
  });
  addTone(buffer, startSec + 0.01, 0.1, bodyFreq * 4.6, {
    endFreq: bodyFreq * 2.2,
    wave: 'triangle',
    volume: volume * 0.18,
    attack: 0.001,
    release: 0.05,
    decay: 8,
    panStart: pan + 0.12,
    panEnd: pan - 0.04,
  });
}

function addIndustrialHit(buffer, startSec, options = {}) {
  const {
    volume = 0.22,
    pan = 0,
  } = options;

  addNoise(buffer, startSec, 0.09, {
    volume: volume * 0.8,
    attack: 0.001,
    release: 0.05,
    highpass: 0.28,
    seed: 1337 + Math.floor(startSec * 100),
    panStart: pan - 0.15,
    panEnd: pan + 0.15,
  });
  addTone(buffer, startSec, 0.28, 830, {
    endFreq: 380,
    wave: 'triangle',
    volume: volume * 0.24,
    attack: 0.001,
    release: 0.22,
    decay: 4,
    panStart: pan + 0.18,
    panEnd: pan - 0.12,
  });
  addTone(buffer, startSec + 0.02, 0.32, 510, {
    endFreq: 210,
    wave: 'softsaw',
    volume: volume * 0.16,
    attack: 0.001,
    release: 0.24,
    decay: 3.8,
    panStart: pan - 0.18,
    panEnd: pan + 0.1,
  });
}

function addPianoHit(buffer, startSec, note, options = {}) {
  const {
    volume = 0.18,
    pan = 0,
    duration = 1.8,
  } = options;
  const freq = noteToFreq(note);

  addTone(buffer, startSec, duration, freq, {
    wave: 'triangle',
    volume,
    attack: 0.004,
    release: 0.34,
    decay: 2.4,
    panStart: pan,
    panEnd: pan * 0.5,
  });
  addTone(buffer, startSec, duration * 0.8, freq * 2, {
    wave: 'sine',
    volume: volume * 0.4,
    attack: 0.003,
    release: 0.26,
    decay: 3.8,
    panStart: pan - 0.05,
    panEnd: pan + 0.02,
  });
  addNoise(buffer, startSec, 0.02, {
    volume: volume * 0.08,
    attack: 0.001,
    release: 0.015,
    highpass: 0.25,
    seed: 5000 + Math.floor(freq),
    panStart: pan,
  });
}

function addStringStab(buffer, startSec, notes, options = {}) {
  const {
    volume = 0.24,
    duration = 1.2,
    pan = 0,
  } = options;

  notes.forEach((note, index) => {
    const freq = typeof note === 'number' ? note : noteToFreq(note);
    const spread = notes.length === 1 ? 0 : (index / (notes.length - 1) - 0.5) * 0.4;
    addTone(buffer, startSec, duration, freq, {
      endFreq: freq * 0.985,
      wave: 'softsaw',
      volume: volume / notes.length,
      attack: 0.02,
      release: 0.38,
      decay: 2.6,
      panStart: pan + spread,
      panEnd: pan + spread * 0.3,
      drive: 0.06,
    });
  });
}

function addRise(buffer, startSec, durationSec, options = {}) {
  const {
    volume = 0.12,
    seed = 1,
    pan = 0,
  } = options;

  addNoise(buffer, startSec, durationSec, {
    volume,
    attack: durationSec * 0.75,
    release: durationSec * 0.08,
    highpass: 0.22,
    seed,
    panStart: pan - 0.1,
    panEnd: pan + 0.1,
  });
  addTone(buffer, startSec + durationSec * 0.25, durationSec * 0.75, 150, {
    endFreq: 420,
    wave: 'triangle',
    volume: volume * 0.28,
    attack: durationSec * 0.38,
    release: durationSec * 0.12,
    panStart: pan - 0.15,
    panEnd: pan + 0.15,
  });
}

function addGroan(buffer, startSec, durationSec, options = {}) {
  const {
    baseFreq = 92,
    volume = 0.22,
    pan = 0,
    seed = 1,
  } = options;

  addTone(buffer, startSec, durationSec, baseFreq, {
    endFreq: baseFreq * 0.86,
    wave: 'softsaw',
    volume: volume * 0.5,
    attack: 0.08,
    release: 0.28,
    decay: 1.4,
    vibratoHz: 2.6,
    vibratoDepth: 0.025,
    panStart: pan - 0.1,
    panEnd: pan + 0.08,
    drive: 0.05,
  });
  addTone(buffer, startSec + 0.04, durationSec * 0.9, baseFreq * 2.15, {
    endFreq: baseFreq * 1.85,
    wave: 'triangle',
    volume: volume * 0.16,
    attack: 0.06,
    release: 0.22,
    decay: 1.8,
    vibratoHz: 3.5,
    vibratoDepth: 0.03,
    panStart: pan + 0.08,
    panEnd: pan - 0.08,
  });
  addNoise(buffer, startSec + 0.12, durationSec * 0.8, {
    volume: volume * 0.16,
    attack: 0.03,
    release: 0.18,
    decay: 2.2,
    lowpass: 0.045,
    seed,
    panStart: pan - 0.05,
    panEnd: pan + 0.05,
  });
}

function applyTapeSaturation(buffer, amount = 0.18) {
  for (let i = 0; i < buffer.length; i += 1) {
    const left = buffer.left[i];
    const right = buffer.right[i];
    buffer.left[i] = Math.tanh(left * (1 + amount * 8)) / Math.tanh(1 + amount * 8);
    buffer.right[i] = Math.tanh(right * (1 + amount * 8)) / Math.tanh(1 + amount * 8);
  }
}

function applyReverb(buffer, options = {}) {
  const {
    mix = 0.12,
    decay = 0.4,
    taps = [0.12, 0.19, 0.31, 0.47],
  } = options;

  const wetLeft = new Float32Array(buffer.length);
  const wetRight = new Float32Array(buffer.length);

  taps.forEach((tap, tapIndex) => {
    const delaySamples = Math.floor(tap * SAMPLE_RATE);
    const gain = decay / (tapIndex + 1);
    for (let i = delaySamples; i < buffer.length; i += 1) {
      wetLeft[i] += buffer.right[i - delaySamples] * gain;
      wetRight[i] += buffer.left[i - delaySamples] * gain;
    }
  });

  for (let i = 0; i < buffer.length; i += 1) {
    buffer.left[i] += wetLeft[i] * mix;
    buffer.right[i] += wetRight[i] * mix;
  }
}

function normalize(buffer, peak = 0.92) {
  let max = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    max = Math.max(max, Math.abs(buffer.left[i]), Math.abs(buffer.right[i]));
  }

  if (max < 0.000001) return;

  const gain = (peak / max) * MASTER_GAIN;
  for (let i = 0; i < buffer.length; i += 1) {
    buffer.left[i] = clamp(buffer.left[i] * gain, -1, 1);
    buffer.right[i] = clamp(buffer.right[i] * gain, -1, 1);
  }
}

function fadeEdges(buffer, seconds = 0.015) {
  const edgeSamples = Math.min(Math.floor(seconds * SAMPLE_RATE), Math.floor(buffer.length / 2));
  for (let i = 0; i < edgeSamples; i += 1) {
    const gain = smoothstep(0, edgeSamples, i);
    buffer.left[i] *= gain;
    buffer.right[i] *= gain;
    buffer.left[buffer.length - 1 - i] *= gain;
    buffer.right[buffer.length - 1 - i] *= gain;
  }
}

function finalize(buffer, options = {}) {
  applyTapeSaturation(buffer, options.drive ?? 0.16);
  applyReverb(buffer, options.reverb ?? {});
  fadeEdges(buffer, options.fadeSeconds ?? 0.018);
  normalize(buffer, options.peak ?? 0.92);
  return buffer;
}

function writeWavStereo(filePath, buffer) {
  const sampleCount = buffer.length;
  const dataLength = sampleCount * 4;
  const output = Buffer.alloc(44 + dataLength);

  output.write('RIFF', 0, 'ascii');
  output.writeUInt32LE(36 + dataLength, 4);
  output.write('WAVE', 8, 'ascii');
  output.write('fmt ', 12, 'ascii');
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(2, 22);
  output.writeUInt32LE(SAMPLE_RATE, 24);
  output.writeUInt32LE(SAMPLE_RATE * 4, 28);
  output.writeUInt16LE(4, 32);
  output.writeUInt16LE(16, 34);
  output.write('data', 36, 'ascii');
  output.writeUInt32LE(dataLength, 40);

  for (let i = 0; i < sampleCount; i += 1) {
    output.writeInt16LE(Math.round(clamp(buffer.left[i], -1, 1) * 32767), 44 + i * 4);
    output.writeInt16LE(Math.round(clamp(buffer.right[i], -1, 1) * 32767), 44 + i * 4 + 2);
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, output);
}

function generateTitleLoop() {
  const buffer = createStereoBuffer(16);

  addDrone(buffer, 0, 16, ['D2', 'A2', 'D3'], {
    volume: 0.22,
    wave: 'softsaw',
    panSpread: 0.22,
    vibratoHz: 0.12,
    vibratoDepth: 0.008,
    attack: 0.8,
    release: 0.8,
    drive: 0.04,
  });
  addDrone(buffer, 0, 16, ['Eb4', 'A4'], {
    volume: 0.05,
    wave: 'sine',
    panSpread: 0.45,
    vibratoHz: 0.2,
    vibratoDepth: 0.015,
    attack: 1.4,
    release: 1.2,
  });

  [0.7, 4.7, 8.7, 12.7].forEach((start, index) => {
    addHeartbeat(buffer, start, 0.22 + index * 0.015);
  });

  [
    [2.5, 'D4', -0.25],
    [5.8, 'F4', 0.22],
    [9.2, 'Eb4', -0.18],
    [12.6, 'D4', 0.18],
  ].forEach(([time, note, pan], index) => {
    addRise(buffer, time - 0.7, 0.55, { volume: 0.08, seed: 40 + index, pan });
    addPianoHit(buffer, time, note, { volume: 0.16, pan, duration: 2.1 });
    addIndustrialHit(buffer, time + 0.18, { volume: 0.12, pan: -pan * 0.5 });
  });

  addNoise(buffer, 0, 16, {
    volume: 0.014,
    attack: 1.2,
    release: 1.1,
    decay: 0.2,
    lowpass: 0.02,
    seed: 71,
    panStart: -0.2,
    panEnd: 0.2,
  });

  return finalize(buffer, {
    drive: 0.1,
    reverb: { mix: 0.18, decay: 0.5, taps: [0.16, 0.27, 0.39, 0.55] },
    peak: 0.9,
    fadeSeconds: 0.035,
  });
}

function generateBattleLoop() {
  const buffer = createStereoBuffer(16);
  const beatSec = 60 / 110;

  addDrone(buffer, 0, 16, ['D1', 'A1', 'D2'], {
    volume: 0.23,
    wave: 'softsaw',
    panSpread: 0.18,
    vibratoHz: 0.09,
    vibratoDepth: 0.006,
    attack: 0.35,
    release: 0.35,
    drive: 0.06,
  });

  addDrone(buffer, 0, 16, ['F3', 'Bb3'], {
    volume: 0.06,
    wave: 'sine',
    panSpread: 0.36,
    vibratoHz: 0.15,
    vibratoDepth: 0.009,
    attack: 0.5,
    release: 0.6,
  });

  for (let beat = 0; beat < 30; beat += 1) {
    const time = beat * beatSec;
    addBoom(buffer, time, {
      duration: beat % 4 === 0 ? 0.32 : 0.24,
      startFreq: beat % 4 === 0 ? 86 : 74,
      endFreq: 38,
      volume: beat % 4 === 0 ? 0.3 : 0.18,
    });
    if (beat % 2 === 1) {
      addNoise(buffer, time + beatSec * 0.42, 0.05, {
        volume: 0.08,
        attack: 0.001,
        release: 0.03,
        highpass: 0.28,
        seed: 200 + beat,
        panStart: beat % 4 === 1 ? -0.22 : 0.22,
      });
    }
  }

  const ostinato = [
    ['D2', 0.5], ['D2', 0.5], ['F2', 0.5], ['D2', 0.5],
    ['Bb1', 0.5], ['D2', 0.5], ['F2', 0.5], ['D2', 0.5],
    ['G1', 0.5], ['D2', 0.5], ['G2', 0.5], ['D2', 0.5],
    ['A1', 0.5], ['C2', 0.5], ['E2', 0.5], ['C2', 0.5],
  ];

  let cursorBeat = 0;
  ostinato.forEach(([note, beats], index) => {
    const start = cursorBeat * beatSec;
    const pan = index % 2 === 0 ? -0.08 : 0.08;
    addTone(buffer, start, beats * beatSec * 0.9, noteToFreq(note), {
      endFreq: noteToFreq(note) * 0.98,
      wave: 'triangle',
      volume: 0.12,
      attack: 0.01,
      release: 0.09,
      decay: 3.4,
      panStart: pan,
      panEnd: pan * 0.3,
    });
    cursorBeat += beats;
  });

  [0, 4.36, 8.72, 13.08].forEach((time, index) => {
    const chord = [
      ['D3', 'F3', 'A3'],
      ['Bb2', 'D3', 'F3'],
      ['G2', 'Bb2', 'D3'],
      ['A2', 'C3', 'E3'],
    ][index];
    addStringStab(buffer, time, chord, { volume: 0.18, duration: 1.05, pan: index % 2 === 0 ? -0.18 : 0.18 });
    addIndustrialHit(buffer, time + 0.26, { volume: 0.14, pan: index % 2 === 0 ? 0.16 : -0.16 });
  });

  addRise(buffer, 11.8, 1.8, { volume: 0.07, seed: 501, pan: 0.12 });
  addNoise(buffer, 0, 16, {
    volume: 0.015,
    attack: 0.2,
    release: 0.3,
    decay: 0.3,
    lowpass: 0.035,
    seed: 111,
    panStart: -0.15,
    panEnd: 0.15,
  });

  return finalize(buffer, {
    drive: 0.14,
    reverb: { mix: 0.11, decay: 0.34, taps: [0.11, 0.17, 0.25, 0.33] },
    peak: 0.92,
    fadeSeconds: 0.02,
  });
}

function generateBossWarning() {
  const buffer = createStereoBuffer(2.7);

  [0, 0.62, 1.24].forEach((time, index) => {
    addTone(buffer, time, 0.52, 520, {
      endFreq: 380,
      wave: 'softsaw',
      volume: 0.16,
      attack: 0.005,
      release: 0.1,
      tremoloHz: 6,
      tremoloDepth: 0.4,
      drive: 0.06,
      panStart: index % 2 === 0 ? -0.18 : 0.18,
      panEnd: 0,
    });
    addTone(buffer, time, 0.52, 310, {
      endFreq: 245,
      wave: 'triangle',
      volume: 0.12,
      attack: 0.005,
      release: 0.12,
      panStart: index % 2 === 0 ? 0.18 : -0.18,
      panEnd: 0,
    });
    addNoise(buffer, time, 0.12, {
      volume: 0.06,
      attack: 0.001,
      release: 0.06,
      highpass: 0.24,
      seed: 2000 + index,
    });
  });

  addBoom(buffer, 1.95, { duration: 0.85, startFreq: 70, endFreq: 26, volume: 0.5 });
  addStringStab(buffer, 1.92, ['D2', 'Eb2', 'A2'], { volume: 0.22, duration: 0.9 });

  return finalize(buffer, {
    drive: 0.16,
    reverb: { mix: 0.14, decay: 0.35, taps: [0.12, 0.19, 0.27, 0.42] },
    peak: 0.93,
    fadeSeconds: 0.012,
  });
}

function generateGunShot() {
  const buffer = createStereoBuffer(0.32);

  addNoise(buffer, 0, 0.045, {
    volume: 0.32,
    attack: 0.001,
    release: 0.02,
    highpass: 0.32,
    seed: 3001,
    panStart: -0.08,
    panEnd: 0.08,
  });
  addImpact(buffer, 0.005, { bodyFreq: 180, endFreq: 70, volume: 0.4 });
  addTone(buffer, 0.03, 0.16, 980, {
    endFreq: 420,
    wave: 'triangle',
    volume: 0.08,
    attack: 0.001,
    release: 0.08,
    decay: 6,
    panStart: 0.18,
    panEnd: -0.08,
  });

  return finalize(buffer, {
    drive: 0.22,
    reverb: { mix: 0.08, decay: 0.18, taps: [0.05, 0.08, 0.12] },
    peak: 0.96,
    fadeSeconds: 0.006,
  });
}

function generateZombieHit() {
  const buffer = createStereoBuffer(0.36);

  addImpact(buffer, 0, { bodyFreq: 140, endFreq: 48, volume: 0.42 });
  addNoise(buffer, 0.02, 0.15, {
    volume: 0.12,
    attack: 0.001,
    release: 0.09,
    lowpass: 0.08,
    seed: 410,
    panStart: -0.12,
    panEnd: 0.12,
  });
  addTone(buffer, 0.04, 0.22, 72, {
    endFreq: 42,
    wave: 'sine',
    volume: 0.1,
    attack: 0.002,
    release: 0.08,
    decay: 5.5,
  });

  return finalize(buffer, {
    drive: 0.16,
    reverb: { mix: 0.09, decay: 0.18, taps: [0.05, 0.09, 0.13] },
    peak: 0.94,
    fadeSeconds: 0.006,
  });
}

function generatePlayerDamage() {
  const buffer = createStereoBuffer(0.78);

  addImpact(buffer, 0, { bodyFreq: 165, endFreq: 50, volume: 0.38 });
  addBoom(buffer, 0.08, { duration: 0.6, startFreq: 66, endFreq: 31, volume: 0.32 });
  addTone(buffer, 0.16, 0.45, 104, {
    endFreq: 74,
    wave: 'softsaw',
    volume: 0.09,
    attack: 0.02,
    release: 0.18,
    decay: 2,
    tremoloHz: 4.4,
    tremoloDepth: 0.25,
  });
  addNoise(buffer, 0.01, 0.16, {
    volume: 0.08,
    attack: 0.001,
    release: 0.1,
    highpass: 0.22,
    seed: 555,
  });

  return finalize(buffer, {
    drive: 0.16,
    reverb: { mix: 0.1, decay: 0.22, taps: [0.07, 0.11, 0.18] },
    peak: 0.92,
    fadeSeconds: 0.008,
  });
}

function generateZombieSpawn() {
  const buffer = createStereoBuffer(0.94);

  addRise(buffer, 0, 0.38, { volume: 0.08, seed: 610, pan: -0.12 });
  addGroan(buffer, 0.28, 0.58, { baseFreq: 82, volume: 0.2, pan: 0.06, seed: 611 });
  addBoom(buffer, 0.33, { duration: 0.28, startFreq: 74, endFreq: 38, volume: 0.24 });
  addNoise(buffer, 0.3, 0.12, {
    volume: 0.08,
    attack: 0.001,
    release: 0.05,
    highpass: 0.18,
    seed: 612,
    panStart: 0.16,
    panEnd: -0.12,
  });

  return finalize(buffer, {
    drive: 0.14,
    reverb: { mix: 0.1, decay: 0.24, taps: [0.08, 0.12, 0.19] },
    peak: 0.9,
    fadeSeconds: 0.01,
  });
}

function generateZombieGroan() {
  const buffer = createStereoBuffer(1.7);
  addGroan(buffer, 0.05, 1.5, { baseFreq: 88, volume: 0.26, pan: -0.08, seed: 710 });
  addGroan(buffer, 0.18, 1.2, { baseFreq: 64, volume: 0.12, pan: 0.12, seed: 711 });
  addNoise(buffer, 0.22, 0.8, {
    volume: 0.04,
    attack: 0.04,
    release: 0.14,
    lowpass: 0.03,
    seed: 712,
    panStart: -0.12,
    panEnd: 0.12,
  });

  return finalize(buffer, {
    drive: 0.1,
    reverb: { mix: 0.15, decay: 0.35, taps: [0.11, 0.17, 0.26, 0.38] },
    peak: 0.9,
    fadeSeconds: 0.012,
  });
}

function generateVictory() {
  const buffer = createStereoBuffer(4);

  addStringStab(buffer, 0, ['D3', 'A3', 'D4', 'F4'], { volume: 0.28, duration: 2.2, pan: -0.1 });
  addStringStab(buffer, 0.95, ['F3', 'A3', 'C4', 'F4'], { volume: 0.22, duration: 1.8, pan: 0.12 });
  addStringStab(buffer, 1.8, ['D3', 'A3', 'D4', 'F#4'], { volume: 0.3, duration: 2.1, pan: 0 });
  addBoom(buffer, 0, { duration: 0.5, startFreq: 88, endFreq: 40, volume: 0.26 });
  addBoom(buffer, 1.8, { duration: 0.48, startFreq: 86, endFreq: 38, volume: 0.22 });

  [
    [0.2, 'D5', -0.18],
    [0.62, 'F5', 0.16],
    [1.02, 'A5', -0.08],
    [1.82, 'D6', 0.08],
  ].forEach(([time, note, pan]) => {
    addPianoHit(buffer, time, note, { volume: 0.16, pan, duration: 1.7 });
  });

  addRise(buffer, 1.15, 0.8, { volume: 0.05, seed: 808, pan: 0.1 });

  return finalize(buffer, {
    drive: 0.1,
    reverb: { mix: 0.18, decay: 0.5, taps: [0.13, 0.21, 0.3, 0.44] },
    peak: 0.9,
    fadeSeconds: 0.015,
  });
}

function generateDefeat() {
  const buffer = createStereoBuffer(4.1);

  addBoom(buffer, 0, { duration: 0.7, startFreq: 82, endFreq: 28, volume: 0.32 });
  addStringStab(buffer, 0, ['D2', 'F2', 'A2'], { volume: 0.2, duration: 1.6, pan: -0.12 });
  addStringStab(buffer, 0.88, ['Bb1', 'D2', 'F2'], { volume: 0.16, duration: 1.4, pan: 0.14 });
  addDrone(buffer, 1.6, 2.2, ['G1', 'D2', 'Bb2'], {
    volume: 0.13,
    wave: 'softsaw',
    panSpread: 0.22,
    vibratoHz: 0.1,
    vibratoDepth: 0.005,
    attack: 0.18,
    release: 0.8,
    drive: 0.04,
  });
  addPianoHit(buffer, 0.28, 'D5', { volume: 0.14, pan: -0.22, duration: 1.5 });
  addPianoHit(buffer, 0.9, 'C5', { volume: 0.12, pan: 0.18, duration: 1.4 });
  addPianoHit(buffer, 1.55, 'A4', { volume: 0.1, pan: -0.08, duration: 1.2 });

  addNoise(buffer, 0, 0.18, {
    volume: 0.06,
    attack: 0.001,
    release: 0.1,
    highpass: 0.18,
    seed: 901,
  });

  return finalize(buffer, {
    drive: 0.1,
    reverb: { mix: 0.18, decay: 0.48, taps: [0.14, 0.21, 0.33, 0.49] },
    peak: 0.88,
    fadeSeconds: 0.018,
  });
}

const generators = [
  ['title_loop.wav', generateTitleLoop],
  ['battle_loop.wav', generateBattleLoop],
  ['boss_warning.wav', generateBossWarning],
  ['gun_shot.wav', generateGunShot],
  ['zombie_hit.wav', generateZombieHit],
  ['player_damage.wav', generatePlayerDamage],
  ['zombie_spawn.wav', generateZombieSpawn],
  ['zombie_groan.wav', generateZombieGroan],
  ['victory.wav', generateVictory],
  ['defeat.wav', generateDefeat],
];

const outputDir = path.resolve('public', 'sounds', 'game04');

for (const [filename, generator] of generators) {
  const buffer = generator();
  writeWavStereo(path.join(outputDir, filename), buffer);
}

console.log(`Generated ${generators.length} Game04 audio files in ${outputDir}`);
