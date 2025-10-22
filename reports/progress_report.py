#!/usr/bin/env python3
"""
Progress Report Generator
Generates LaTeX PDF reports for weekly/monthly progress tracking
"""

import os
import json
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
import subprocess
import sys

class ProgressReport:
    def __init__(self, progress_data):
        self.progress_data = progress_data
        self.report_dir = "reports/generated"
        os.makedirs(self.report_dir, exist_ok=True)
        
    def generate_report(self):
        """Generate complete progress report"""
        patient_id = self.progress_data.get('patient_id', 'P001')
        report_type = self.progress_data.get('report_type', 'weekly')
        
        # Generate plots
        self._generate_progress_trends()
        self._generate_recovery_timeline()
        self._generate_assistance_reduction()
        self._generate_symmetry_improvement()
        
        # Generate LaTeX content
        latex_content = self._generate_latex_content(patient_id, report_type)
        
        # Write LaTeX file
        latex_file = f"{self.report_dir}/{patient_id}_{report_type}_progress.tex"
        with open(latex_file, 'w', encoding='utf-8') as f:
            f.write(latex_content)
        
        # Compile to PDF
        self._compile_latex_to_pdf(latex_file)
        
        return f"{self.report_dir}/{patient_id}_{report_type}_progress.pdf"
    
    def _generate_progress_trends(self):
        """Generate progress trends over time"""
        fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 10))
        
        # Simulate 4 weeks of data
        weeks = np.arange(1, 5)
        
        # Stride length improvement
        stride_length = 0.8 + 0.1 * weeks + np.random.normal(0, 0.02, 4)
        ax1.plot(weeks, stride_length, 'bo-', linewidth=2, markersize=8)
        ax1.set_xlabel('Week')
        ax1.set_ylabel('Stride Length (m)')
        ax1.set_title('Stride Length Progress')
        ax1.grid(True, alpha=0.3)
        
        # Cadence improvement
        cadence = 80 + 5 * weeks + np.random.normal(0, 2, 4)
        ax2.plot(weeks, cadence, 'ro-', linewidth=2, markersize=8)
        ax2.set_xlabel('Week')
        ax2.set_ylabel('Cadence (steps/min)')
        ax2.set_title('Cadence Progress')
        ax2.grid(True, alpha=0.3)
        
        # Balance score improvement
        balance = 60 + 8 * weeks + np.random.normal(0, 3, 4)
        ax3.plot(weeks, balance, 'go-', linewidth=2, markersize=8)
        ax3.set_xlabel('Week')
        ax3.set_ylabel('Balance Score')
        ax3.set_title('Balance Improvement')
        ax3.grid(True, alpha=0.3)
        
        # Stability index
        stability = 5 + 1.2 * weeks + np.random.normal(0, 0.3, 4)
        ax4.plot(weeks, stability, 'mo-', linewidth=2, markersize=8)
        ax4.set_xlabel('Week')
        ax4.set_ylabel('Stability Index')
        ax4.set_title('Stability Progress')
        ax4.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(f"{self.report_dir}/progress_trends.png", dpi=300, bbox_inches='tight')
        plt.close()
    
    def _generate_recovery_timeline(self):
        """Generate recovery stage timeline"""
        fig, ax = plt.subplots(figsize=(12, 6))
        
        # Recovery stages
        stages = ['Beginner', 'Intermediate', 'Advanced', 'Independent']
        weeks = [1, 2, 3, 4]
        recovery_scores = [25, 50, 75, 90]
        
        # Create timeline
        ax.plot(weeks, recovery_scores, 'bo-', linewidth=3, markersize=10)
        
        # Add stage markers
        for i, (week, score, stage) in enumerate(zip(weeks, recovery_scores, stages)):
            ax.annotate(stage, (week, score), 
                       xytext=(10, 10), textcoords='offset points',
                       bbox=dict(boxstyle='round,pad=0.3', facecolor='lightblue', alpha=0.7),
                       arrowprops=dict(arrowstyle='->', connectionstyle='arc3,rad=0'))
        
        ax.set_xlabel('Week')
        ax.set_ylabel('Recovery Score (%)')
        ax.set_title('Recovery Timeline')
        ax.set_ylim(0, 100)
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(f"{self.report_dir}/recovery_timeline.png", dpi=300, bbox_inches='tight')
        plt.close()
    
    def _generate_assistance_reduction(self):
        """Generate assistance level reduction over time"""
        fig, ax = plt.subplots(figsize=(12, 6))
        
        # Simulate assistance reduction
        weeks = np.arange(1, 5)
        assistance = 80 - 15 * weeks + np.random.normal(0, 3, 4)
        assistance = np.clip(assistance, 0, 100)
        
        ax.plot(weeks, assistance, 'ro-', linewidth=3, markersize=10, label='Assistance Level')
        ax.fill_between(weeks, assistance, alpha=0.3, color='red')
        
        # Add target line
        target = 30
        ax.axhline(y=target, color='green', linestyle='--', linewidth=2, label=f'Target: {target}%')
        
        ax.set_xlabel('Week')
        ax.set_ylabel('Assistance Level (%)')
        ax.set_title('Exoskeleton Assistance Reduction')
        ax.set_ylim(0, 100)
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(f"{self.report_dir}/assistance_reduction.png", dpi=300, bbox_inches='tight')
        plt.close()
    
    def _generate_symmetry_improvement(self):
        """Generate symmetry improvement visualization"""
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        # Left vs Right comparison over time
        weeks = np.arange(1, 5)
        left_performance = [70, 75, 82, 88]
        right_performance = [65, 78, 85, 90]
        
        ax1.plot(weeks, left_performance, 'bo-', linewidth=2, markersize=8, label='Left Side')
        ax1.plot(weeks, right_performance, 'ro-', linewidth=2, markersize=8, label='Right Side')
        ax1.set_xlabel('Week')
        ax1.set_ylabel('Performance Score')
        ax1.set_title('Left vs Right Performance')
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        # Symmetry score over time
        symmetry = [85, 88, 92, 95]
        ax2.plot(weeks, symmetry, 'go-', linewidth=3, markersize=10)
        ax2.set_xlabel('Week')
        ax2.set_ylabel('Symmetry Score (%)')
        ax2.set_title('Gait Symmetry Improvement')
        ax2.set_ylim(80, 100)
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(f"{self.report_dir}/symmetry_improvement.png", dpi=300, bbox_inches='tight')
        plt.close()
    
    def _generate_latex_content(self, patient_id, report_type):
        """Generate LaTeX content for the progress report"""
        report_date = datetime.now().strftime('%B %d, %Y')
        period = "Weekly" if report_type == "weekly" else "Monthly"
        
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
\\fancyhead[L]{{{period} Progress Report}}
\\fancyhead[R]{{{report_date}}}
\\fancyfoot[C]{{\\thepage}}

