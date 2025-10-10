import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import IMUGraph from './components/IMUGraph';
import WeightGraph from './components/WeightGraph';
import { generateWalkingData, calculateWeightMetrics } from './utils/mockDataGenerator';

export default function App() {
  const [imuData, setImuData] = useState([]);
  const [weightData, setWeightData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [weightMetrics, setWeightMetrics] = useState({
    avgForce: 0,
    contactTime: 0,
    contactPercentage: 0
  });

  useEffect(() => {
    const { imuData: fullImuData, weightData: fullWeightData } = generateWalkingData(40);

    const interval = setInterval(() => {
      setCurrentIndex(prevIndex => {
        const newIndex = prevIndex + 1;

        if (newIndex >= fullImuData.length) {
          clearInterval(interval);
          return prevIndex;
        }

        const displayWindow = 50;
        const startIndex = Math.max(0, newIndex - displayWindow);

        setImuData(fullImuData.slice(startIndex, newIndex + 1));
        setWeightData(fullWeightData.slice(startIndex, newIndex + 1));

        const metricsData = fullWeightData.slice(0, newIndex + 1);
        setWeightMetrics(calculateWeightMetrics(metricsData));

        return newIndex;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const currentResultant = imuData.length > 0
    ? imuData[imuData.length - 1].resultant
    : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#0f172a']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Gait Analysis Dashboard</Text>
            <Text style={styles.headerSubtitle}>Real-time Biomechanical Monitoring</Text>
          </View>

          <IMUGraph
            data={imuData}
            currentResultant={currentResultant}
          />

          <WeightGraph
            data={weightData}
            metrics={weightMetrics}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Elapsed: {imuData.length > 0 ? imuData[imuData.length - 1].time.toFixed(1) : '0.0'}s
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 50,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e2e8f0',
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
    padding: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  footerText: {
    fontSize: 13,
    color: '#cbd5e0',
    fontWeight: '500',
  },
});
