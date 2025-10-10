import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert, Platform, StatusBar, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import IMUGraph from './components/IMUGraph';
import WeightGraph from './components/WeightGraph';
import HipAngleGraph from './components/HipAngleGraph';
import AGRFGraph from './components/AGRFGraph';
import { generateWalkingData, calculateWeightMetrics } from './utils/mockDataGenerator';
import init from 'react_native_mqtt';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize MQTT with storage configuration
init({
  size: 10000,
  storageBackend: AsyncStorage,
  defaultExpires: 1000 * 3600 * 24,
  enableCache: true,
  reconnect: true,
  sync: {}
});

export default function App() {
  const [imuData, setImuData] = useState({});
  const [textMessage, setTextMessage] = useState('Waiting for messages...');
  const [isConnected, setIsConnected] = useState(false);
  const [messageLog, setMessageLog] = useState([]);

  // Web-only simulated data state
  const [imuSimData, setImuSimData] = useState([]);
  const [weightSimData, setWeightSimData] = useState([]);
  const [currentIndexSim, setCurrentIndexSim] = useState(0);
  const [weightMetrics, setWeightMetrics] = useState({
    avgForce: 0,
    contactTime: 0,
    contactPercentage: 0
  });
  const [statusStage, setStatusStage] = useState('start');

  useEffect(() => {
    // MQTT Configuration
    const brokerHost = 'test.mosquitto.org';
    const brokerPort = 8080; // WebSocket port for mosquitto
    const clientId = 'ReactNativeClient_' + Math.random().toString(16).substr(2, 8);
    
    // Topics to subscribe to
    const topics = {
      imu: 'esp32/imu',
      text: 'esp32/text_message' // New topic for simple text messages
    };

    // Connection success callback
    function onConnect() {
      console.log("MQTT Connected to broker");
      setIsConnected(true);
      
      // Subscribe to topics
      client.subscribe(topics.imu);
      client.subscribe(topics.text);
      
      console.log(`Subscribed to ${topics.imu} and ${topics.text}`);
      Alert.alert('Success', 'Connected to MQTT broker!');
    }

    // Connection lost callback
    function onConnectionLost(responseObject) {
      if (responseObject.errorCode !== 0) {
        console.log("Connection Lost: " + responseObject.errorMessage);
        setIsConnected(false);
        setTextMessage('Connection lost...');
      }
    }

    // Message arrived callback
    function onMessageArrived(message) {
      const topic = message.destinationName;
      const payload = message.payloadString;
      const timestamp = new Date().toLocaleTimeString();
      
      console.log(`Message received on ${topic}: ${payload}`);
      
      // Add to message log
      setMessageLog(prev => [...prev.slice(-9), {
        topic,
        payload,
        timestamp,
        id: Date.now()
      }]);

      // Handle different message types
      if (topic === topics.imu) {
        try {
          const parsed = JSON.parse(payload);
          setImuData(parsed);
        } catch (e) {
          console.log("Invalid IMU JSON message", payload);
        }
      } else if (topic === topics.text) {
        // Handle simple text messages from ESP32
        setTextMessage(payload);
      }
    }

    // Create MQTT client using Paho (attached to global scope by react_native_mqtt)
    const client = new Paho.MQTT.Client(brokerHost, brokerPort, clientId);
    
    // Set callback handlers
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    // Connect to broker
    console.log('Attempting to connect to MQTT broker...');
    client.connect({
      onSuccess: onConnect,
      onFailure: (error) => {
        console.log('Connection failed:', error);
        Alert.alert('Connection Failed', 'Could not connect to MQTT broker');
        setTextMessage('Connection failed...');
      },
      useSSL: false, // Set to true if using SSL
      timeout: 30,
      keepAliveInterval: 60
    });

    // Cleanup function
    return () => {
      try {
        if (client && client.isConnected && client.isConnected()) {
          client.disconnect();
        }
      } catch (error) {
        console.log('Cleanup error:', error);
      }
    };
  }, []);

  // Simulated data for web preview (no MQTT)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const { imuData: fullImuData, weightData: fullWeightData } = generateWalkingData(40);
    const interval = setInterval(() => {
      setCurrentIndexSim(prevIndex => {
        const newIndex = prevIndex + 1;
        if (newIndex >= fullImuData.length) {
          clearInterval(interval);
          return prevIndex;
        }
        const displayWindow = 50;
        const startIndex = Math.max(0, newIndex - displayWindow);
        setImuSimData(fullImuData.slice(startIndex, newIndex + 1));
        setWeightSimData(fullWeightData.slice(startIndex, newIndex + 1));
        const metricsData = fullWeightData.slice(0, newIndex + 1);
        setWeightMetrics(calculateWeightMetrics(metricsData));

        const t = fullImuData[newIndex].time;
        if (t < 10) setStatusStage('start');
        else if (t >= 10 && t < 12) setStatusStage('learned');
        else if (t >= 12 && t < 40) setStatusStage('predict');
        else setStatusStage('end');
        return newIndex;
      });
    }, 300);
    return () => clearInterval(interval);
  }, []);

  if (Platform.OS === 'web') {
    const currentResultant = imuSimData.length > 0 ? imuSimData[imuSimData.length - 1].resultant : 0;
    return (
      <View style={{ flex: 1, backgroundColor: '#0b1220' }}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#0b1220', '#0d1b2a', '#0b1220']}
          style={{ flex: 1 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 30 }} showsVerticalScrollIndicator={false}>
            <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ backgroundColor: '#ffffff', borderRadius: 9999, paddingVertical: 6, paddingHorizontal: 10, shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6 }}>
                <Image
                  source={require('./assets/strydex_logo-removebg-preview.png')}
                  style={{ width: 140, height: 40, resizeMode: 'contain' }}
                />
              </View>
              <View style={{ alignItems: 'center', flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#e2e8f0', letterSpacing: 1, textAlign: 'center' }}>Gait Analysis Dashboard</Text>
                <Text style={{ fontSize: 13, color: '#94a3b8', letterSpacing: 0.5, textAlign: 'center' }}>Physiotherapy Walking Trial & Gait Assessment</Text>
              </View>
            </View>

            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              {statusStage === 'start' && (
                <View style={{ backgroundColor: 'rgba(96,165,250,0.15)', borderColor: '#60a5fa', borderWidth: 1, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 9999 }}>
                  <Text style={{ color: '#93c5fd', fontWeight: '600' }}>Walking Simulation Started</Text>
                </View>
              )}
              {statusStage === 'learned' && (
                <View style={{ backgroundColor: 'rgba(250,204,21,0.15)', borderColor: '#facc15', borderWidth: 1, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 9999 }}>
                  <Text style={{ color: '#fde047', fontWeight: '600' }}>Walking Patterns Learned</Text>
                </View>
              )}
              {statusStage === 'predict' && (
                <View style={{ backgroundColor: 'rgba(34,197,94,0.15)', borderColor: '#22c55e', borderWidth: 1, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 9999 }}>
                  <Text style={{ color: '#86efac', fontWeight: '600' }}>Simulating Predicted Walking</Text>
                </View>
              )}
              {statusStage === 'end' && (
                <View style={{ backgroundColor: 'rgba(148,163,184,0.15)', borderColor: '#94a3b8', borderWidth: 1, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 9999 }}>
                  <Text style={{ color: '#cbd5e1', fontWeight: '600' }}>End of Simulation</Text>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <View style={{ width: '48%' }}>
                <IMUGraph data={imuSimData} currentResultant={currentResultant} chartWidth={350} chartHeight={140} />
              </View>
              <View style={{ width: '48%' }}>
                <HipAngleGraph data={imuSimData.map(d => ({ time: d.time, hip: d.resultant, hipPred: d.hipPred }))} showPredicted chartWidth={350} chartHeight={140} />
              </View>
              <View style={{ width: '48%' }}>
                <WeightGraph data={weightSimData} metrics={weightMetrics} chartWidth={350} chartHeight={140} />
              </View>
              <View style={{ width: '48%' }}>
                <AGRFGraph data={weightSimData} chartWidth={350} chartHeight={140} />
              </View>
            </View>

            <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 96 }}>
              <Text style={{ fontSize: 13, color: '#cbd5e0', fontWeight: '500', marginBottom: 12 }}>
                Elapsed: {imuSimData.length > 0 ? imuSimData[imuSimData.length - 1].time.toFixed(1) : '0.0'}s
              </Text>
              {/* Spacer; buttons are fixed at bottom */}
            </View>
          </ScrollView>

          {/* Fixed bottom-center actions */}
          <View style={{ position: 'fixed', left: 0, right: 0, bottom: 24, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 18, justifyContent: 'center' }}>
              <View style={{ backgroundColor: '#0ea5e9', paddingVertical: 16, paddingHorizontal: 28, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(14,165,233,0.5)', shadowColor: '#000', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 6 }, shadowRadius: 16 }} onTouchEnd={() => {
                // full restart: re-generate and restart timer
                const { imuData: fullImuData, weightData: fullWeightData } = generateWalkingData(40);
                setImuSimData([]);
                setWeightSimData([]);
                setCurrentIndexSim(0);
                setWeightMetrics({ avgForce: 0, contactTime: 0, contactPercentage: 0 });
                setStatusStage('start');
                let idx = 0;
                const interval = setInterval(() => {
                  idx += 1;
                  if (idx >= fullImuData.length) { clearInterval(interval); return; }
                  const displayWindow = 50;
                  const startIndex = Math.max(0, idx - displayWindow);
                  setImuSimData(fullImuData.slice(startIndex, idx + 1));
                  setWeightSimData(fullWeightData.slice(startIndex, idx + 1));
                  const metricsData = fullWeightData.slice(0, idx + 1);
                  setWeightMetrics(calculateWeightMetrics(metricsData));
                  const t = fullImuData[idx].time;
                  if (t < 10) setStatusStage('start');
                  else if (t >= 10 && t < 12) setStatusStage('learned');
                  else if (t >= 12 && t < 40) setStatusStage('predict');
                  else setStatusStage('end');
                }, 300);
              }}>
                <Text style={{ color: '#e6f3ff', fontWeight: '700', fontSize: 16 }}>Record Again</Text>
              </View>
              <View style={{ backgroundColor: '#22c55e', paddingVertical: 16, paddingHorizontal: 28, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.5)', shadowColor: '#000', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 6 }, shadowRadius: 16 }}>
                <Text style={{ color: '#ecfdf5', fontWeight: '800', fontSize: 16 }}>Generate Report</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ESP32 MQTT Data</Text>
      
      {/* Connection Status */}
      <View style={styles.statusContainer}>
        <Text style={[
          styles.status,
          { color: isConnected ? '#4CAF50' : '#F44336' }
        ]}>
          {isConnected ? '● Connected' : '● Disconnected'}
        </Text>
      </View>

      {/* Text Message Section */}
      <View style={styles.messageContainer}>
        <Text style={styles.sectionTitle}>ESP32 Text Message:</Text>
        <Text style={styles.textMessage}>{textMessage}</Text>
      </View>

      {/* IMU Data Section */}
      <View style={styles.imuContainer}>
        <Text style={styles.sectionTitle}>IMU Data:</Text>
        {imuData.ax !== undefined ? (
          <>
            <Text style={styles.data}>AX: {imuData.ax}</Text>
            <Text style={styles.data}>AY: {imuData.ay}</Text>
            <Text style={styles.data}>AZ: {imuData.az}</Text>
            <Text style={styles.data}>GX: {imuData.gx}</Text>
            <Text style={styles.data}>GY: {imuData.gy}</Text>
            <Text style={styles.data}>GZ: {imuData.gz}</Text>
          </>
        ) : (
          <Text style={styles.data}>Waiting for IMU data...</Text>
        )}
      </View>

      {/* Message Log */}
      <View style={styles.logContainer}>
        <Text style={styles.sectionTitle}>Message Log:</Text>
        <ScrollView style={styles.logScroll} contentContainerStyle={styles.scroll}>
          {messageLog.map(msg => (
            <View key={msg.id} style={styles.logItem}>
              <Text style={styles.logTime}>{msg.timestamp}</Text>
              <Text style={styles.logTopic}>[{msg.topic}]</Text>
              <Text style={styles.logPayload}>{msg.payload}</Text>
            </View>
          ))}
          {messageLog.length === 0 && (
            <Text style={styles.noMessages}>No messages yet...</Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5', 
    padding: 20,
    paddingTop: 50 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    textAlign: 'center',
    marginBottom: 20,
    color: '#333'
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 20
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  messageContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  imuContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  logContainer: {
    backgroundColor: '#fff',
    flex: 1,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333'
  },
  textMessage: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 5,
    textAlign: 'center'
  },
  data: { 
    fontSize: 16, 
    color: '#333', 
    marginVertical: 3,
    paddingVertical: 2
  },
  logScroll: {
    flex: 1
  },
  scroll: { 
    flexGrow: 1 
  },
  logItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 8
  },
  logTime: {
    fontSize: 12,
    color: '#999'
  },
  logTopic: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666'
  },
  logPayload: {
    fontSize: 14,
    color: '#333',
    marginTop: 2
  },
  noMessages: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    marginTop: 20
  }
});