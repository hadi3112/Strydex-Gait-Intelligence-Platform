const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class ReportGenerator {
    constructor() {
        this.reportsDir = path.join(__dirname, 'generated');
        this.ensureReportsDir();
    }

    ensureReportsDir() {
        if (!fs.existsSync(this.reportsDir)) {
            fs.mkdirSync(this.reportsDir, { recursive: true });
        }
    }

    async generateSessionSummary(sessionData) {
        return new Promise((resolve, reject) => {
            const pythonScript = path.join(__dirname, 'session_summary_report.py');
            const pythonProcess = spawn('python', [pythonScript], {
                cwd: __dirname,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Send session data to Python script
            pythonProcess.stdin.write(JSON.stringify(sessionData));
            pythonProcess.stdin.end();

            let output = '';
            let error = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                error += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    // Find the generated PDF path
                    const pdfPath = this.findGeneratedPDF('summary');
                    resolve({
                        success: true,
                        pdfPath: pdfPath,
                        output: output
                    });
                } else {
                    reject({
                        success: false,
                        error: error,
                        code: code
                    });
                }
            });
        });
    }

    async generateProgressReport(progressData) {
        return new Promise((resolve, reject) => {
            const pythonScript = path.join(__dirname, 'progress_report.py');
            const pythonProcess = spawn('python', [pythonScript], {
                cwd: __dirname,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Send progress data to Python script
            pythonProcess.stdin.write(JSON.stringify(progressData));
            pythonProcess.stdin.end();

            let output = '';
            let error = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                error += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    const pdfPath = this.findGeneratedPDF('progress');
                    resolve({
                        success: true,
                        pdfPath: pdfPath,
                        output: output
                    });
                } else {
                    reject({
                        success: false,
                        error: error,
                        code: code
                    });
                }
            });
        });
    }

    async generateComparativeAnalysis(comparisonData) {
        return new Promise((resolve, reject) => {
            const pythonScript = path.join(__dirname, 'comparative_analysis_report.py');
            const pythonProcess = spawn('python', [pythonScript], {
                cwd: __dirname,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Send comparison data to Python script
            pythonProcess.stdin.write(JSON.stringify(comparisonData));
            pythonProcess.stdin.end();

            let output = '';
            let error = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                error += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    const pdfPath = this.findGeneratedPDF('comparative_analysis');
                    resolve({
                        success: true,
                        pdfPath: pdfPath,
                        output: output
                    });
                } else {
                    reject({
                        success: false,
                        error: error,
                        code: code
                    });
                }
            });
        });
    }

    findGeneratedPDF(reportType) {
        try {
            const files = fs.readdirSync(this.reportsDir);
            const pdfFile = files.find(file => 
                file.includes(reportType) && file.endsWith('.pdf')
            );
            
            if (pdfFile) {
                return path.join(this.reportsDir, pdfFile);
            }
            return null;
        } catch (error) {
            console.error('Error finding generated PDF:', error);
            return null;
        }
    }

    async generateAllReports(patientData) {
        const results = {
            sessionSummary: null,
            progressReport: null,
            comparativeAnalysis: null
        };

        try {
            // Generate session summary
            results.sessionSummary = await this.generateSessionSummary(patientData.sessionData);
        } catch (error) {
            console.error('Session summary generation failed:', error);
        }

        try {
            // Generate progress report
            results.progressReport = await this.generateProgressReport(patientData.progressData);
        } catch (error) {
            console.error('Progress report generation failed:', error);
        }

        try {
            // Generate comparative analysis
            results.comparativeAnalysis = await this.generateComparativeAnalysis(patientData.comparisonData);
        } catch (error) {
            console.error('Comparative analysis generation failed:', error);
        }

        return results;
    }
}

module.exports = ReportGenerator;

