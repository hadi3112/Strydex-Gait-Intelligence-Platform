import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert, Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import IMUGraph from './components/IMUGraph';
import WeightGraph from './components/WeightGraph';
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
        return newIndex;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  if (Platform.OS === 'web') {
    const currentResultant = imuSimData.length > 0 ? imuSimData[imuSimData.length - 1].resultant : 0;
    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#0f172a', '#1e293b', '#0f172a']}
          style={{ flex: 1 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 50 }} showsVerticalScrollIndicator={false}>
            <View style={{ marginBottom: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#e2e8f0', letterSpacing: 1, marginBottom: 4 }}>Gait Analysis Dashboard</Text>
              <Text style={{ fontSize: 14, color: '#94a3b8', letterSpacing: 0.5 }}>Real-time Biomechanical Monitoring</Text>
            </View>

            <IMUGraph data={imuSimData} currentResultant={currentResultant} />
            <WeightGraph data={weightSimData} metrics={weightMetrics} />

            <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 20, padding: 12, backgroundColor: 'rgba(15,23,42,0.6)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(148,163,184,0.2)' }}>
              <Text style={{ fontSize: 13, color: '#cbd5e0', fontWeight: '500' }}>
                Elapsed: {imuSimData.length > 0 ? imuSimData[imuSimData.length - 1].time.toFixed(1) : '0.0'}s
              </Text>
            </View>
          </ScrollView>
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