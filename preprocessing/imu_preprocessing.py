#!/usr/bin/env python3
"""
IMU Data Preprocessing Script for Gait Analysis
Processes .mat files containing IMU1 and IMU2 data to prepare for LSTM training.
"""

import os
import sys
import numpy as np
import scipy.io as sio
from pathlib import Path
import json
import argparse
from typing import Dict, List, Tuple, Optional

class IMUPreprocessor:
    def __init__(self, dataset_path: str, output_path: str = None):
        """
        Initialize the IMU preprocessor.
        
        Args:
            dataset_path: Path to the dataset folder containing .mat files
            output_path: Path to save processed files (defaults to dataset_path/processed)
        """
        self.dataset_path = Path(dataset_path)
        self.output_path = Path(output_path) if output_path else self.dataset_path / "processed"
        self.output_path.mkdir(exist_ok=True)
        
        # Normalization range for hip joint angles
        self.min_angle = -8.0
        self.max_angle = 28.0
        
        # Progress tracking
        self.progress = 0
        self.total_files = 0
        self.processed_files = 0
        
    def analyze_mat_structure(self, file_path: Path) -> Dict:
        """
        Analyze the structure of a .mat file to understand its data format.
        
        Args:
            file_path: Path to the .mat file
            
        Returns:
            Dictionary containing structure information
        """
        try:
            mat_data = sio.loadmat(str(file_path))
            
            # Remove MATLAB metadata
            mat_data = {k: v for k, v in mat_data.items() if not k.startswith('__')}
            
            structure_info = {
                'file_name': file_path.name,
                'keys': list(mat_data.keys()),
                'shapes': {},
                'data_types': {}
            }
            
            for key, value in mat_data.items():
                if isinstance(value, np.ndarray):
                    structure_info['shapes'][key] = value.shape
                    structure_info['data_types'][key] = str(value.dtype)
                    
                    # Check if it's 3D data (x, y, z components)
                    if len(value.shape) == 2 and value.shape[1] == 3:
                        structure_info['is_3d_data'] = True
                        structure_info['sample_count'] = value.shape[0]
                    elif len(value.shape) == 1:
                        structure_info['is_1d_data'] = True
                        structure_info['sample_count'] = value.shape[0]
            
            return structure_info
            
        except Exception as e:
            return {'error': str(e), 'file_name': file_path.name}
    
    def find_matching_files(self) -> Dict[str, List[Path]]:
        """
        Find matching IMU1 and IMU2 files based on their suffixes.
        
        Returns:
            Dictionary mapping suffixes to lists of matching files
        """
        imu1_files = list(self.dataset_path.glob("resultantIMU1*.mat"))
        imu2_files = list(self.dataset_path.glob("resultantIMU2*.mat"))
        
        # Extract suffixes from filenames
        imu1_suffixes = {}
        imu2_suffixes = {}
        
        for file in imu1_files:
            # Extract suffix (e.g., "4", "6", "8" from "resultantIMU1-4.mat")
            suffix = file.stem.replace("resultantIMU1", "").replace("-", "")
            if suffix == "":
                suffix = "base"
            imu1_suffixes[suffix] = file
            
        for file in imu2_files:
            suffix = file.stem.replace("resultantIMU2", "").replace("-", "")
            if suffix == "":
                suffix = "base"
            imu2_suffixes[suffix] = file
        
        # Find matching suffixes
        matching_pairs = {}
        for suffix in imu1_suffixes:
            if suffix in imu2_suffixes:
                matching_pairs[suffix] = {
                    'imu1': imu1_suffixes[suffix],
                    'imu2': imu2_suffixes[suffix]
                }
        
        return matching_pairs
    
    def calculate_resultant_magnitude(self, x: np.ndarray, y: np.ndarray, z: np.ndarray) -> np.ndarray:
        """
        Calculate the magnitude of 3D vectors using sqrt(x² + y² + z²).
        
        Args:
            x, y, z: Arrays of x, y, z components
            
        Returns:
            Array of magnitudes
        """
        return np.sqrt(x**2 + y**2 + z**2)
    
    def normalize_hip_angles(self, angles: np.ndarray) -> np.ndarray:
        """
        Normalize hip joint angles to the range [-8, 28] degrees.
        
        Args:
            angles: Array of hip joint angles
            
        Returns:
            Normalized angles in the range [-8, 28]
        """
        # Find current min and max
        current_min = np.min(angles)
        current_max = np.max(angles)
        
        # Avoid division by zero
        if current_max == current_min:
            return np.full_like(angles, (self.min_angle + self.max_angle) / 2)
        
        # Normalize to [0, 1] first
        normalized = (angles - current_min) / (current_max - current_min)
        
        # Scale to target range
        return normalized * (self.max_angle - self.min_angle) + self.min_angle
    
    def process_imu_pair(self, imu1_path: Path, imu2_path: Path, suffix: str) -> Dict:
        """
        Process a pair of IMU1 and IMU2 files.
        
        Args:
            imu1_path: Path to IMU1 .mat file
            imu2_path: Path to IMU2 .mat file
            suffix: Suffix identifier for the pair
            
        Returns:
            Dictionary containing processing results
        """
        try:
            # Load data
            imu1_data = sio.loadmat(str(imu1_path))
            imu2_data = sio.loadmat(str(imu2_path))
            
            # Remove MATLAB metadata
            imu1_data = {k: v for k, v in imu1_data.items() if not k.startswith('__')}
            imu2_data = {k: v for k, v in imu2_data.items() if not k.startswith('__')}
            
            # Find the main data arrays (assuming they're the largest arrays)
            imu1_key = max(imu1_data.keys(), key=lambda k: imu1_data[k].size if isinstance(imu1_data[k], np.ndarray) else 0)
            imu2_key = max(imu2_data.keys(), key=lambda k: imu2_data[k].size if isinstance(imu2_data[k], np.ndarray) else 0)
            
            imu1_array = imu1_data[imu1_key]
            imu2_array = imu2_data[imu2_key]
            
            # Ensure arrays have the same length
            min_length = min(len(imu1_array), len(imu2_array))
            imu1_array = imu1_array[:min_length]
            imu2_array = imu2_array[:min_length]
            
            # Process based on data structure
            if len(imu1_array.shape) == 2 and imu1_array.shape[1] == 3:
                # 3D data (x, y, z components)
                x1, y1, z1 = imu1_array[:, 0], imu1_array[:, 1], imu1_array[:, 2]
                x2, y2, z2 = imu2_array[:, 0], imu2_array[:, 1], imu2_array[:, 2]
                
                # Calculate resultant magnitudes
                magnitude1 = self.calculate_resultant_magnitude(x1, y1, z1)
                magnitude2 = self.calculate_resultant_magnitude(x2, y2, z2)
                
                # Calculate combined resultant
                combined_x = (x1 + x2) / 2
                combined_y = (y1 + y2) / 2
                combined_z = (z1 + z2) / 2
                combined_magnitude = self.calculate_resultant_magnitude(combined_x, combined_y, combined_z)
                
                # Normalize hip joint angles (using combined magnitude as proxy)
                normalized_angles = self.normalize_hip_angles(combined_magnitude)
                
                # Create processed data structure
                processed_data = {
                    'imu1_magnitude': magnitude1,
                    'imu2_magnitude': magnitude2,
                    'combined_magnitude': combined_magnitude,
                    'normalized_hip_angles': normalized_angles,
                    'imu1_xyz': imu1_array,
                    'imu2_xyz': imu2_array,
                    'combined_xyz': np.column_stack([combined_x, combined_y, combined_z]),
                    'metadata': {
                        'suffix': suffix,
                        'sample_count': min_length,
                        'imu1_file': imu1_path.name,
                        'imu2_file': imu2_path.name,
                        'processing_timestamp': str(np.datetime64('now'))
                    }
                }
                
            else:
                # 1D data - treat as magnitude directly
                magnitude1 = imu1_array.flatten()
                magnitude2 = imu2_array.flatten()
                
                # Calculate combined magnitude
                combined_magnitude = (magnitude1 + magnitude2) / 2
                
                # Normalize hip joint angles
                normalized_angles = self.normalize_hip_angles(combined_magnitude)
                
                processed_data = {
                    'imu1_magnitude': magnitude1,
                    'imu2_magnitude': magnitude2,
                    'combined_magnitude': combined_magnitude,
                    'normalized_hip_angles': normalized_angles,
                    'metadata': {
                        'suffix': suffix,
                        'sample_count': min_length,
                        'imu1_file': imu1_path.name,
                        'imu2_file': imu2_path.name,
                        'processing_timestamp': str(np.datetime64('now'))
                    }
                }
            
            # Save processed data
            output_file = self.output_path / f"walk-{suffix}.mat"
            sio.savemat(str(output_file), processed_data)
            
            return {
                'success': True,
                'output_file': str(output_file),
                'sample_count': min_length,
                'suffix': suffix
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'suffix': suffix
            }
    
    def process_all_files(self) -> Dict:
        """
        Process all matching IMU file pairs.
        
        Returns:
            Dictionary containing processing results
        """
        print("🔍 Finding matching IMU files...")
        matching_pairs = self.find_matching_files()
        
        if not matching_pairs:
            return {'error': 'No matching IMU file pairs found'}
        
        print(f"📊 Found {len(matching_pairs)} matching file pairs")
        
        results = {
            'total_pairs': len(matching_pairs),
            'successful': 0,
            'failed': 0,
            'processed_files': [],
            'errors': []
        }
        
        for suffix, pair_info in matching_pairs.items():
            print(f"⚙️ Processing pair {suffix}...")
            
            result = self.process_imu_pair(
                pair_info['imu1'], 
                pair_info['imu2'], 
                suffix
            )
            
            if result['success']:
                results['successful'] += 1
                results['processed_files'].append(result['output_file'])
                print(f"✅ Successfully processed {suffix}")
            else:
                results['failed'] += 1
                results['errors'].append({
                    'suffix': suffix,
                    'error': result['error']
                })
                print(f"❌ Failed to process {suffix}: {result['error']}")
        
        return results
    
    def cleanup_processed_files(self):
        """
        Remove all processed files from the output directory.
        """
        try:
            processed_files = list(self.output_path.glob("walk-*.mat"))
            for file in processed_files:
                file.unlink()
            print(f"🧹 Cleaned up {len(processed_files)} processed files")
            return len(processed_files)
        except Exception as e:
            print(f"❌ Error during cleanup: {e}")
            return 0