\\title{{\\textbf{{{period} Progress Report}}}}
\\author{{Gait Intelligence Platform}}
\\date{{{report_date}}}

\\begin{{document}}

\\maketitle

\\section{{Patient Overview}}
\\begin{{itemize}}
    \\item \\textbf{{Patient ID:}} {patient_id}
    \\item \\textbf{{Report Period:}} {period}
    \\item \\textbf{{Report Date:}} {report_date}
    \\item \\textbf{{Total Sessions:}} {self.progress_data.get('total_sessions', 12)}
    \\item \\textbf{{Current Recovery Stage:}} {self.progress_data.get('current_stage', 'Intermediate')}
\\end{{itemize}}

\\section{{Progress Summary}}

\\subsection{{Key Improvements}}
\\begin{{table}}[H]
\\centering
\\begin{{tabular}}{{lcc}}
\\toprule
\\textbf{{Metric}} & \\textbf{{Baseline}} & \\textbf{{Current}} \\\\
\\midrule
Stride Length & 0.8m & 1.2m \\\\
Cadence & 80 steps/min & 95 steps/min \\\\
Balance Score & 60\\% & 88\\% \\\\
Stability Index & 5.2 & 8.7 \\\\
Symmetry Score & 75\\% & 95\\% \\\\
Assistance Level & 80\\% & 35\\% \\\\
\\bottomrule
\\end{{tabular}}
\\caption{{Progress Comparison}}
\\end{{table}}

