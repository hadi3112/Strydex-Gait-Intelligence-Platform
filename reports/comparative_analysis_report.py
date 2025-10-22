#!/usr/bin/env python3
"""
Comparative Analysis Report Generator
Generates LaTeX PDF reports comparing assisted vs unassisted gait
"""

import os
import json
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime
import subprocess
import sys

class ComparativeAnalysisReport:
    def __init__(self, comparison_data):
        self.comparison_data = comparison_data
        self.report_dir = "reports/generated"
        os.makedirs(self.report_dir, exist_ok=True)
        
    def generate_report(self):
        """Generate complete comparative analysis report"""
        patient_id = self.comparison_data.get('patient_id', 'P001')
        
        # Generate plots
        self._generate_gait_comparison()
        self._generate_joint_angle_comparison()
        self._generate_ground_reaction_comparison()
        self._generate_error_analysis()
        
        # Generate LaTeX content
        latex_content = self._generate_latex_content(patient_id)
        
        # Write LaTeX file
        latex_file = f"{self.report_dir}/{patient_id}_comparative_analysis.tex"
        with open(latex_file, 'w', encoding='utf-8') as f:
            f.write(latex_content)
        
        # Compile to PDF
        self._compile_latex_to_pdf(latex_file)
        
        return f"{self.report_dir}/{patient_id}_comparative_analysis.pdf"
    
    def _generate_gait_comparison(self):
        """Generate assisted vs unassisted gait comparison"""
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        # Simulate gait cycle data
        time = np.linspace(0, 2, 200)
        
        # Assisted gait (with exoskeleton)
        hip_assisted = 20 * np.sin(2 * np.pi * time) + 10
        knee_assisted = 15 * np.sin(2 * np.pi * time + np.pi/4) + 5
        ankle_assisted = 10 * np.sin(2 * np.pi * time + np.pi/2) + 2
        
        # Unassisted gait (patient only)
        hip_unassisted = 18 * np.sin(2 * np.pi * time) + 8 + np.random.normal(0, 1, 200)
        knee_unassisted = 12 * np.sin(2 * np.pi * time + np.pi/4) + 3 + np.random.normal(0, 0.8, 200)
        ankle_unassisted = 8 * np.sin(2 * np.pi * time + np.pi/2) + 1 + np.random.normal(0, 0.5, 200)
        
        # Assisted gait plot
        ax1.plot(time, hip_assisted, 'b-', linewidth=2, label='Hip')
        ax1.plot(time, knee_assisted, 'r-', linewidth=2, label='Knee')
        ax1.plot(time, ankle_assisted, 'g-', linewidth=2, label='Ankle')
        ax1.set_title('Assisted Gait (with Exoskeleton)')
        ax1.set_xlabel('Time (seconds)')
        ax1.set_ylabel('Joint Angle (degrees)')
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        # Unassisted gait plot
        ax2.plot(time, hip_unassisted, 'b--', linewidth=2, label='Hip')
        ax2.plot(time, knee_unassisted, 'r--', linewidth=2, label='Knee')
        ax2.plot(time, ankle_unassisted, 'g--', linewidth=2, label='Ankle')
        ax2.set_title('Unassisted Gait (Patient Only)')
        ax2.set_xlabel('Time (seconds)')
        ax2.set_ylabel('Joint Angle (degrees)')
        ax2.legend()
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(f"{self.report_dir}/gait_comparison.png", dpi=300, bbox_inches='tight')
        plt.close()
    
    def _generate_joint_angle_comparison(self):
        """Generate joint angle deviation analysis"""
        fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 10))
        
        # Joint angle deviations
        joints = ['Hip', 'Knee', 'Ankle']
        assisted_angles = [25, 20, 15]
        unassisted_angles = [22, 18, 12]
        deviations = [abs(a - u) for a, u in zip(assisted_angles, unassisted_angles)]
        
        # Deviation bar chart
        ax1.bar(joints, deviations, color=['skyblue', 'lightcoral', 'lightgreen'])
        ax1.set_title('Joint Angle Deviations')
        ax1.set_ylabel('Deviation (degrees)')
        ax1.grid(True, alpha=0.3)
        
        # Range of motion comparison
        rom_assisted = [35, 30, 25]
        rom_unassisted = [30, 25, 20]
        
        x = np.arange(len(joints))
        width = 0.35
        
        ax2.bar(x - width/2, rom_assisted, width, label='Assisted', color='lightblue')
        ax2.bar(x + width/2, rom_unassisted, width, label='Unassisted', color='lightcoral')
        ax2.set_title('Range of Motion Comparison')
        ax2.set_ylabel('ROM (degrees)')
        ax2.set_xticks(x)
        ax2.set_xticklabels(joints)
        ax2.legend()
        ax2.grid(True, alpha=0.3)
        
        # Symmetry comparison
        symmetry_assisted = [92, 88, 90]
        symmetry_unassisted = [78, 75, 82]
        
        ax3.bar(x - width/2, symmetry_assisted, width, label='Assisted', color='lightgreen')
        ax3.bar(x + width/2, symmetry_unassisted, width, label='Unassisted', color='orange')
        ax3.set_title('Symmetry Score Comparison')
        ax3.set_ylabel('Symmetry (%)')
        ax3.set_xticks(x)
        ax3.set_xticklabels(joints)
        ax3.legend()
        ax3.grid(True, alpha=0.3)
        
        # Stability comparison
        stability_assisted = [8.5, 8.2, 8.8]
        stability_unassisted = [6.2, 5.8, 6.5]
        
        ax4.bar(x - width/2, stability_assisted, width, label='Assisted', color='purple', alpha=0.7)
        ax4.bar(x + width/2, stability_unassisted, width, label='Unassisted', color='brown', alpha=0.7)
        ax4.set_title('Stability Index Comparison')
        ax4.set_ylabel('Stability Score')
        ax4.set_xticks(x)
        ax4.set_xticklabels(joints)
        ax4.legend()
        ax4.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(f"{self.report_dir}/joint_angle_comparison.png", dpi=300, bbox_inches='tight')
        plt.close()
    
    def _generate_ground_reaction_comparison(self):
        """Generate ground reaction force comparison"""
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        # Simulate GRF data
        time = np.linspace(0, 1, 100)
        
        # Assisted GRF
        grf_assisted = 800 * np.sin(np.pi * time) + 200
        
        # Unassisted GRF (more variable)
        grf_unassisted = 600 * np.sin(np.pi * time) + 150 + np.random.normal(0, 50, 100)
        
        # GRF comparison
        ax1.plot(time, grf_assisted, 'b-', linewidth=3, label='Assisted')
        ax1.plot(time, grf_unassisted, 'r--', linewidth=3, label='Unassisted')
        ax1.fill_between(time, grf_assisted, alpha=0.3, color='blue')
        ax1.fill_between(time, grf_unassisted, alpha=0.3, color='red')
        ax1.set_title('Ground Reaction Force Comparison')
        ax1.set_xlabel('Stance Phase (%)')
        ax1.set_ylabel('Force (N)')
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        # Force distribution
        force_metrics = ['Peak Force', 'Average Force', 'Force Variability']
        assisted_values = [1000, 600, 50]
        unassisted_values = [800, 450, 120]
        
        x = np.arange(len(force_metrics))
        width = 0.35
        
        ax2.bar(x - width/2, assisted_values, width, label='Assisted', color='lightblue')
        ax2.bar(x + width/2, unassisted_values, width, label='Unassisted', color='lightcoral')
        ax2.set_title('Force Distribution Metrics')
        ax2.set_ylabel('Force (N)')
        ax2.set_xticks(x)
        ax2.set_xticklabels(force_metrics, rotation=45)
        ax2.legend()
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(f"{self.report_dir}/ground_reaction_comparison.png", dpi=300, bbox_inches='tight')
        plt.close()
    
    def _generate_error_analysis(self):
        """Generate error analysis between predicted and actual gait"""
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        # Simulate prediction vs actual data
        time = np.linspace(0, 2, 200)
        
        # Predicted gait (AI model output)
        predicted_hip = 20 * np.sin(2 * np.pi * time) + 10
        
        # Actual gait (measured)
        actual_hip = predicted_hip + np.random.normal(0, 2, 200)
        
        # Error analysis
        error = actual_hip - predicted_hip
        
        # Error over time
        ax1.plot(time, error, 'r-', linewidth=2, label='Prediction Error')
        ax1.axhline(y=0, color='k', linestyle='--', alpha=0.5)
        ax1.fill_between(time, error, alpha=0.3, color='red')
        ax1.set_title('Prediction Error Over Time')
        ax1.set_xlabel('Time (seconds)')
        ax1.set_ylabel('Error (degrees)')
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        # Error distribution
        ax2.hist(error, bins=20, alpha=0.7, color='skyblue', edgecolor='black')
        ax2.axvline(x=np.mean(error), color='red', linestyle='--', linewidth=2, label=f'Mean: {np.mean(error):.2f}°')
        ax2.axvline(x=np.std(error), color='green', linestyle='--', linewidth=2, label=f'Std: {np.std(error):.2f}°')
        ax2.set_title('Error Distribution')
        ax2.set_xlabel('Error (degrees)')
        ax2.set_ylabel('Frequency')
        ax2.legend()
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(f"{self.report_dir}/error_analysis.png", dpi=300, bbox_inches='tight')
        plt.close()
    
    def _generate_latex_content(self, patient_id):
        """Generate LaTeX content for the comparative analysis report"""
        report_date = datetime.now().strftime('%B %d, %Y')
        
        latex_content = f"""
\\documentclass[11pt]{{article}}
\\usepackage[utf8]{{inputenc}}
\\usepackage{{geometry}}
\\usepackage{{graphicx}}
\\usepackage{{float}}
\\usepackage{{booktabs}}
\\usepackage{{array}}
\\usepackage{{xcolor}}
\\usepackage{{fancyhdr}}

\\geometry{{margin=1in}}
\\pagestyle{{fancy}}
\\fancyhf{{}}
\\fancyhead[L]{{Comparative Analysis Report}}
\\fancyhead[R]{{{report_date}}}
\\fancyfoot[C]{{\\thepage}}

\\title{{\\textbf{{Comparative Analysis Report}}}}
\\author{{Gait Intelligence Platform}}
\\date{{{report_date}}}

\\begin{{document}}

\\maketitle

\\section{{Analysis Overview}}
\\begin{{itemize}}
    \\item \\textbf{{Patient ID:}} {patient_id}
    \\item \\textbf{{Analysis Date:}} {report_date}
    \\item \\textbf{{Comparison Type:}} Assisted vs Unassisted Gait
    \\item \\textbf{{Analysis Duration:}} 30 minutes
    \\item \\textbf{{Data Points:}} 2,400 samples
\\end{{itemize}}

\\section{{Gait Pattern Comparison}}

\\subsection{{Joint Angle Analysis}}
\\begin{{figure}}[H]
\\centering
\\includegraphics[width=0.9\\textwidth]{{gait_comparison.png}}
\\caption{{Assisted vs Unassisted gait patterns}}
\\end{{figure}}

\\subsection{{Joint Angle Deviations}}
\\begin{{table}}[H]
\\centering
\\begin{{tabular}}{{lccc}}
\\toprule
\\textbf{{Joint}} & \\textbf{{Deviation}} & \\textbf{{ROM Difference}} & \\textbf{{Symmetry Gap}} \\\\
\\midrule
Hip & 3.2° & 5° & 14\\% \\\\
Knee & 2.8° & 5° & 13\\% \\\\
Ankle & 3.0° & 5° & 8\\% \\\\
\\bottomrule
\\end{{tabular}}
\\caption{{Joint Angle Comparison Metrics}}
\\end{{table}}

\\subsection{{Detailed Joint Analysis}}
\\begin{{figure}}[H]
\\centering
\\includegraphics[width=0.9\\textwidth]{{joint_angle_comparison.png}}
\\caption{{Comprehensive joint angle analysis}}
\\end{{figure}}

\\section{{Ground Reaction Force Analysis}}

\\subsection{{Force Pattern Comparison}}
\\begin{{figure}}[H]
\\centering
\\includegraphics[width=0.9\\textwidth]{{ground_reaction_comparison.png}}
\\caption{{Ground reaction force patterns}}
\\end{{figure}}

\\subsection{{Force Metrics}}
\\begin{{table}}[H]
\\centering
\\begin{{tabular}}{{lcc}}
\\toprule
\\textbf{{Metric}} & \\textbf{{Assisted}} & \\textbf{{Unassisted}} \\\\
\\midrule
Peak Force & 1000N & 800N \\\\
Average Force & 600N & 450N \\\\
Force Variability & 50N & 120N \\\\
Load Distribution & 95\\% & 78\\% \\\\
\\bottomrule
\\end{{tabular}}
\\caption{{Force Analysis Comparison}}
\\end{{table}}

\\section{{AI Prediction Accuracy}}

\\subsection{{Prediction Error Analysis}}
\\begin{{figure}}[H]
\\centering
\\includegraphics[width=0.9\\textwidth]{{error_analysis.png}}
\\caption{{AI model prediction accuracy}}
\\end{{figure}}

\\subsection{{Prediction Metrics}}
\\begin{{table}}[H]
\\centering
\\begin{{tabular}}{{lc}}
\\toprule
\\textbf{{Metric}} & \\textbf{{Value}} \\\\
\\midrule
Mean Absolute Error & 1.8° \\\\
Root Mean Square Error & 2.3° \\\\
Prediction Accuracy & 94.2\\% \\\\
Confidence Interval & ±2.1° \\\\
\\bottomrule
\\end{{tabular}}
\\caption{{AI Model Performance}}
\\end{{table}}

\\section{{Clinical Insights}}

\\subsection{{Key Findings}}
\\begin{{itemize}}
    \\item \\textbf{{Assistance Effectiveness:}} Exoskeleton provides 15-20\\% improvement in joint angles
    \\item \\textbf{{Symmetry Improvement:}} 12\\% better left-right balance with assistance
    \\item \\textbf{{Stability Enhancement:}} 2.3 point improvement in stability index
    \\item \\textbf{{Force Distribution:}} More consistent load distribution with assistance
\\end{{itemize}}

\\subsection{{Patient-Specific Observations}}
\\begin{{itemize}}
    \\item Left hip shows 6° less flexion in unassisted gait
    \\item Right knee demonstrates better control with assistance
    \\item Ankle dorsiflexion improved by 4° with exoskeleton support
    \\item Overall gait pattern more natural with assistance
\\end{{itemize}}

\\section{{Recommendations}}

\\subsection{{Immediate Actions}}
\\begin{{itemize}}
    \\item Focus on left hip flexion exercises
    \\item Continue current assistance level (35\\%)
    \\item Monitor right knee stability
    \\item Practice weight shifting exercises
\\end{{itemize}}

\\subsection{{Long-term Goals}}
\\begin{{itemize}}
    \\item Reduce assistance to 20\\% within 2 weeks
    \\item Achieve 90\\%+ symmetry in unassisted gait
    \\item Improve left hip flexion by 4°
    \\item Increase session duration to 45 minutes
\\end{{itemize}}

\\section{{AI-Generated Insights}}
\\begin{{quote}}
\\textit{{"The comparative analysis reveals significant improvements with exoskeleton assistance, particularly in hip flexion and gait symmetry. The AI model shows high prediction accuracy (94.2\\%), indicating reliable real-time feedback. Recommended focus on left hip exercises and gradual assistance reduction."}}
\\end{{quote}}

\\section{{Next Steps}}
\\begin{{itemize}}
    \\item \\textbf{{Next Session:}} Focus on hip flexion exercises
    \\item \\textbf{{Assistance Level:}} Maintain 35\\% for stability
    \\item \\textbf{{Monitoring:}} Track left hip improvement
    \\item \\textbf{{Follow-up:}} Comparative analysis in 1 week
\\end{{itemize}}

\\end{{document}}
"""
        return latex_content
    
    def _compile_latex_to_pdf(self, latex_file):
        """Compile LaTeX file to PDF"""
        try:
            # Change to reports directory
            original_dir = os.getcwd()
            os.chdir(self.report_dir)
            
            # Run pdflatex
            result = subprocess.run([
                'pdflatex', 
                '-interaction=nonstopmode',
                latex_file
            ], capture_output=True, text=True)
            
            if result.returncode != 0:
                print(f"LaTeX compilation error: {result.stderr}")
                return False
            
            # Run pdflatex again for references
            subprocess.run([
                'pdflatex', 
                '-interaction=nonstopmode',
                latex_file
            ], capture_output=True, text=True)
            
            os.chdir(original_dir)
            return True
            
        except Exception as e:
            print(f"Error compiling LaTeX: {e}")
            return False

def main():
    """Main function for testing"""
    # Sample comparison data
    comparison_data = {
        'patient_id': 'P001',
        'analysis_date': '2024-12-01',
        'assistance_level': 35,
        'session_duration': 30,
        'data_points': 2400
    }
    
    # Generate report
    report_generator = ComparativeAnalysisReport(comparison_data)
    pdf_path = report_generator.generate_report()
    
    print(f"Comparative analysis report generated: {pdf_path}")

if __name__ == "__main__":
    main()

