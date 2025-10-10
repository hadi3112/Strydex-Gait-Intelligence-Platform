import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryChart, VictoryTheme, VictoryAxis, VictoryArea } from 'victory';

const { width } = Dimensions.get('window');

export default function WeightGraph({ data, metrics, chartWidth, chartHeight }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weight Sensor - Ground Force</Text>

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
              label="Weight (kg)"
            />

            <VictoryArea
              data={data}
              x="time"
              y="weight"
              style={{
                data: {
                  fill: 'rgba(251, 191, 36, 0.25)',
                  stroke: '#fbbf24',
                  strokeWidth: 2.5,
                  fillOpacity: 0.4
                }
              }}
            />
          </VictoryChart>
        </View>

        <View style={styles.metricsContainer}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Average Force</Text>
            <Text style={styles.metricValue}>{metrics.avgForce}</Text>
            <Text style={styles.metricUnit}>kg</Text>
          </View>

          <View style={[styles.metricBox, { marginTop: 12 }]}>
            <Text style={styles.metricLabel}>Ground Contact</Text>
            <Text style={styles.metricValue}>{metrics.contactTime}</Text>
            <Text style={styles.metricUnit}>seconds</Text>
            <View style={styles.percentageContainer}>
              <Text style={styles.percentageText}>{metrics.contactPercentage}% of cycle</Text>
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
    borderColor: 'rgba(251, 191, 36, 0.3)',
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
  metricsContainer: {
    marginLeft: 12,
  },
  metricBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 2,
    borderColor: '#fbbf24',
    borderRadius: 12,
    padding: 14,
    width: 120,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#fcd34d',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginBottom: 2,
  },
  metricUnit: {
    fontSize: 10,
    color: '#d97706',
    fontWeight: '500',
  },
  percentageContainer: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(251, 191, 36, 0.3)',
  },
  percentageText: {
    fontSize: 9,
    color: '#a0aec0',
    textAlign: 'center',
  },
});


