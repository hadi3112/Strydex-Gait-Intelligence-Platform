import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryChart, VictoryLine, VictoryTheme, VictoryAxis, VictoryLegend } from 'victory';

const { width } = Dimensions.get('window');

export default function HipAngleGraph({ data, chartWidth, chartHeight, showPredicted }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Derived Hip Joint Angle</Text>

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
          label="Angle (°)"
        />

        <VictoryLine
          data={data}
          x="time"
          y="hip"
          style={{ data: { stroke: '#60a5fa', strokeWidth: 2 } }}
        />

        {showPredicted && (
          <VictoryLine
            data={data}
            x="time"
            y={(d) => (typeof d.hipPred === 'number' ? d.hipPred : null)}
            style={{ data: { stroke: '#fbbf24', strokeWidth: 4 } }}
          />
        )}
      </VictoryChart>

      <View style={styles.legendRow}>
        <View style={[styles.legendDot, { backgroundColor: '#60a5fa', height: 3 }]} />
        <Text style={[styles.legendText, { fontSize: 14, color: '#e5e7eb' }]}>Live pattern</Text>
        <View style={[styles.legendDot, { backgroundColor: '#fbbf24', height: 6 }]} />
        <Text style={[styles.legendText, { fontSize: 14, color: '#fde68a' }]}>Simulated pattern</Text>
      </View>
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
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  legendDot: {
    width: 12,
    height: 2,
    borderRadius: 2,
    marginHorizontal: 4,
  },
  legendText: {
    color: '#cbd5e0',
    fontSize: 12,
    marginRight: 12,
  },
});


