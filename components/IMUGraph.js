import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryChart, VictoryLine, VictoryTheme, VictoryAxis } from 'victory';

const { width } = Dimensions.get('window');

export default function IMUGraph({ data, currentResultant, chartWidth, chartHeight }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>IMU Sensor - 3D Orientation</Text>

      <View style={styles.contentRow}>
        <View style={styles.chartContainer}>
          <VictoryChart
            theme={VictoryTheme.material}
            width={chartWidth || width * 0.8}
            height={chartHeight || 240}
            padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
            style={{
              background: { fill: 'transparent' }
            }}
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
              y="x"
              style={{
                data: { stroke: '#00d4ff', strokeWidth: 2 }
              }}
            />
            <VictoryLine
              data={data}
              x="time"
              y="y"
              style={{
                data: { stroke: '#00ff88', strokeWidth: 2 }
              }}
            />
            <VictoryLine
              data={data}
              x="time"
              y="z"
              style={{
                data: { stroke: '#ff00d4', strokeWidth: 2 }
              }}
            />
          </VictoryChart>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#00d4ff' }]} />
              <Text style={styles.legendText}>X Angle</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#00ff88' }]} />
              <Text style={styles.legendText}>Y Angle</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#ff00d4' }]} />
              <Text style={styles.legendText}>Z Angle</Text>
            </View>
          </View>
        </View>

        <View style={styles.metricsContainer}>
          <View style={styles.metricBox}>
            <Text style={[styles.metricLabel, { fontSize: 14 }]}>Resultant 3D Orientation</Text>
            <Text style={[styles.metricValue, { fontSize: 30 }]}>{currentResultant}°</Text>
            <View style={styles.rangeIndicator}>
              <Text style={[styles.rangeText, { fontSize: 11 }]}>Range: -8° to 25°</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(26, 32, 44, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(66, 153, 225, 0.3)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartContainer: {
    flex: 1,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: -10,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#cbd5e0',
  },
  metricsContainer: {
    marginLeft: 12,
  },
  metricBox: {
    backgroundColor: 'rgba(49, 130, 206, 0.15)',
    borderWidth: 2,
    borderColor: '#00d4ff',
    borderRadius: 12,
    padding: 16,
    width: 120,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#90cdf4',
    fontWeight: '500',
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00d4ff',
    marginTop: 8,
    marginBottom: 4,
  },
  rangeIndicator: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 212, 255, 0.3)',
  },
  rangeText: {
    fontSize: 9,
    color: '#a0aec0',
    textAlign: 'center',
  },
});


