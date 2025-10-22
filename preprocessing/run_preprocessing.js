#!/usr/bin/env node
/**
 * Node.js wrapper for IMU data preprocessing
 * Runs the Python preprocessing script and handles communication with React Native
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class PreprocessingRunner {
    constructor() {
        this.pythonScript = path.join(__dirname, 'imu_preprocessing.py');
        this.datasetPath = path.join(__dirname, '..', 'dataset');
        this.outputPath = path.join(__dirname, '..', 'dataset', 'processed');
    }

    /**
     * Run the preprocessing pipeline
     * @param {Function} onProgress - Callback for progress updates
     * @param {Function} onComplete - Callback for completion
     * @param {Function} onError - Callback for errors
     */
    async runPreprocessing(onProgress, onComplete, onError) {
        try {
            // Check if Python is available
            const pythonCheck = await this.checkPython();
            if (!pythonCheck.available) {
                onError(`Python not found: ${pythonCheck.error}`);
                return;
            }

            // Check if dataset directory exists
            if (!fs.existsSync(this.datasetPath)) {
                onError(`Dataset directory not found: ${this.datasetPath}`);
                return;
            }

            // Create output directory if it doesn't exist
            if (!fs.existsSync(this.outputPath)) {
                fs.mkdirSync(this.outputPath, { recursive: true });
            }

            onProgress(10, '🔍 Analyzing dataset structure...');

            // Run the Python preprocessing script
            const pythonProcess = spawn('python', [
                this.pythonScript,
                '--dataset-path', this.datasetPath,
                '--output-path', this.outputPath
            ], {
                cwd: __dirname,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
                console.log('Python output:', data.toString());
                
                // Parse progress from output
                if (data.toString().includes('Processing pair')) {
                    onProgress(50, '⚙️ Processing IMU data pairs...');
                } else if (data.toString().includes('Successfully processed')) {
                    onProgress(70, '✅ Processing individual files...');
                }
            });

            pythonProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
                console.error('Python error:', data.toString());
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    onProgress(100, '🎉 Preprocessing complete!');
                    onComplete({
                        success: true,
                        output: output,
                        processedFiles: this.getProcessedFiles()
                    });
                } else {
                    onError(`Python script failed with code ${code}: ${errorOutput}`);
                }
            });

            pythonProcess.on('error', (error) => {
                onError(`Failed to start Python process: ${error.message}`);
            });

        } catch (error) {
            onError(`Preprocessing failed: ${error.message}`);
        }
    }

    /**
     * Clean up processed files
     * @param {Function} onComplete - Callback for completion
     * @param {Function} onError - Callback for errors
     */
    async cleanupProcessedFiles(onComplete, onError) {
        try {
            const pythonProcess = spawn('python', [
                this.pythonScript,
                '--dataset-path', this.datasetPath,
                '--output-path', this.outputPath,
                '--cleanup'
            ], {
                cwd: __dirname,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    onComplete({
                        success: true,
                        message: 'Processed files cleaned up successfully',
                        output: output
                    });
                } else {
                    onError(`Cleanup failed with code ${code}: ${errorOutput}`);
                }
            });

            pythonProcess.on('error', (error) => {
                onError(`Failed to run cleanup: ${error.message}`);
            });

        } catch (error) {
            onError(`Cleanup failed: ${error.message}`);
        }
    }

    /**
     * Check if Python is available
     */
    async checkPython() {
        return new Promise((resolve) => {
            const pythonProcess = spawn('python', ['--version'], { stdio: 'pipe' });
            
            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    resolve({ available: true });
                } else {
                    resolve({ available: false, error: 'Python not found in PATH' });
                }
            });

            pythonProcess.on('error', (error) => {
                resolve({ available: false, error: error.message });
            });
        });
    }

    /**
     * Get list of processed files
     */
    getProcessedFiles() {
        try {
            if (!fs.existsSync(this.outputPath)) {
                return [];
            }
            return fs.readdirSync(this.outputPath)
                .filter(file => file.endsWith('.mat'))
                .map(file => path.join(this.outputPath, file));
        } catch (error) {
            console.error('Error reading processed files:', error);
            return [];
        }
    }

    /**
     * Analyze a specific .mat file structure
     * @param {string} filename - Name of the file to analyze
     * @param {Function} onComplete - Callback for completion
     * @param {Function} onError - Callback for errors
     */
    async analyzeFile(filename, onComplete, onError) {
        try {
            const filePath = path.join(this.datasetPath, filename);
            
            if (!fs.existsSync(filePath)) {
                onError(`File not found: ${filename}`);
                return;
            }

            const pythonProcess = spawn('python', [
                this.pythonScript,
                '--dataset-path', this.datasetPath,
                '--analyze', filePath
            ], {
                cwd: __dirname,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        const analysis = JSON.parse(output);
                        onComplete(analysis);
                    } catch (parseError) {
                        onError(`Failed to parse analysis output: ${parseError.message}`);
                    }
                } else {
                    onError(`Analysis failed with code ${code}: ${errorOutput}`);
                }
            });

            pythonProcess.on('error', (error) => {
                onError(`Failed to run analysis: ${error.message}`);
            });

        } catch (error) {
            onError(`Analysis failed: ${error.message}`);
        }
    }
}

// Export for use in React Native
module.exports = PreprocessingRunner;

// CLI usage
if (require.main === module) {
    const runner = new PreprocessingRunner();
    
    const command = process.argv[2];
    
    if (command === 'preprocess') {
        runner.runPreprocessing(
            (progress, message) => {
                console.log(`[${progress}%] ${message}`);
            },
            (result) => {
                console.log('✅ Preprocessing completed successfully');
                console.log('Processed files:', result.processedFiles);
            },
            (error) => {
                console.error('❌ Preprocessing failed:', error);
                process.exit(1);
            }
        );
    } else if (command === 'cleanup') {
        runner.cleanupProcessedFiles(
            (result) => {
                console.log('✅ Cleanup completed successfully');
            },
            (error) => {
                console.error('❌ Cleanup failed:', error);
                process.exit(1);
            }
        );
    } else {
        console.log('Usage: node run_preprocessing.js [preprocess|cleanup]');
    }
}