def main():
    parser = argparse.ArgumentParser(description='IMU Data Preprocessing for Gait Analysis')
    parser.add_argument('--dataset-path', required=True, help='Path to dataset folder')
    parser.add_argument('--output-path', help='Path to save processed files')
    parser.add_argument('--cleanup', action='store_true', help='Clean up processed files')
    parser.add_argument('--analyze', help='Analyze structure of a specific .mat file')
    
    args = parser.parse_args()
    
    preprocessor = IMUPreprocessor(args.dataset_path, args.output_path)
    
    if args.cleanup:
        cleaned_count = preprocessor.cleanup_processed_files()
        print(f"🧹 Cleanup complete: {cleaned_count} files removed")
        return
    
    if args.analyze:
        file_path = Path(args.analyze)
        if file_path.exists():
            structure = preprocessor.analyze_mat_structure(file_path)
            print(json.dumps(structure, indent=2))
        else:
            print(f"❌ File not found: {file_path}")
        return
    
    # Process all files
    print("🚀 Starting IMU data preprocessing...")
    results = preprocessor.process_all_files()
    
    print("\n📊 Processing Results:")
    print(f"✅ Successful: {results['successful']}")
    print(f"❌ Failed: {results['failed']}")
    print(f"📁 Total pairs: {results['total_pairs']}")
    
    if results['errors']:
        print("\n❌ Errors:")
        for error in results['errors']:
            print(f"  - {error['suffix']}: {error['error']}")
    
    print(f"\n🎉 Preprocessing complete! Processed files saved to: {preprocessor.output_path}")

if __name__ == "__main__":
    main()

