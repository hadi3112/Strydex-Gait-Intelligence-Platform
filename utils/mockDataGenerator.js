export function generateWalkingData(duration = 40) {
  const fps = 10;
  const totalPoints = duration * fps;
  const stepFrequency = 1.2;
  const imuData = [];
  const weightData = [];

  for (let i = 0; i < totalPoints; i++) {
    const time = i / fps;
    const phase = 2 * Math.PI * stepFrequency * time;

    const baseWave = Math.sin(phase);
    const stancePhase = Math.max(0, Math.sin(phase));
    const swingPhase = Math.abs(Math.cos(phase));

    const noise = () => (Math.random() - 0.5) * 2;

    const x = 15 + 35 * baseWave + noise() * 3;
    const y = 8 + 25 * Math.sin(phase + Math.PI / 4) + noise() * 2.5;
    const z = -1 + 6 * Math.sin(phase * 2) + noise() * 1.5;

    const clampedX = Math.max(-30, Math.min(60, x));
    const clampedY = Math.max(-30, Math.min(60, y));
    const clampedZ = Math.max(-10, Math.min(8, z));

    const magnitude = Math.sqrt(clampedX ** 2 + clampedY ** 2 + clampedZ ** 2);
    const normalizedX = clampedX / magnitude;
    const normalizedY = clampedY / magnitude;
    const normalizedZ = clampedZ / magnitude;
    const rawResultant = Math.asin(Math.abs(normalizedZ)) * (180 / Math.PI);
    const resultant = Math.max(-8, Math.min(25, 8 + rawResultant * 0.8));

    const weight = stancePhase > 0.3
      ? 45 + 25 * stancePhase + noise() * 3
      : noise() * 2;
    const clampedWeight = Math.max(0, Math.min(80, weight));

    imuData.push({
      time,
      x: parseFloat(clampedX.toFixed(2)),
      y: parseFloat(clampedY.toFixed(2)),
      z: parseFloat(clampedZ.toFixed(2)),
      resultant: parseFloat(resultant.toFixed(2))
    });

    weightData.push({
      time,
      weight: parseFloat(clampedWeight.toFixed(2))
    });
  }

  return { imuData, weightData };
}

export function calculateWeightMetrics(weightData) {
  const nonZeroValues = weightData.filter(d => d.weight > 5);
  const zeroValues = weightData.filter(d => d.weight <= 5);

  const avgForce = nonZeroValues.length > 0
    ? nonZeroValues.reduce((sum, d) => sum + d.weight, 0) / nonZeroValues.length
    : 0;

  const totalTime = weightData.length > 0 ? weightData[weightData.length - 1].time : 0;
  const contactTime = (nonZeroValues.length / weightData.length) * totalTime;
  const contactPercentage = (nonZeroValues.length / weightData.length) * 100;

  return {
    avgForce: parseFloat(avgForce.toFixed(2)),
    contactTime: parseFloat(contactTime.toFixed(2)),
    contactPercentage: parseFloat(contactPercentage.toFixed(1))
  };
}
