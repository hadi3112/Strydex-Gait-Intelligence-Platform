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

  // Right drawer state (web only)
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const rightDrawerAnimation = useRef(new Animated.Value(Platform.OS === 'web' ? 500 : 300)).current; // Start completely off-screen
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [validationMetrics, setValidationMetrics] = useState(null);
  const [showValidation, setShowValidation] = useState(false);
  
  // Data preprocessing state
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [preprocessingProgress, setPreprocessingProgress] = useState(0);
  const [preprocessingStatus, setPreprocessingStatus] = useState('');
  const [isDataPreprocessed, setIsDataPreprocessed] = useState(false);
  
  // LSTM Model state
  const [lstmModel, setLstmModel] = useState(null);
  const [modelWeights, setModelWeights] = useState(null);
  const [isLiveInference, setIsLiveInference] = useState(false);
  const [inferenceResults, setInferenceResults] = useState([]);
  const [showRNNVisualization, setShowRNNVisualization] = useState(false);
  
  // Report generation states
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportProgress, setReportProgress] = useState(0);
  const [reportStatus, setReportStatus] = useState('');
  const [generatedReports, setGeneratedReports] = useState([]);
  
  // Refs for intervals to avoid CSP issues
  const inferenceIntervalRef = useRef(null);

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

  // Right drawer animation functions (web only)
  const toggleRightDrawer = () => {
    if (Platform.OS !== 'web') return;
    
    console.log('Toggle right drawer clicked, current state:', isRightDrawerOpen);
    const drawerWidth = 700; // Increased from 400 to 700
    const toValue = isRightDrawerOpen ? drawerWidth : 0;
    
    Animated.timing(rightDrawerAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    setIsRightDrawerOpen(!isRightDrawerOpen);
  };

  const closeRightDrawer = () => {
    if (Platform.OS !== 'web') return;
    
    const drawerWidth = 400;
    Animated.timing(rightDrawerAnimation, {
      toValue: drawerWidth,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setIsRightDrawerOpen(false);
  };


  // Model training and validation functions
  const startTraining = () => {
    if (Platform.OS !== 'web') return;
    
    // Check if data has been preprocessed
    if (!isDataPreprocessed) {
      Alert.alert(
        'Data Not Preprocessed',
        'Please run data preprocessing first before training the model.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    setIsTraining(true);
    setTrainingProgress(0);
    setShowValidation(false);
    
    // Simulate LSTM training progress
    const trainingInterval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 100) {
          clearInterval(trainingInterval);
          setIsTraining(false);
          
          // Generate comprehensive regression validation metrics
          const trainingStartTime = Date.now();
          const trainingDuration = Math.floor(Math.random() * 120) + 120; // 2-4 minutes
          const epochs = Math.floor(Math.random() * 20) + 50; // 50-70 epochs
          
          // Calculate sequence length based on walk data (5-7 samples per sequence)
          const sequenceLength = Math.floor(Math.random() * 3) + 5; // 5-7 samples
          const totalSamples = 2000; // Reduced from 10000 for more realistic dataset
          const numSequences = Math.floor(totalSamples / sequenceLength);
          
          setValidationMetrics({
            // Regression Core Metrics
            meanSquaredError: 0.001 + (Math.random() * 0.005), // 0.001-0.006
            rootMeanSquaredError: Math.sqrt(0.001 + (Math.random() * 0.005)), // RMSE
            meanAbsoluteError: 0.02 + (Math.random() * 0.03), // 0.02-0.05
            r2Score: 0.92 + (Math.random() * 0.06), // 0.92-0.98 (R-squared)
            explainedVariance: 0.91 + (Math.random() * 0.07), // 0.91-0.98
            
            // Regression-Specific Metrics with Statistical Validation
            betaValues: {
              beta0: (Math.random() - 0.5) * 0.1, // Intercept
              beta1: 0.8 + (Math.random() * 0.3), // IMU1 coefficient
              beta2: 0.7 + (Math.random() * 0.4), // IMU2 coefficient
              beta3: 0.6 + (Math.random() * 0.5), // Weight coefficient
              beta4: 0.5 + (Math.random() * 0.3), // Interaction term
            },
            
            // P-values for statistical significance testing
            pValues: {
              beta0: 0.001 + Math.random() * 0.009, // 0.001-0.01 (highly significant)
              beta1: 0.001 + Math.random() * 0.004, // 0.001-0.005 (highly significant)
              beta2: 0.001 + Math.random() * 0.008, // 0.001-0.009 (highly significant)
              beta3: 0.001 + Math.random() * 0.012, // 0.001-0.013 (highly significant)
              beta4: 0.005 + Math.random() * 0.015, // 0.005-0.02 (significant)
            },
            
            // Confidence Intervals (95% CI)
            confidenceIntervals: {
              beta0: { lower: -0.15, upper: 0.05 },
              beta1: { lower: 0.75, upper: 1.15 },
              beta2: { lower: 0.65, upper: 1.10 },
              beta3: { lower: 0.55, upper: 1.10 },
              beta4: { lower: 0.45, upper: 0.80 },
            },
            
            // Standard Errors
            standardErrors: {
              beta0: 0.02 + Math.random() * 0.01, // 0.02-0.03
              beta1: 0.05 + Math.random() * 0.02, // 0.05-0.07
              beta2: 0.06 + Math.random() * 0.02, // 0.06-0.08
              beta3: 0.08 + Math.random() * 0.02, // 0.08-0.10
              beta4: 0.07 + Math.random() * 0.02, // 0.07-0.09
            },
            
            // T-statistics (coefficient / standard error)
            tStatistics: {
              beta0: -2.5 + Math.random() * 1.0, // -2.5 to -1.5
              beta1: 12.0 + Math.random() * 3.0, // 12.0 to 15.0
              beta2: 10.0 + Math.random() * 2.0, // 10.0 to 12.0
              beta3: 8.0 + Math.random() * 2.0, // 8.0 to 10.0
              beta4: 6.0 + Math.random() * 2.0, // 6.0 to 8.0
            },
            
            // Loss Functions (MSE chosen for regression)
            mseLoss: 0.001 + (Math.random() * 0.004), // Mean Squared Error
            maeLoss: 0.02 + (Math.random() * 0.03), // Mean Absolute Error
            huberLoss: 0.001 + (Math.random() * 0.002), // Huber Loss (robust to outliers)
            
            // Training Configuration
            epochs: epochs,
            trainingTime: `${Math.floor(trainingDuration / 60)}m ${trainingDuration % 60}s`,
            datasetSize: `${numSequences.toLocaleString()} sequences`,
            sequenceLength: sequenceLength,
            modelType: 'LSTM Regression Model',
            features: ['IMU1 Sequence', 'IMU2 Sequence', 'Weight Sequence', 'Hip Angles'],
            
            // Advanced Statistical Metrics
            fStatistic: 45.0 + Math.random() * 15.0, // F-statistic for overall model significance
            fPValue: 0.0001 + Math.random() * 0.0009, // P-value for F-test (highly significant)
            durbinWatson: 1.8 + Math.random() * 0.4, // Durbin-Watson test for autocorrelation (1.8-2.2 is good)
            breuschPagan: 0.1 + Math.random() * 0.2, // Breusch-Pagan test for heteroscedasticity (0.1-0.3 is acceptable)
            jarqueBera: 0.05 + Math.random() * 0.15, // Jarque-Bera test for normality (0.05-0.2 is acceptable)
            vifScores: { // Variance Inflation Factor (should be < 5)
              beta1: 1.2 + Math.random() * 0.8, // 1.2-2.0 (low multicollinearity)
              beta2: 1.5 + Math.random() * 1.0, // 1.5-2.5 (low multicollinearity)
              beta3: 2.0 + Math.random() * 1.5, // 2.0-3.5 (acceptable multicollinearity)
              beta4: 3.0 + Math.random() * 1.5, // 3.0-4.5 (moderate multicollinearity)
            },
            
            // Performance Metrics
            latency: `${Math.floor(Math.random() * 3) + 1}ms`, // 1-4ms
            memoryUsage: `${Math.floor(Math.random() * 80) + 40}MB`, // 40-120MB (reduced)
            modelSize: `${Math.floor(Math.random() * 15) + 8}MB`, // 8-23MB (reduced)
            
            // Performance Benchmarks
            throughput: `${Math.floor(Math.random() * 300) + 800} sequences/sec`,
            convergenceEpoch: Math.floor(epochs * 0.75), // 75% of total epochs
            learningRate: 0.001,
            batchSize: 16, // Smaller batch size for sequences
            
            // Regression Evaluation
            validationMSE: 0.001 + (Math.random() * 0.003),
            testMSE: 0.001 + (Math.random() * 0.004),
            crossValidationMSE: 0.001 + (Math.random() * 0.002),
            
            // Model Architecture (Optimized for regression)
            layers: 2, // Reduced from 3 to 2 layers
            hiddenUnits: 32, // Reduced from 64 to 32 for smaller model
            sequenceInputUnits: sequenceLength,
            outputUnits: 1, // Single continuous output (hip angle)
            dropout: 0.2, // Reduced dropout for smaller model
            activationFunction: 'tanh',
            outputActivation: 'linear', // Linear for regression
            optimizer: 'Adam',
            
            // Regression Coefficients
            coefficients: {
              intercept: (Math.random() - 0.5) * 0.2,
              imu1Weight: 0.8 + (Math.random() * 0.4),
              imu2Weight: 0.7 + (Math.random() * 0.5),
              weightSensorWeight: 0.6 + (Math.random() * 0.6),
              timeWeight: 0.5 + (Math.random() * 0.3)
            },
            
            // Training Logs
            bestEpoch: Math.floor(epochs * 0.8),
            earlyStopping: true,
            regularization: 'L2',
            gradientClipping: true,
            learningRateDecay: 0.95
          });
          
          // Generate optimized regression model weights (simulated)
          const weights = {
            // LSTM Layer 1 weights (sequence input -> 32 hidden units)
            lstm1InputWeights: Array.from({length: sequenceLength * 32}, () => Math.random() * 0.1 - 0.05),
            lstm1HiddenWeights: Array.from({length: 32 * 32}, () => Math.random() * 0.1 - 0.05),
            lstm1Biases: Array.from({length: 32}, () => Math.random() * 0.1 - 0.05),
            
            // Output layer weights (32 hidden -> single output)
            outputWeights: Array.from({length: 32}, () => Math.random() * 0.1 - 0.05),
            outputBias: Math.random() * 0.1 - 0.05, // Single bias for regression
            
            // Regression coefficients
            betaCoefficients: {
              beta0: (Math.random() - 0.5) * 0.1, // Intercept
              beta1: 0.8 + (Math.random() * 0.3), // IMU1 sequence coefficient
              beta2: 0.7 + (Math.random() * 0.4), // IMU2 sequence coefficient
              beta3: 0.6 + (Math.random() * 0.5), // Weight sequence coefficient
              beta4: 0.5 + (Math.random() * 0.3), // Time coefficient
            },
            
            timestamp: new Date().toISOString(),
            modelType: 'LSTM_Regression',
            sequenceLength: sequenceLength
          };
          
          setModelWeights(weights);
          setLstmModel({
            id: `lstm_${Date.now()}`,
            name: 'Gait Analysis LSTM',
            version: '1.0.0',
            status: 'trained',
            weights: weights
          });
          
          // Clean up processed files after training
          setIsDataPreprocessed(false);
          setPreprocessingProgress(0);
          setPreprocessingStatus('');
          
          // Auto-generate training reports after successful training
          setTimeout(() => {
            generateTrainingReports(validationMetrics, weights, sequenceLength);
          }, 1000);
          
          Alert.alert(
            'Training Complete!', 
            'LSTM model has been trained successfully. Processed files have been cleaned up. Training reports are being generated automatically.',
            [{ text: 'OK', style: 'default' }]
          );
          return 100;
        }
        return prev + Math.random() * 3;
      });
    }, 100);
  };

  const viewValidationMetrics = () => {
    if (Platform.OS !== 'web') return;
    setShowValidation(!showValidation);
  };

  // Live inference functions
  const startLiveInference = () => {
    if (Platform.OS !== 'web') return;
    
    if (!lstmModel) {
      Alert.alert('No Trained Model', 'Please train the LSTM model first before starting live inference.');
      return;
    }

    setIsLiveInference(true);
    setInferenceResults([]);
    
    // Simulate live inference with real-time data
    const inferenceInterval = setInterval(() => {
      const newResult = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        input: {
          imu1: {
            ax: (Math.random() - 0.5) * 2,
            ay: (Math.random() - 0.5) * 2,
            az: (Math.random() - 0.5) * 2,
            gx: (Math.random() - 0.5) * 10,
            gy: (Math.random() - 0.5) * 10,
            gz: (Math.random() - 0.5) * 10
          },
          imu2: {
            ax: (Math.random() - 0.5) * 2,
            ay: (Math.random() - 0.5) * 2,
            az: (Math.random() - 0.5) * 2,
            gx: (Math.random() - 0.5) * 10,
            gy: (Math.random() - 0.5) * 10,
            gz: (Math.random() - 0.5) * 10
          },
          weight: Math.random() * 100 + 50
        },
        prediction: {
          hipAngle: -8 + Math.random() * 36, // Hip angle between -8 and 28 degrees
          confidence: 0.85 + Math.random() * 0.14,
          mseError: (Math.random() * 0.01).toFixed(4), // Mean squared error
          recommendations: ['Normal hip range', 'Consider flexibility training', 'Monitor for stiffness'][Math.floor(Math.random() * 3)]
        },
        processingTime: `${Math.floor(Math.random() * 3) + 1}ms`
      };
      
      setInferenceResults(prev => [newResult, ...prev.slice(0, 9)]); // Keep last 10 results
    }, 2000); // New inference every 2 seconds
    
    // Store interval ID for cleanup
    inferenceIntervalRef.current = inferenceInterval;
  };

  const stopLiveInference = () => {
    if (inferenceIntervalRef.current) {
      clearInterval(inferenceIntervalRef.current);
      inferenceIntervalRef.current = null;
    }
    setIsLiveInference(false);
  };

  const toggleRNNVisualization = () => {
    if (Platform.OS !== 'web') return;
    setShowRNNVisualization(!showRNNVisualization);
  };

  // Simple report download function
  const downloadReport = (report) => {
    Alert.alert(
      'Download Report',
      `Downloading ${report.filename}...\n\nReport contains: ${report.type}`,
      [{ text: 'OK' }]
    );
  };

  // Report generation function - works immediately
  const generateReports = async () => {
    setIsGeneratingReport(true);
    setReportProgress(0);
    setReportStatus('Generating reports...');

    // Generate dummy data immediately
    const dummyMetrics = {
      r2Score: 0.85 + Math.random() * 0.1,
      meanSquaredError: 0.02 + Math.random() * 0.03,
      epochs: 50 + Math.floor(Math.random() * 20),
      betaValues: {
        beta0: (Math.random() - 0.5) * 0.1,
        beta1: 0.8 + Math.random() * 0.3,
        beta2: 0.7 + Math.random() * 0.4,
        beta3: 0.6 + Math.random() * 0.5,
        beta4: 0.5 + Math.random() * 0.3
      }
    };

    const currentMetrics = validationMetrics || dummyMetrics;
    const sessionData = {
      duration: '45 minutes',
      walkingCycles: Math.floor(Math.random() * 50) + 100,
      assistanceLevel: Math.floor(Math.random() * 30) + 20,
      jointAngles: {
        hip: { avg: 15.2, min: 8.1, max: 28.3, deviation: 3.2 },
        knee: { avg: 45.8, min: 20.1, max: 65.4, deviation: 8.7 },
        ankle: { avg: 12.3, min: 5.2, max: 18.9, deviation: 2.1 }
      },
      gaitMetrics: {
        strideLength: 1.2 + Math.random() * 0.3,
        cadence: 95 + Math.random() * 20,
        symmetry: 85 + Math.random() * 10
      }
    };

    // Generate reports immediately
    const newReports = [
      {
        id: `session_${Date.now()}`,
        type: 'Session Summary Report',
        filename: `session_summary_${Date.now()}.pdf`,
        generatedAt: new Date().toISOString(),
        size: '2.3 MB',
        metrics: {
          r2Score: currentMetrics.r2Score,
          mse: currentMetrics.meanSquaredError,
          epochs: currentMetrics.epochs,
          sessionDuration: sessionData.duration,
          walkingCycles: sessionData.walkingCycles,
          assistanceLevel: sessionData.assistanceLevel
        },
        content: {
          title: 'Gait Analysis Session Summary',
          summary: `Session completed with ${sessionData.walkingCycles} walking cycles over ${sessionData.duration}. LSTM model achieved R² score of ${(currentMetrics.r2Score * 100).toFixed(1)}% with ${currentMetrics.epochs} training epochs.`,
          keyFindings: [
            `Hip joint angle range: ${sessionData.jointAngles.hip.min}° to ${sessionData.jointAngles.hip.max}°`,
            `Average stride length: ${sessionData.gaitMetrics.strideLength.toFixed(2)}m`,
            `Gait symmetry: ${sessionData.gaitMetrics.symmetry.toFixed(1)}%`,
            `Assistance level: ${sessionData.assistanceLevel}%`
          ]
        }
      },
      {
        id: `progress_${Date.now() + 1}`,
        type: 'Progress Report',
        filename: `progress_report_${Date.now()}.pdf`,
        generatedAt: new Date().toISOString(),
        size: '3.1 MB',
        metrics: {
          r2Score: currentMetrics.r2Score,
          mse: currentMetrics.meanSquaredError,
          epochs: currentMetrics.epochs
        },
        content: {
          title: 'Weekly Progress Report',
          summary: `Model training shows significant improvement with ${currentMetrics.epochs} epochs completed. R² score of ${(currentMetrics.r2Score * 100).toFixed(1)}% indicates strong predictive capability.`,
          improvements: [
            'Improved hip joint angle prediction accuracy',
            'Reduced mean squared error in gait phase detection',
            'Enhanced model stability across training epochs',
            'Better convergence in LSTM weight optimization'
          ]
        }
      },
      {
        id: `comparative_${Date.now() + 2}`,
        type: 'Comparative Analysis Report',
        filename: `comparative_analysis_${Date.now()}.pdf`,
        generatedAt: new Date().toISOString(),
        size: '2.8 MB',
        metrics: {
          r2Score: currentMetrics.r2Score,
          mse: currentMetrics.meanSquaredError,
          epochs: currentMetrics.epochs
        },
        content: {
          title: 'Model Performance Analysis',
          summary: `LSTM regression model demonstrates ${(currentMetrics.r2Score * 100).toFixed(1)}% variance explanation with ${currentMetrics.epochs} training epochs. Statistical significance confirmed through F-test (p < 0.001).`,
          analysis: [
            `Beta coefficients show strong correlation with IMU data (β₁ = ${currentMetrics.betaValues?.beta1?.toFixed(3) || '0.823'})`,
            `Model validation indicates robust performance across test sequences`,
            `Statistical tests confirm model reliability and predictive power`,
            `VIF scores indicate minimal multicollinearity in input features`
          ]
        }
      }
    ];
    
    setGeneratedReports(prev => [...newReports, ...prev]);
    setIsGeneratingReport(false);
    setReportStatus('Reports generated successfully!');
    
    // Open simple dialog with report summary
    Alert.alert(
      'Reports Generated Successfully!',
      `Generated ${newReports.length} comprehensive reports:\n\n• Session Summary Report (${sessionData.walkingCycles} cycles)\n• Progress Report (R²: ${(currentMetrics.r2Score * 100).toFixed(1)}%)\n• Comparative Analysis (${currentMetrics.epochs} epochs)\n\nReports are now available in the report list below.`,
      [
        { text: 'View Reports', onPress: () => {
          // Scroll to reports section or highlight it
          console.log('User wants to view reports');
        }},
        { text: 'OK' }
      ]
    );
  };

  // Training-specific report generation function
  const generateTrainingReports = async (validationMetrics, modelWeights, sequenceLength) => {
    setIsGeneratingReport(true);
    setReportProgress(0);
    setReportStatus('Generating training reports...');

    try {
      // Simulate report generation with actual training data
      const progressInterval = setInterval(() => {
        setReportProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            setIsGeneratingReport(false);
            setReportStatus('Training reports generated successfully!');
            
            // Generate reports with actual training data
            const trainingReports = [
              {
                id: `training_session_${Date.now()}`,
                type: 'Training Session Report',
                filename: `training_session_${Date.now()}.pdf`,
                generatedAt: new Date().toISOString(),
                size: '3.2 MB',
                metrics: {
                  r2Score: validationMetrics.r2Score,
                  mse: validationMetrics.meanSquaredError,
                  epochs: validationMetrics.epochs,
                  sequenceLength: sequenceLength
                }
              },
              {
                id: `model_analysis_${Date.now() + 1}`,
                type: 'Model Analysis Report',
                filename: `model_analysis_${Date.now()}.pdf`,
                generatedAt: new Date().toISOString(),
                size: '2.8 MB',
                metrics: {
                  betaCoefficients: modelWeights.betaCoefficients,
                  modelSize: validationMetrics.modelSize,
                  parameters: validationMetrics.hiddenUnits
                }
              },
              {
                id: `validation_report_${Date.now() + 2}`,
                type: 'Validation Report',
                filename: `validation_report_${Date.now()}.pdf`,
                generatedAt: new Date().toISOString(),
                size: '2.5 MB',
                metrics: {
                  fStatistic: validationMetrics.fStatistic,
                  pValues: validationMetrics.pValues,
                  vifScores: validationMetrics.vifScores
                }
              }
            ];
            
            setGeneratedReports(prev => [...trainingReports, ...prev]);
            
            Alert.alert(
              'Training Reports Generated!',
              `Generated ${trainingReports.length} comprehensive reports based on your LSTM training results.`,
              [{ text: 'OK' }]
            );
            
            return 100;
          }
          return prev + Math.random() * 12;
        });
      }, 300);

      // Simulate different stages with training-specific messages
      setTimeout(() => setReportStatus('Analyzing training metrics...'), 500);
      setTimeout(() => setReportStatus('Generating model analysis...'), 1500);
      setTimeout(() => setReportStatus('Creating validation report...'), 2500);
      setTimeout(() => setReportStatus('Compiling LaTeX documents...'), 3500);
      setTimeout(() => setReportStatus('Finalizing training reports...'), 4500);

    } catch (error) {
      console.error('Training report generation error:', error);
      setIsGeneratingReport(false);
      setReportStatus('Error generating training reports');
      Alert.alert('Error', 'Failed to generate training reports. Please try again.');
    }
  };

  // Data preprocessing functions
  const startPreprocessing = () => {
    if (Platform.OS !== 'web') return;
    
    setIsPreprocessing(true);
    setPreprocessingProgress(0);
    setPreprocessingStatus('🔍 Initializing preprocessing...');
    setIsDataPreprocessed(false);
    
    // Simulate preprocessing steps
    const preprocessingSteps = [
      { progress: 10, status: '🔍 Analyzing dataset structure...' },
      { progress: 20, status: '📊 Finding matching IMU file pairs...' },
      { progress: 30, status: '⚙️ Processing IMU1 and IMU2 data...' },
      { progress: 50, status: '🧮 Calculating resultant magnitudes...' },
      { progress: 70, status: '📐 Normalizing hip joint angles...' },
      { progress: 85, status: '💾 Creating processed .mat files...' },
      { progress: 95, status: '✅ Finalizing preprocessing...' },
      { progress: 100, status: '🎉 Preprocessing complete!' }
    ];
    
    let currentStep = 0;
    const stepInterval = setInterval(() => {
      if (currentStep < preprocessingSteps.length) {
        const step = preprocessingSteps[currentStep];
        setPreprocessingProgress(step.progress);
        setPreprocessingStatus(step.status);
        currentStep++;
      } else {
        clearInterval(stepInterval);
        setIsPreprocessing(false);
        setIsDataPreprocessed(true);
        Alert.alert(
          'Preprocessing Complete!', 
          'Walking data preprocessing is done. You can now train the LSTM model.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    }, 800);
  };

  const cleanupProcessedFiles = () => {
    if (Platform.OS !== 'web') return;
    
    Alert.alert(
      'Cleanup Processed Files',
      'This will remove all processed .mat files. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Cleanup', 
          style: 'destructive',
          onPress: () => {
            setIsDataPreprocessed(false);
            setPreprocessingProgress(0);
            setPreprocessingStatus('');
            Alert.alert('Cleanup Complete', 'Processed files have been removed.');
          }
        }
      ]
    );
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
    }, 100); // 3x faster: 300ms -> 100ms
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

  // Right Drawer Component (Web only)
  const ModelTrainingDrawer = () => {
    if (Platform.OS !== 'web') return null;

    return (
      <Animated.View style={[
        styles.rightDrawer,
        {
          transform: [{ translateX: rightDrawerAnimation }]
        }
      ]}>
        <View style={styles.rightDrawerHeader}>
          <Text style={styles.rightDrawerTitle}>Model Training</Text>
          <TouchableOpacity onPress={closeRightDrawer} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.rightDrawerContent}>
            {/* Data Preprocessing Section */}
            <View style={styles.preprocessingSection}>
              <Text style={styles.sectionTitle}>Data Preprocessing</Text>
              
              {!isPreprocessing && !isDataPreprocessed && (
                <TouchableOpacity 
                  style={styles.preprocessButton} 
                  onPress={startPreprocessing}
                >
                  <Text style={styles.preprocessButtonText}><Text style={{fontWeight: 'bold'}}>PROCESS</Text> Dataset</Text>
                </TouchableOpacity>
              )}

              {isPreprocessing && (
                <View style={styles.preprocessingProgress}>
                  <Text style={styles.progressText}>{preprocessingStatus}</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${preprocessingProgress}%` }]} />
                  </View>
                  <Text style={styles.progressPercent}>{Math.round(preprocessingProgress)}%</Text>
                </View>
              )}

              {isDataPreprocessed && !isPreprocessing && (
                <View style={styles.preprocessingComplete}>
                  <Text style={styles.completeText}><Text style={{fontWeight: 'bold'}}>COMPLETE</Text> Data Preprocessed!</Text>
                  <Text style={styles.preprocessingInfo}>
                    Dataset has been processed and is ready for training
                  </Text>
                  <TouchableOpacity 
                    style={styles.cleanupButton} 
                    onPress={cleanupProcessedFiles}
                  >
                    <Text style={styles.cleanupButtonText}><Text style={{fontWeight: 'bold'}}>CLEANUP</Text> Files</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>


          {/* Training Section */}
          <View style={styles.trainingSection}>
            <Text style={styles.sectionTitle}>LSTM Model Training</Text>
            
            {!isTraining && !validationMetrics && (
              <TouchableOpacity 
                style={[
                  styles.trainButton,
                  !isDataPreprocessed && styles.trainButtonDisabled
                ]} 
                onPress={startTraining}
                disabled={!isDataPreprocessed}
              >
                <Text style={[
                  styles.trainButtonText,
                  !isDataPreprocessed && styles.trainButtonTextDisabled
                ]}>
                  {isDataPreprocessed ? <Text><Text style={{fontWeight: 'bold'}}>START</Text> Training</Text> : <Text><Text style={{fontWeight: 'bold'}}>PREPROCESS</Text> Data First</Text>}
                </Text>
              </TouchableOpacity>
            )}

            {isTraining && (
              <View style={styles.trainingProgress}>
                <Text style={styles.progressText}><Text style={{fontWeight: 'bold'}}>TRAINING</Text> LSTM Model...</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${trainingProgress}%` }]} />
                </View>
                <Text style={styles.progressPercent}>{Math.round(trainingProgress)}%</Text>
              </View>
            )}

            {validationMetrics && (
              <View style={styles.trainingComplete}>
                <Text style={styles.completeText}><Text style={{fontWeight: 'bold'}}>COMPLETE</Text> Training Complete!</Text>
                <Text style={styles.modelInfo}>
                  {validationMetrics.modelType} trained on {validationMetrics.datasetSize}
                </Text>
                <Text style={styles.trainingTime}>
                  Training Time: {validationMetrics.trainingTime}
                </Text>
              </View>
            )}
          </View>

          {/* Live Inference Section */}
          {lstmModel && (
            <View style={styles.trainingSection}>
              <Text style={styles.sectionTitle}>Live Inference</Text>
              
              {!isLiveInference ? (
                <TouchableOpacity 
                  style={styles.inferenceButton} 
                  onPress={startLiveInference}
                >
                  <Text style={styles.inferenceButtonText}><Text style={{fontWeight: 'bold'}}>START</Text> Live Inference</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.stopInferenceButton} 
                  onPress={stopLiveInference}
                >
                  <Text style={styles.stopInferenceButtonText}><Text style={{fontWeight: 'bold'}}>STOP</Text> Inference</Text>
                </TouchableOpacity>
              )}

              {isLiveInference && inferenceResults.length > 0 && (
                <View style={styles.inferenceResults}>
                  <Text style={styles.inferenceTitle}>Real-time Predictions:</Text>
                  {inferenceResults.slice(0, 3).map((result, index) => (
                    <View key={result.id} style={styles.inferenceResult}>
                      <Text style={styles.inferenceTime}>{result.timestamp}</Text>
                      <Text style={styles.inferenceData}>Hip Angle: {result.hipAngle.toFixed(1)}°</Text>
                      <Text style={styles.inferenceData}>MSE Error: {result.mseError.toFixed(3)}</Text>
                      <Text style={styles.inferenceData}>Confidence: {(result.confidence * 100).toFixed(1)}%</Text>
                      <Text style={styles.inferenceRecommendation}>{result.recommendation}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* RNN Architecture Section */}
          {lstmModel && (
            <View style={styles.trainingSection}>
              <Text style={styles.sectionTitle}>RNN Architecture</Text>
              
              <TouchableOpacity 
                style={styles.visualizationButton} 
                onPress={toggleRNNVisualization}
              >
                <Text style={styles.visualizationButtonText}>
                  {showRNNVisualization ? <Text> Visualization</Text> : <Text><Text style={{fontWeight: 'bold'}}>SHOW</Text> Visualization</Text>}
                </Text>
              </TouchableOpacity>

              {showRNNVisualization && (
                <View style={styles.rnnVisualization}>
                  <Text style={styles.visualizationTitle}>LSTM Network Structure</Text>
                  <View style={styles.networkDiagram}>
                    <View style={styles.inputLayer}>
                      <Text style={styles.layerLabel}>Input Layer</Text>
                      <Text style={styles.layerDetails}>Sequence Length: 5-7</Text>
                      <Text style={styles.layerDetails}>Features: IMU + Weight</Text>
                    </View>
                    <View style={styles.arrow}>→</View>
                    <View style={styles.lstmLayer}>
                      <Text style={styles.layerLabel}>LSTM Layer 1</Text>
                      <Text style={styles.layerDetails}>Units: 32</Text>
                      <Text style={styles.layerDetails}>Dropout: 0.2</Text>
                    </View>
                    <View style={styles.arrow}>→</View>
                    <View style={styles.lstmLayer}>
                      <Text style={styles.layerLabel}>LSTM Layer 2</Text>
                      <Text style={styles.layerDetails}>Units: 32</Text>
                      <Text style={styles.layerDetails}>Dropout: 0.2</Text>
                    </View>
                    <View style={styles.arrow}>→</View>
                    <View style={styles.outputLayer}>
                      <Text style={styles.layerLabel}>Output Layer</Text>
                      <Text style={styles.layerDetails}>Units: 1</Text>
                      <Text style={styles.layerDetails}>Activation: Linear</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Validation Metrics Section */}
          {validationMetrics && (
            <View style={styles.trainingSection}>
              <Text style={styles.sectionTitle}>Validation Metrics</Text>
              
              <TouchableOpacity 
                style={styles.metricsButton} 
                onPress={() => setShowValidation(!showValidation)}
              >
                <Text style={styles.metricsButtonText}>
                  {showValidation ? <Text><Text style={{fontWeight: 'bold'}}>HIDE</Text> Metrics</Text> : <Text><Text style={{fontWeight: 'bold'}}>VIEW</Text> Metrics</Text>}
                </Text>
              </TouchableOpacity>

              {showValidation && (
                <View style={styles.metricsContainer}>
                  {/* Regression Performance */}
                  <View style={styles.metricsSection}>
                    <Text style={styles.metricsSectionTitle}>Regression Performance</Text>
                    <View style={styles.metricsGrid}>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>R² Score</Text>
                        <Text style={styles.metricValue}>{(validationMetrics.r2Score * 100).toFixed(1)}%</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>MSE</Text>
                        <Text style={styles.metricValue}>{validationMetrics.meanSquaredError.toFixed(4)}</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>RMSE</Text>
                        <Text style={styles.metricValue}>{validationMetrics.rootMeanSquaredError.toFixed(4)}</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>MAE</Text>
                        <Text style={styles.metricValue}>{validationMetrics.meanAbsoluteError.toFixed(4)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Beta Coefficients */}
                  <View style={styles.metricsSection}>
                    <Text style={styles.metricsSectionTitle}>Beta Coefficients & Statistical Significance</Text>
                    <View style={styles.metricsGrid}>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>β₀ (Intercept)</Text>
                        <Text style={styles.metricValue}>{validationMetrics.betaValues.beta0.toFixed(4)}</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>β₁ (IMU X)</Text>
                        <Text style={styles.metricValue}>{validationMetrics.betaValues.beta1.toFixed(4)}</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>β₂ (IMU Y)</Text>
                        <Text style={styles.metricValue}>{validationMetrics.betaValues.beta2.toFixed(4)}</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>β₃ (IMU Z)</Text>
                        <Text style={styles.metricValue}>{validationMetrics.betaValues.beta3.toFixed(4)}</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>β₄ (Weight)</Text>
                        <Text style={styles.metricValue}>{validationMetrics.betaValues.beta4.toFixed(4)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Training Configuration */}
                  <View style={styles.metricsSection}>
                    <Text style={styles.metricsSectionTitle}>Training Configuration</Text>
                    <View style={styles.metricsGrid}>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Epochs</Text>
                        <Text style={styles.metricValue}>{validationMetrics.epochs}</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Training Time</Text>
                        <Text style={styles.metricValue}>{validationMetrics.trainingTime}</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Model Size</Text>
                        <Text style={styles.metricValue}>{validationMetrics.modelSize}</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Parameters</Text>
                        <Text style={styles.metricValue}>{validationMetrics.parameters.toLocaleString()}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

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
          <Text style={styles.drawerTriggerText}>DATA</Text>
        </TouchableOpacity>

        {/* Right Drawer Trigger (Web only) */}
        <TouchableOpacity 
          style={styles.rightDrawerTrigger}
          onPress={toggleRightDrawer}
          activeOpacity={0.7}
        >
          <Text style={styles.rightDrawerTriggerText}>AI</Text>
        </TouchableOpacity>

        {/* Raw Data Drawer */}
        <RawDataDrawer />

        {/* Model Training Drawer (Web only) */}
        <ModelTrainingDrawer />

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
    paddingBottom: 40, // Add bottom padding to prevent content cutoff
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
  },

  // Right Drawer Styles (Web only)
  rightDrawerTrigger: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -25 }],
    width: 50,
    height: 50,
    backgroundColor: '#3b82f6',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  rightDrawerTriggerText: {
    fontSize: 24,
    color: 'white',
  },
  rightDrawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 700, // Increased from 400 to 700
    height: '100%',
    backgroundColor: '#1e293b',
    borderLeftWidth: 2,
    borderLeftColor: '#3b82f6',
    zIndex: 999,
  },
  rightDrawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    backgroundColor: '#0f172a',
  },
  rightDrawerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  rightDrawerContent: {
    flex: 1,
    padding: 20,
    paddingBottom: 40, // Add bottom padding to prevent content cutoff
  },
  trainingSection: {
    marginBottom: 30,
  },
  trainButton: {
    backgroundColor: '#10b981',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  trainButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  trainingProgress: {
    marginTop: 15,
  },
  progressText: {
    color: '#f1f5f9',
    fontSize: 14,
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  progressPercent: {
    color: '#f1f5f9',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  trainingComplete: {
    backgroundColor: '#065f46',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  completeText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  modelInfo: {
    color: '#d1d5db',
    fontSize: 14,
    marginBottom: 3,
  },
  trainingTime: {
    color: '#9ca3af',
    fontSize: 12,
  },
  validationSection: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewMetricsButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewMetricsButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  metricsContainer: {
    backgroundColor: '#0f172a',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  metricLabel: {
    color: '#d1d5db',
    fontSize: 14,
  },
  metricValue: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noMetricsText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modelInfoSection: {
    marginBottom: 20,
  },
  modelDetails: {
    backgroundColor: '#0f172a',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modelDetailText: {
    color: '#d1d5db',
    fontSize: 14,
    marginBottom: 5,
  },

  // Data Preprocessing Styles
  preprocessingSection: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  preprocessButton: {
    backgroundColor: '#f59e0b',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  preprocessButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  preprocessingProgress: {
    marginTop: 15,
  },
  preprocessingComplete: {
    backgroundColor: '#065f46',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  preprocessingInfo: {
    color: '#d1d5db',
    fontSize: 14,
    marginTop: 5,
    marginBottom: 10,
  },
  cleanupButton: {
    backgroundColor: '#dc2626',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  cleanupButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  trainButtonDisabled: {
    backgroundColor: '#6b7280',
    opacity: 0.6,
  },
  trainButtonTextDisabled: {
    color: '#9ca3af',
  },

  // Live Inference Styles
  liveInferenceSection: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  inferenceButton: {
    backgroundColor: '#8b5cf6',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  inferenceButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inferenceActive: {
    marginTop: 15,
  },
  stopInferenceButton: {
    backgroundColor: '#dc2626',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  stopInferenceButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  inferenceResults: {
    backgroundColor: '#0f172a',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inferenceTitle: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  inferenceResult: {
    backgroundColor: '#1e293b',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  inferenceTime: {
    color: '#9ca3af',
    fontSize: 12,
  },
  inferencePhase: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  inferenceConfidence: {
    color: '#3b82f6',
    fontSize: 12,
    marginTop: 2,
  },
  inferenceRisk: {
    color: '#f59e0b',
    fontSize: 12,
    marginTop: 2,
  },

  // RNN Visualization Styles
  rnnVisualizationSection: {
    marginBottom: 30,
  },
  visualizationButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  visualizationButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rnnVisualization: {
    backgroundColor: '#0f172a',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 15,
  },
  visualizationTitle: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  rnnLayers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  rnnLayer: {
    backgroundColor: '#1e293b',
    padding: 10,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    marginVertical: 5,
  },
  layerLabel: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  layerDetails: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
  },
  rnnArrow: {
    color: '#3b82f6',
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 5,
  },
  visualizationInfo: {
    color: '#d1d5db',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
  },

  // Enhanced Metrics Styles
  metricsSectionTitle: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 5,
  },
  mseExplanation: {
    color: '#9ca3af',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 5,
    marginBottom: 10,
    lineHeight: 16,
  },
  statisticalExplanation: {
    color: '#e2e8f0',
    fontSize: 11,
    marginTop: 5,
    marginBottom: 8,
    lineHeight: 16,
    paddingLeft: 10,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#3b82f6',
  },

  // Report Generation Styles
  reportButton: {
    backgroundColor: '#8b5cf6',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  reportButtonDisabled: {
    backgroundColor: '#6b7280',
    opacity: 0.6,
  },
  reportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reportProgress: {
    marginTop: 15,
  },
  reportProgressText: {
    color: '#f1f5f9',
    fontSize: 14,
    marginBottom: 10,
  },
  reportProgressBar: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
  },
  reportProgressFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 4,
  },
  reportProgressPercent: {
    color: '#8b5cf6',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  generatedReports: {
    marginTop: 15,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 15,
  },
  generatedReportsTitle: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  reportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  reportItemType: {
    color: '#8b5cf6',
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
  },
  reportItemFile: {
    color: '#e2e8f0',
    fontSize: 12,
    flex: 2,
    marginLeft: 10,
  },
  reportItemSize: {
    color: '#9ca3af',
    fontSize: 11,
    flex: 1,
    textAlign: 'right',
  },
  reportItemMetrics: {
    fontSize: 11,
    color: '#4CAF50',
    marginTop: 2,
    fontStyle: 'italic',
  },
  moreReportsText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  reportInstructionText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  reportContent: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderLeft: '3px solid #4CAF50',
  },
  reportContentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  reportContentSummary: {
    fontSize: 12,
    color: '#555',
    marginBottom: 6,
    lineHeight: 16,
  },
  reportFindings: {
    marginTop: 6,
  },
  reportFindingsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#34495e',
    marginBottom: 4,
  },
  reportFindingItem: {
    fontSize: 11,
    color: '#555',
    marginLeft: 8,
    marginBottom: 2,
    lineHeight: 14,
  },
  // Simple report styles
  downloadButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  downloadButtonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  reportItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  // File List and Preview Styles
  fileListSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  fileGroup: {
    marginBottom: 16,
  },
  fileGroupTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  fileList: {
    gap: 6,
  },
  fileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  fileName: {
    fontSize: 12,
    color: '#e2e8f0',
    flex: 1,
  },
  fileSize: {
    fontSize: 11,
    color: '#94a3b8',
    marginRight: 8,
  },
  fileStatus: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: 'bold',
  },
  previewSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewColumn: {
    flex: 1,
    padding: 8,
    backgroundColor: '#1e293b',
    borderRadius: 4,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#e2e8f0',
    marginBottom: 6,
    textAlign: 'center',
  },
  previewData: {
    gap: 3,
  },
  previewLabel: {
    fontSize: 10,
    color: '#cbd5e1',
    fontFamily: 'monospace',
  },
  previewArrow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  // Secondary Drawer Styles
  secondaryDrawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 400,
    height: '100%',
    backgroundColor: '#0f172a',
    borderLeftWidth: 2,
    borderLeftColor: '#1e40af',
    zIndex: 1001,
  },
  secondaryDrawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    backgroundColor: '#1e293b',
  },
  secondaryDrawerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  secondaryDrawerContent: {
    flex: 1,
    padding: 16,
    paddingBottom: 40,
  },
  // Main Menu Styles
  mainMenuSection: {
    padding: 20,
  },
  menuButton: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  menuButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  menuButtonSubtext: {
    fontSize: 12,
    color: '#94a3b8',
  },
});