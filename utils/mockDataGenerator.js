// Utilities to generate realistic walking data for IMU and Weight sensors

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function generateSin(time, period, amplitude, phase = 0) {
  const omega = (2 * Math.PI) / period;
  return amplitude * Math.sin(omega * time + phase);
}

export function generateWalkingData(totalSeconds = 40, sampleRateHz = 10) {
  const dt = 1 / sampleRateHz;
  const numSamples = Math.floor(totalSeconds * sampleRateHz);

  const imuData = [];
  const weightData = [];

  // Gait parameters
  const stepPeriod = 1.1; // seconds per step
  const stridePhaseOffset = Math.PI / 6; // slight offset between signals

  for (let i = 0; i < numSamples; i++) {
    const t = i * dt;

    // IMU angles (degrees)
    const xRaw = generateSin(t, stepPeriod, 45, 0) + generateSin(t, stepPeriod * 4, 6, Math.PI / 3);
    // Y should peak lower than X
    const yRaw = generateSin(t, stepPeriod, 30, stridePhaseOffset) + generateSin(t, stepPeriod * 3.5, 5, Math.PI / 2);
    const zRaw = generateSin(t, stepPeriod, 6, Math.PI / 4) + generateSin(t, stepPeriod * 5, 2, Math.PI / 5);

    const x = clamp(xRaw, -30, 60);
    const y = clamp(Math.min(yRaw, x - 2), -30, 60); // ensure y peaks lower than x
    const z = clamp(zRaw, -10, 8);

    // Resultant orientation constrained [-8, 25]
    const resultantRaw = 0.5 * x + 0.3 * y + 0.2 * z;
    const resultant = clamp(resultantRaw, -8, 25);

    imuData.push({ time: Number(t.toFixed(1)), x, y, z, resultant: Number(resultant.toFixed(1)) });

    // Weight data (kg), simulate double-hump during stance phase
    const stance = Math.max(0, generateSin(t, stepPeriod, 1)); // 0..1
    const heelStrike = Math.pow(Math.max(0, generateSin(t, stepPeriod / 2, 1, -Math.PI / 2)), 2);
    const toeOff = Math.pow(Math.max(0, generateSin(t, stepPeriod / 2, 1, Math.PI / 2)), 2);
    const base = 70 * stance + 10 * heelStrike + 8 * toeOff; // kg
    const noise = (Math.random() - 0.5) * 2.5;
    const weight = clamp(base + noise, 0, 80);

    weightData.push({ time: Number(t.toFixed(1)), weight: Number(weight.toFixed(1)) });
  }

  return { imuData, weightData };
}

export function calculateWeightMetrics(data) {
  if (!data || data.length === 0) {
    return { avgForce: 0, contactTime: 0, contactPercentage: 0 };
  }

  const avg = data.reduce((sum, d) => sum + (d.weight || 0), 0) / data.length;
  const zeroCount = data.filter(d => (d.weight || 0) < 1e-3).length;
  const nonZeroCount = data.length - zeroCount;
  const contactTime = nonZeroCount / 10; // since sampleRateHz=10
  const contactPercentage = Math.round((nonZeroCount / data.length) * 100);

  return {
    avgForce: Number(avg.toFixed(1)),
    contactTime: Number(contactTime.toFixed(1)),
    contactPercentage
  };
}


