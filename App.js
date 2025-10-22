import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert, Platform, StatusBar, Image, TouchableOpacity, Animated, Dimensions } from 'react-native';
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
  const [weightData, setWeightData] = useState({});
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

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerAnimation = useRef(new Animated.Value(Platform.OS === 'web' ? -500 : -300)).current; // Start completely off-screen
  const screenWidth = Dimensions.get('window')?.width || 800; // Fallback for web

  // Drawer animation functions
  const toggleDrawer = () => {
    console.log('Toggle drawer clicked, current state:', isDrawerOpen);
    const drawerWidth = Platform.OS === 'web' ? 500 : 300;
    const toValue = isDrawerOpen ? -drawerWidth : 0;
    setIsDrawerOpen(!isDrawerOpen);
    Animated.timing(drawerAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    console.log('Close drawer clicked');
    setIsDrawerOpen(false);
    const drawerWidth = Platform.OS === 'web' ? 500 : 300;
    Animated.timing(drawerAnimation, {
      toValue: -drawerWidth,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    // MQTT Configuration
    const brokerHost = 'test.mosquitto.org';
    const brokerPort = 8080; // WebSocket port for mosquitto
    const clientId = 'ReactNativeClient_' + Math.random().toString(16).substr(2, 8);
    
    // Topics to subscribe to
    const topics = {
      imu: 'esp32/imu',
      weight: 'esp32/weight',
      weightAlt: 'esp32/weight_sensor',
      weightAlt2: 'esp32/weight_data',
      text: 'esp32/text_message', // New topic for simple text messages
      // Your specific ESP32 topics
      servo: 'esp32/servo',
      test11: 'esp32/test11',
      test12: 'esp32/test12',
      sensors: 'esp32/sensors',
      temperature: 'esp32/temperature',
      status: 'esp32/status'
    };

    // Connection success callback
    function onConnect() {
      console.log("MQTT Connected to broker");
      setIsConnected(true);
      
      // Subscribe to topics
      client.subscribe(topics.imu);
      client.subscribe(topics.weight);
      client.subscribe(topics.weightAlt);
      client.subscribe(topics.weightAlt2);
      client.subscribe(topics.text);
      client.subscribe(topics.servo);
      client.subscribe(topics.test11);
      client.subscribe(topics.test12);
      client.subscribe(topics.sensors);
      client.subscribe(topics.temperature);
      client.subscribe(topics.status);
      
      // Subscribe to ALL esp32 topics (wildcard)
      client.subscribe('esp32/#');
      
      console.log(`Subscribed to all ESP32 topics including: ${topics.imu}, ${topics.weight}, ${topics.servo}, ${topics.test11}, ${topics.test12}, and esp32/# (all topics)`);
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
      
      console.log(`🔍 MQTT Message received:`);
      console.log(`   Topic: "${topic}"`);
      console.log(`   Payload: "${payload}"`);
      console.log(`   Time: ${timestamp}`);
      
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
          console.log("IMU data received:", parsed);
          Alert.alert('IMU Sensor Connected', `AX: ${parsed.ax || parsed.x || 'N/A'}, AY: ${parsed.ay || parsed.y || 'N/A'}`);
        } catch (e) {
          console.log("Invalid IMU JSON message", payload);
        }
      } else if (topic === topics.weight || topic === topics.weightAlt || topic === topics.weightAlt2) {
        try {
          const parsed = JSON.parse(payload);
          setWeightData(parsed);
          console.log("Weight data received:", parsed);
          Alert.alert('Weight Sensor Connected', `Weight: ${parsed.weight || parsed.value || 'N/A'} kg`);
        } catch (e) {
          console.log("Invalid Weight JSON message", payload);
          // Try to parse as simple number
          const weightValue = parseFloat(payload);
          if (!isNaN(weightValue)) {
            setWeightData({ weight: weightValue });
            console.log("Weight data received (simple number):", weightValue);
            Alert.alert('Weight Sensor Connected', `Weight: ${weightValue} kg`);
          }
        }
      } else if (topic === topics.text) {
        // Handle simple text messages from ESP32
        setTextMessage(payload);
      } else if (topic === topics.servo) {
        // Handle servo data (could be weight/force data)
        try {
          const servoValue = parseFloat(payload);
          if (!isNaN(servoValue)) {
            setWeightData({ weight: servoValue });
            console.log("✅ Servo data treated as weight:", servoValue);
            Alert.alert('Servo/Weight Data', `Value: ${servoValue}`);
          }
        } catch (e) {
          console.log("Invalid servo data:", payload);
        }
      } else if (topic === topics.test11) {
        // Handle test11 data (looks like raw sensor readings - could be IMU)
        try {
          const values = payload.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
          if (values.length >= 6) {
            // Assume first 6 values are AX, AY, AZ, GX, GY, GZ
            const imuData = {
              ax: values[0],
              ay: values[1], 
              az: values[2],
              gx: values[3],
              gy: values[4],
              gz: values[5]
            };
            setImuData(imuData);
            console.log("✅ Test11 data treated as IMU:", imuData);
            Alert.alert('IMU Data (Test11)', `AX: ${imuData.ax}, AY: ${imuData.ay}, AZ: ${imuData.az}`);
          }
        } catch (e) {
          console.log("Invalid test11 data:", payload);
        }
      } else if (topic === topics.test12) {
        // Handle test12 data (looks like sensor data - could be weight or IMU)
        try {
          const values = payload.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
          if (values.length >= 2) {
            // Try as weight data first
            const weightValue = values[1]; // Second value looks like weight (2883)
            if (weightValue > 0) {
              setWeightData({ weight: weightValue });
              console.log("✅ Test12 data treated as weight:", weightValue);
              Alert.alert('Weight Data (Test12)', `Weight: ${weightValue}`);
            }
          }
        } catch (e) {
          console.log("Invalid test12 data:", payload);
        }
      } else if (topic === topics.sensors) {
        // Handle sensors JSON data
        try {
          const parsed = JSON.parse(payload);
          console.log("✅ Sensors data received:", parsed);
          // Could contain temperature, humidity, etc.
        } catch (e) {
          console.log("Invalid sensors JSON:", payload);
        }
      } else if (topic === topics.temperature) {
        // Handle temperature data (could be weight if it's actually a sensor reading)
        try {
          const tempValue = parseFloat(payload);
          if (!isNaN(tempValue)) {
            console.log("✅ Temperature data:", tempValue);
            // Don't treat temperature as weight, just log it
          }
        } catch (e) {
          console.log("Invalid temperature data:", payload);
        }
      } else if (topic === topics.status) {
        // Handle status messages
        console.log("✅ Status update:", payload);
        if (payload === 'online') {
          Alert.alert('ESP32 Status', 'Device is online!');
        }
      } else {
        // Log unknown topics for debugging
        console.log(`❓ Unknown topic received: ${topic} with payload: ${payload}`);
        
        // Check if it might be weight data on a different topic
        const isWeightTopic = topic.toLowerCase().includes('weight') || 
                             topic.toLowerCase().includes('force') || 
                             topic.toLowerCase().includes('load') ||
                             topic.toLowerCase().includes('pressure') ||
                             topic.toLowerCase().includes('scale');
        
        if (isWeightTopic) {
          console.log(`⚖️ Detected potential weight topic: ${topic}`);
          try {
            const parsed = JSON.parse(payload);
            setWeightData(parsed);
            console.log("✅ Weight data received from unknown topic:", parsed);
            Alert.alert('Weight Sensor Connected', `Weight: ${parsed.weight || parsed.value || parsed.load || 'N/A'} kg`);
          } catch (e) {
            const weightValue = parseFloat(payload);
            if (!isNaN(weightValue)) {
              setWeightData({ weight: weightValue });
              console.log("✅ Weight data received (simple number) from unknown topic:", weightValue);
              Alert.alert('Weight Sensor Connected', `Weight: ${weightValue} kg`);
            }
          }
        } else {
          // Try to detect if it's a numeric value that could be weight
          const numericValue = parseFloat(payload);
          if (!isNaN(numericValue) && numericValue > 0 && numericValue < 1000) {
            console.log(`🔢 Numeric value detected: ${numericValue} - might be weight data`);
            setWeightData({ weight: numericValue });
            Alert.alert('Possible Weight Data', `Detected value: ${numericValue} - treating as weight`);
          }
        }
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

  // Raw Data Drawer Component
  const RawDataDrawer = () => {
    // Check if we have real MQTT data (regardless of platform)
    const hasRealMQTTData = isConnected && (imuData.ax !== undefined || imuData.x !== undefined);
    
    // For weight data, check if we have real weight data from MQTT
    const hasWeightMQTTData = isConnected && (weightData.weight !== undefined || weightData.value !== undefined);
    
    // ONLY show real MQTT data when connected, NEVER show simulation data
    const currentImuData = hasRealMQTTData ? imuData : null;
    const currentWeightData = hasWeightMQTTData ? weightData : null; // Real weight data from MQTT

    // Debug: Add console log to see if component is rendering
    console.log('RawDataDrawer rendering:', { hasRealMQTTData, hasWeightMQTTData, isConnected });

    return (
      <Animated.View style={[
        styles.drawer,
        {
          transform: [{ translateX: drawerAnimation }]
        }
      ]}>
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>Raw Sensor Data</Text>
          <TouchableOpacity onPress={closeDrawer} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          style={styles.drawerContent}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={false}
        >
          {/* Connection Status */}
          <View style={styles.dataSection}>
            <Text style={styles.sectionTitle}>Status</Text>
            {Platform.OS === 'web' ? (
              <View style={[styles.statusBox, { backgroundColor: hasRealMQTTData ? '#4CAF50' : '#F44336' }]}>
                <Text style={styles.statusText}>
                  {hasRealMQTTData ? '● Real Sensors Connected' : '● No Real Sensor Data'}
                </Text>
              </View>
            ) : (
              <>
                <View style={[styles.statusBox, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]}>
                  <Text style={styles.statusText}>
                    {isConnected ? '● MQTT Connected' : '● MQTT Disconnected'}
                  </Text>
                </View>
                <View style={[styles.statusBox, { backgroundColor: (currentImuData || currentWeightData) ? '#4CAF50' : '#F44336', marginTop: 8 }]}>
                  <Text style={styles.statusText}>
                    {(currentImuData || currentWeightData) ? '● Sensors Active' : '● Sensors Inactive'}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Text Message */}
          <View style={styles.dataSection}>
            <Text style={styles.sectionTitle}>
              {Platform.OS === 'web' ? 'Simulation Info' : 'ESP32 Message'}
            </Text>
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>
                {Platform.OS === 'web' 
                  ? `Real sensors: ${hasRealMQTTData ? 'Connected' : 'Not connected'}\nData points: ${imuSimData.length}\nCurrent time: ${imuSimData.length > 0 ? imuSimData[imuSimData.length - 1].time.toFixed(1) + 's' : '0.0s'}`
                  : textMessage
                }
              </Text>
            </View>
          </View>

          {/* Sensor Data - Side by Side for Web */}
          <View style={Platform.OS === 'web' ? styles.sensorDataContainer : styles.dataSection}>
            {/* IMU Data */}
            <View style={Platform.OS === 'web' ? styles.sensorDataColumn : styles.dataSection}>
              <Text style={styles.sectionTitle}>IMU Sensor Data</Text>
              {currentImuData && (currentImuData.ax !== undefined || currentImuData.x !== undefined) ? (
                <View style={styles.sensorGrid}>
                  <View style={styles.sensorRow}>
                    <Text style={styles.sensorLabel}>AX:</Text>
                    <Text style={styles.sensorValue}>{currentImuData.ax || currentImuData.x || 'N/A'}</Text>
                  </View>
                  <View style={styles.sensorRow}>
                    <Text style={styles.sensorLabel}>AY:</Text>
                    <Text style={styles.sensorValue}>{currentImuData.ay || currentImuData.y || 'N/A'}</Text>
                  </View>
                  <View style={styles.sensorRow}>
                    <Text style={styles.sensorLabel}>AZ:</Text>
                    <Text style={styles.sensorValue}>{currentImuData.az || currentImuData.z || 'N/A'}</Text>
                  </View>
                  <View style={styles.sensorRow}>
                    <Text style={styles.sensorLabel}>GX:</Text>
                    <Text style={styles.sensorValue}>{currentImuData.gx || 'N/A'}</Text>
                  </View>
                  <View style={styles.sensorRow}>
                    <Text style={styles.sensorLabel}>GY:</Text>
                    <Text style={styles.sensorValue}>{currentImuData.gy || 'N/A'}</Text>
                  </View>
                  <View style={styles.sensorRow}>
                    <Text style={styles.sensorLabel}>GZ:</Text>
                    <Text style={styles.sensorValue}>{currentImuData.gz || 'N/A'}</Text>
                  </View>
                  <View style={styles.sensorRow}>
                    <Text style={styles.sensorLabel}>Resultant:</Text>
                    <Text style={styles.sensorValue}>{currentImuData.resultant || 'N/A'}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>
                  {hasRealMQTTData 
                    ? 'Waiting for real IMU data from ESP32...' 
                    : !isConnected 
                      ? 'MQTT disconnected - connect to ESP32' 
                      : 'Waiting for IMU data from ESP32...'}
                </Text>
                </View>
              )}
            </View>

            {/* Weight Data */}
            <View style={Platform.OS === 'web' ? styles.sensorDataColumn : styles.dataSection}>
              <Text style={styles.sectionTitle}>Weight Sensor Data</Text>
              {currentWeightData && (currentWeightData.weight !== undefined || currentWeightData.value !== undefined) ? (
                <View style={styles.sensorGrid}>
                  <View style={styles.sensorRow}>
                    <Text style={styles.sensorLabel}>Weight:</Text>
                    <Text style={styles.sensorValue}>{currentWeightData.weight || currentWeightData.value} kg</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>
                  {hasWeightMQTTData 
                    ? 'Waiting for real weight data from ESP32...' 
                    : !isConnected 
                      ? 'MQTT disconnected - connect to ESP32' 
                      : 'Waiting for weight data from ESP32...'}
                </Text>
                </View>
              )}
            </View>
          </View>

          {/* Message Log */}
          <View style={styles.dataSection}>
            <Text style={styles.sectionTitle}>
              {Platform.OS === 'web' ? 'Simulation Data' : 'Recent Messages'}
            </Text>
            <View style={styles.logContainer}>
              {Platform.OS === 'web' ? (
                hasRealMQTTData ? (
                  <View>
                    <Text style={styles.simulationInfo}>
                      🔗 MQTT Connected: {isConnected ? 'Yes' : 'No'}
                    </Text>
                    <Text style={styles.simulationInfo}>
                      📡 IMU Data: {imuData.ax !== undefined ? 'Receiving' : 'Waiting'}
                    </Text>
                    <Text style={styles.simulationInfo}>
                      ⚖️ Weight Data: {hasWeightMQTTData ? 'Receiving' : 'Waiting'}
                    </Text>
                    <Text style={styles.simulationInfo}>
                      📊 Messages: {messageLog.length} received
                    </Text>
                  </View>
                ) : (
                  <View>
                    <Text style={styles.simulationInfo}>
                      📊 Total data points: {imuSimData.length}
                    </Text>
                    <Text style={styles.simulationInfo}>
                      ⏱️ Current time: {imuSimData.length > 0 ? imuSimData[imuSimData.length - 1].time.toFixed(1) + 's' : '0.0s'}
                    </Text>
                    <Text style={styles.simulationInfo}>
                      🎯 Status: {statusStage}
                    </Text>
                    <Text style={styles.simulationInfo}>
                      📈 Weight metrics: Avg {weightMetrics.avgForce}kg, Contact {weightMetrics.contactPercentage}%
                    </Text>
                  </View>
                )
              ) : (
                <>
                  {messageLog.slice(-5).map(msg => (
                    <View key={msg.id} style={styles.logItem}>
                      <Text style={styles.logTime}>{msg.timestamp}</Text>
                      <Text style={styles.logTopic}>[{msg.topic}]</Text>
                      <Text style={styles.logPayload}>{msg.payload}</Text>
                    </View>
                  ))}
                  {messageLog.length === 0 && (
                    <Text style={styles.noDataText}>No messages yet...</Text>
                  )}
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    );
  };

  if (Platform.OS === 'web') {
    const currentResultant = imuSimData.length > 0 ? imuSimData[imuSimData.length - 1].resultant : 0;
    return (
      <View style={{ flex: 1, backgroundColor: '#0b1220' }}>
        <StatusBar barStyle="light-content" />
        
        {/* Floating Drawer Trigger */}
        <TouchableOpacity 
          style={styles.drawerTrigger}
          onPress={toggleDrawer}
          activeOpacity={0.7}
        >
          <Text style={styles.drawerTriggerText}>📊</Text>
        </TouchableOpacity>

        {/* Raw Data Drawer */}
        <RawDataDrawer />

        <LinearGradient
          colors={['#0b1220', '#0d1b2a', '#0b1220']}
          style={{ flex: 1 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 30 }} showsVerticalScrollIndicator={false}>
            <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image
                  source={require('./assets/strydex_logo-removebg-preview.png')}
                  style={{ width: 120, height: 35, tintColor: '#e5e7eb', resizeMode: 'contain' }}
                />
              </View>
              <View style={{ alignItems: 'center', flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#e2e8f0', letterSpacing: 1 }}>Gait Analysis Dashboard</Text>
                <Text style={{ fontSize: 13, color: '#94a3b8', letterSpacing: 0.5 }}>Real-time Biomechanical Monitoring</Text>
              </View>
            </View>

            {/* Status chips */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, justifyContent: 'center' }}>
              {[
                { key: 'start', label: 'Start' },
                { key: 'learned', label: 'Learned' },
                { key: 'predict', label: 'Predict' },
                { key: 'end', label: 'End' }
              ].map(chip => {
                const active = statusStage === chip.key;
                const baseColor = chip.key === 'predict' ? '#fbbf24' : chip.key === 'learned' ? '#22c55e' : chip.key === 'end' ? '#ef4444' : '#3b82f6';
                return (
                  <View key={chip.key} style={{
                    backgroundColor: active ? baseColor : 'rgba(148,163,184,0.15)',
                    borderColor: active ? baseColor : 'rgba(148,163,184,0.35)',
                    borderWidth: 1,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 9999
                  }}>
                    <Text style={{ color: active ? '#0b1220' : '#cbd5e1', fontWeight: '700', fontSize: 12 }}>{chip.label}</Text>
                  </View>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <View style={{ width: '48%' }}>
                <IMUGraph data={imuSimData} currentResultant={currentResultant} chartWidth={500} chartHeight={200} />
              </View>
              <View style={{ width: '48%' }}>
                <HipAngleGraph
                  data={imuSimData.map(d => ({ time: d.time, hip: d.resultant, hipPred: d.hipPred }))}
                  showPredicted={statusStage === 'predict' || statusStage === 'learned'}
                  chartWidth={500}
                  chartHeight={200}
                />
              </View>
              <View style={{ width: '48%' }}>
                <WeightGraph data={weightSimData} metrics={weightMetrics} chartWidth={500} chartHeight={200} />
              </View>
              <View style={{ width: '48%' }}>
                <AGRFGraph data={weightSimData} chartWidth={500} chartHeight={200} />
              </View>
            </View>

            <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 24 }}>
              <Text style={{ fontSize: 13, color: '#cbd5e0', fontWeight: '500', marginBottom: 12 }}>
                Elapsed: {imuSimData.length > 0 ? imuSimData[imuSimData.length - 1].time.toFixed(1) : '0.0'}s
              </Text>
              {/* Live vs Predicted difference */}
              {(() => {
                const last = imuSimData.length > 0 ? imuSimData[imuSimData.length - 1] : null;
                const hasPred = last && typeof last.hipPred === 'number' && last.hipPred !== null;
                const diff = hasPred ? Number((last.hipPred - last.resultant).toFixed(1)) : null;
                if (!hasPred || !(statusStage === 'predict' || statusStage === 'learned')) return null;
                return (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: 'rgba(251,191,36,0.12)',
                    borderColor: 'rgba(251,191,36,0.45)',
                    borderWidth: 1,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    marginBottom: 10
                  }}>
                    <View style={{ width: 10, height: 10, borderRadius: 9999, backgroundColor: '#fbbf24' }} />
                    <Text style={{ color: '#fde68a', fontWeight: '700' }}>Δ Predicted vs Live:</Text>
                    <Text style={{ color: '#e5e7eb', fontWeight: '700' }}>{diff}°</Text>
                  </View>
                );
              })()}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ backgroundColor: '#0ea5e9', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(14,165,233,0.5)' }}>
                  <Text style={{ color: '#e6f3ff', fontWeight: '600' }}>Record Again</Text>
                </View>
                <View style={{ backgroundColor: '#22c55e', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(34,197,94,0.5)' }}>
                  <Text style={{ color: '#ecfdf5', fontWeight: '700' }}>Generate Report</Text>
                </View>
              </View>
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
      {/* Floating Drawer Trigger */}
      <TouchableOpacity 
        style={styles.drawerTrigger}
        onPress={toggleDrawer}
        activeOpacity={0.7}
      >
        <Text style={styles.drawerTriggerText}>📊</Text>
      </TouchableOpacity>

      {/* Raw Data Drawer */}
      <RawDataDrawer />

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
  },
  // Drawer styles
  drawerTrigger: {
    position: 'absolute',
    left: 10,
    top: '50%',
    zIndex: 1000,
    backgroundColor: '#2196F3',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: '#1976D2',
  },
  drawerTriggerText: {
    fontSize: 20,
    color: 'white',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: Platform.OS === 'web' ? 500 : 300,
    backgroundColor: '#f8f9fa',
    zIndex: 999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#2196F3',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  drawerContent: {
    flex: 1,
    padding: 15,
  },
  dataSection: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statusBox: {
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  messageBox: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  messageText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '500',
  },
  sensorGrid: {
    gap: 8,
  },
  sensorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  sensorLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  sensorValue: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noDataText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    fontSize: 14,
    marginBottom: 8,
  },
  connectionHint: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9800',
  },
  logContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
    padding: 10,
  },
  logItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 6,
  },
  logTime: {
    fontSize: 11,
    color: '#666',
  },
  logTopic: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  logPayload: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  simulationInfo: {
    fontSize: 13,
    color: '#333',
    marginBottom: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  sensorDataContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  sensorDataColumn: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  }
});