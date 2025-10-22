# IMU Data Preprocessing for Gait Analysis

This module provides preprocessing functionality for IMU (Inertial Measurement Unit) data used in gait analysis and LSTM model training.

## Features

- **Automatic File Pairing**: Finds matching IMU1 and IMU2 files based on suffixes
- **Data Structure Analysis**: Automatically detects .mat file structure and data format
- **Resultant Magnitude Calculation**: Computes √(x² + y² + z²) for 3D IMU data
- **Hip Joint Angle Normalization**: Normalizes angles to the range [-8°, 28°]
- **Processed File Generation**: Creates walk-*.mat files for LSTM training
- **Automatic Cleanup**: Removes processed files after training completion

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Install Node.js dependencies:
```bash
npm install
```

## Usage

### Command Line Interface

```bash
# Run preprocessing
node run_preprocessing.js preprocess

# Clean up processed files
node run_preprocessing.js cleanup

# Analyze a specific file structure
python imu_preprocessing.py --analyze dataset/resultantIMU1-4.mat
```

### Python Script Direct Usage

```bash
# Process all files in dataset folder
python imu_preprocessing.py --dataset-path ./dataset

# Process with custom output directory
python imu_preprocessing.py --dataset-path ./dataset --output-path ./processed

# Clean up processed files
python imu_preprocessing.py --dataset-path ./dataset --cleanup
```

## Data Processing Pipeline

1. **File Discovery**: Scans dataset folder for resultantIMU1*.mat and resultantIMU2*.mat files
2. **Pairing**: Matches files with identical suffixes (e.g., resultantIMU1-4.mat ↔ resultantIMU2-4.mat)
3. **Structure Analysis**: Determines data format (3D arrays vs 1D arrays)
4. **Magnitude Calculation**: Computes resultant magnitudes for each IMU
5. **Angle Normalization**: Normalizes hip joint angles to [-8°, 28°] range
6. **File Generation**: Creates processed walk-*.mat files for LSTM training

## Output Files

Processed files are saved as `walk-{suffix}.mat` containing:
- `imu1_magnitude`: Magnitude data from IMU1
- `imu2_magnitude`: Magnitude data from IMU2
- `combined_magnitude`: Combined magnitude from both IMUs
- `normalized_hip_angles`: Normalized hip joint angles
- `metadata`: Processing information and timestamps

## Integration with React Native

The preprocessing module integrates with the React Native app through the training drawer:

1. **Data Handling Button**: Click "📊 Process Dataset" to start preprocessing
2. **Progress Tracking**: Real-time progress updates during processing
3. **Training Integration**: Preprocessing must be completed before model training
4. **Automatic Cleanup**: Processed files are removed after training completion

## File Structure

```
preprocessing/
├── imu_preprocessing.py      # Main Python preprocessing script
├── run_preprocessing.js      # Node.js wrapper for React Native integration
├── requirements.txt          # Python dependencies
├── package.json             # Node.js dependencies
└── README.md                # This file
```

## Error Handling

The preprocessing pipeline includes comprehensive error handling:
- File existence validation
- Data structure compatibility checks
- Processing error recovery
- Progress tracking and status updates

## Requirements

- Python 3.7+
- Node.js 14+
- NumPy
- SciPy
- Access to dataset folder with .mat files

