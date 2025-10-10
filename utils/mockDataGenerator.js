// Utilities to generate realistic walking data for IMU and Weight sensors

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function generateSin(time, period, amplitude, phase = 0) {
  const omega = (2 * Math.PI) / period;
  return amplitude * Math.sin(omega * time + phase);
}

function triangleWave(time, period, amplitude) {
  // Triangle wave in range [-amplitude, amplitude]
  const t = (time % period) / period; // 0..1
  const tri01 = 1 - Math.abs(2 * t - 1); // 0..1..0
  return (tri01 * 2 - 1) * amplitude; // -amp..+amp
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

    // Predicted hip angle series (after 10s): diverge more and add a triangle-like modulation
    const idx = i;
    const showPred = t >= 10;
    const deltaBase = idx % 4 === 0 ? 4 : 2; // 4° every 4th point, else 2°
    const sign = (idx % 8 < 4) ? 1 : -1; // alternate sign every 4 steps
    const tri = triangleWave(t, stepPeriod * 2, 4); // triangle modulation +/-4°
    const hipPredRaw = showPred ? (resultant + sign * deltaBase + tri * 0.8) : NaN;
    const hipPred = showPred ? clamp(hipPredRaw, -8, 25) : NaN;

    imuData.push({ time: Number(t.toFixed(1)), x, y, z, resultant: Number(resultant.toFixed(1)), hipPred: showPred ? Number(hipPred.toFixed(1)) : null });

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