\\subsection{{Progress Trends}}
\\begin{{figure}}[H]
\\centering
\\includegraphics[width=0.9\\textwidth]{{progress_trends.png}}
\\caption{{Key metrics improvement over time}}
\\end{{figure}}

\\section{{Recovery Timeline}}
\\begin{{figure}}[H]
\\centering
\\includegraphics[width=0.9\\textwidth]{{recovery_timeline.png}}
\\caption{{Recovery stage progression}}
\\end{{figure}}

\\section{{Assistance Level Reduction}}
\\begin{{figure}}[H]
\\centering
\\includegraphics[width=0.9\\textwidth]{{assistance_reduction.png}}
\\caption{{Exoskeleton assistance reduction over time}}
\\end{{figure}}

\\section{{Gait Symmetry Analysis}}
\\begin{{figure}}[H]
\\centering
\\includegraphics[width=0.9\\textwidth]{{symmetry_improvement.png}}
\\caption{{Left vs Right performance and symmetry improvement}}
\\end{{figure}}

\\section{{Clinical Insights}}

\\subsection{{Strengths}}
\\begin{{itemize}}
    \\item Excellent progress in balance and stability
    \\item Significant reduction in assistance requirements
    \\item Improved gait symmetry and coordination
    \\item Consistent session attendance and engagement
\\end{{itemize}}

\\subsection{{Areas for Improvement}}
\\begin{{itemize}}
    \\item Left hip flexion still 3° below target range
    \\item Endurance training needed for longer sessions
    \\item Focus on weight shifting during stance phase
\\end{{itemize}}

\\section{{Recommendations}}

\\subsection{{Next Session Planning}}
\\begin{{itemize}}
    \\item Reduce assistance level to 30-35\\%
    \\item Increase session duration to 40 minutes
    \\item Focus on hip flexion exercises
    \\item Introduce balance challenges
\\end{{itemize}}

\\subsection{{Long-term Goals}}
\\begin{{itemize}}
    \\item Target independent walking by Week 6
    \\item Achieve 98\\% symmetry score
    \\item Reduce assistance to 10\\% or less
    \\item Complete 45-minute sessions without fatigue
\\end{{itemize}}

\\section{{AI-Generated Insights}}
\\begin{{quote}}
\\textit{{"Patient shows remarkable progress with 20\\% improvement in stride length and 15\\% reduction in assistance needs. The gait pattern is becoming more natural with excellent symmetry scores. Recommended focus on hip flexion exercises and gradual increase in session intensity."}}
\\end{{quote}}

\\section{{Next Review}}
\\begin{{itemize}}
    \\item \\textbf{{Next Report:}} {period} progress report
    \\item \\textbf{{Expected Progress:}} 5-10\\% improvement in key metrics
    \\item \\textbf{{Focus Areas:}} Hip flexion and endurance training
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
    # Sample progress data
    progress_data = {
        'patient_id': 'P001',
        'report_type': 'weekly',
        'total_sessions': 12,
        'current_stage': 'Intermediate',
        'baseline_date': '2024-11-01',
        'current_date': '2024-12-01'
    }
    
    # Generate report
    report_generator = ProgressReport(progress_data)
    pdf_path = report_generator.generate_report()
    
    print(f"Progress report generated: {pdf_path}")

if __name__ == "__main__":
    main()

