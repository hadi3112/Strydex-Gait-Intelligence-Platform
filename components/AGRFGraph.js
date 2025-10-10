import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryChart, VictoryLine, VictoryTheme, VictoryAxis } from 'victory';

const { width } = Dimensions.get('window');

function movingAverage(values, windowSize = 10) {
  const result = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= windowSize) sum -= values[i - windowSize];
    const avg = i >= windowSize - 1 ? sum / windowSize : sum / (i + 1);
    result.push(avg);
  }
  return result;
}

export default function AGRFGraph({ data, chartWidth, chartHeight }) {
  const weights = data.map(d => d.weight || 0);
  const ma = movingAverage(weights, 12);
  const chartData = data.map((d, idx) => ({ time: d.time, agrf: Number(ma[idx]?.toFixed(1) || 0) }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Average Ground Reaction Force</Text>
      <VictoryChart
        theme={VictoryTheme.material}
        width={chartWidth || width * 0.6}
        height={chartHeight || 200}
        padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
        style={{ background: { fill: 'transparent' } }}
      >
        <VictoryAxis
          style={{
            axis: { stroke: '#4a5568' },
            tickLabels: { fill: '#a0aec0', fontSize: 10 },
            grid: { stroke: '#2d3748', strokeDasharray: '3,3' },
            axisLabel: { fill: '#cbd5e0', fontSize: 11, padding: 30 }
          }}
          label="Time (s)"
        />
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: '#4a5568' },
            tickLabels: { fill: '#a0aec0', fontSize: 10 },
            grid: { stroke: '#2d3748', strokeDasharray: '3,3' },
            axisLabel: { fill: '#cbd5e0', fontSize: 11, padding: 36 }
          }}
          label="Force (kg)"
        />

        <VictoryLine
          data={chartData}
          x="time"
          y="agrf"
          style={{ data: { stroke: '#34d399', strokeWidth: 2 } }}
        />
      </VictoryChart>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(26, 32, 44, 0.8)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
  },
});


