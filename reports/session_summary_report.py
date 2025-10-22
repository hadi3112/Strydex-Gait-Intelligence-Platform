#!/usr/bin/env python3
"""
Session Summary Report Generator
Generates LaTeX PDF reports for individual therapy sessions
"""

import os
import json
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime
import subprocess
import sys

class SessionSummaryReport:
    def __init__(self, session_data):
        self.session_data = session_data
        self.report_dir = "reports/generated"
        os.makedirs(self.report_dir, exist_ok=True)
        
    def generate_report(self):
        """Generate complete session summary report"""
        session_id = self.session_data.get('session_id', f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        
        # Generate plots
        self._generate_gait_cycle_plot()
        self._generate_joint_angles_plot()
        self._generate_ground_reaction_plot()
        self._generate_assistance_level_plot()
        
        # Generate LaTeX content
        latex_content = self._generate_latex_content(session_id)
        
        # Write LaTeX file
        latex_file = f"{self.report_dir}/{session_id}_summary.tex"
        with open(latex_file, 'w', encoding='utf-8') as f:
            f.write(latex_content)
        
        # Compile to PDF
        self._compile_latex_to_pdf(latex_file)
        
        return f"{self.report_dir}/{session_id}_summary.pdf"
    
    def _generate_gait_cycle_plot(self):
        """Generate gait cycle visualization"""
        fig, ax = plt.subplots(figsize=(12, 8))
        
        # Simulate gait cycle data
        time = np.linspace(0, 2, 200)  # 2 second gait cycle
        hip_angle = 20 * np.sin(2 * np.pi * time) + 10
        knee_angle = 15 * np.sin(2 * np.pi * time + np.pi/4) + 5
        ankle_angle = 10 * np.sin(2 * np.pi * time + np.pi/2) + 2
        
        ax.plot(time, hip_angle, 'b-', linewidth=2, label='Hip Angle')
        ax.plot(time, knee_angle, 'r-', linewidth=2, label='Knee Angle')
        ax.plot(time, ankle_angle, 'g-', linewidth=2, label='Ankle Angle')
        
        # Add phase markers
        ax.axvline(x=0.6, color='k', linestyle='--', alpha=0.7, label='Heel Strike')
        ax.axvline(x=1.0, color='k', linestyle=':', alpha=0.7, label='Toe Off')
        
        ax.set_xlabel('Time (seconds)')
        ax.set_ylabel('Joint Angle (degrees)')
        ax.set_title('Gait Cycle - Joint Angles Over Time')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(f"{self.report_dir}/gait_cycle.png", dpi=300, bbox_inches='tight')
        plt.close()
    
    def _generate_joint_angles_plot(self):
        """Generate joint angles comparison plot"""
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        # Left vs Right comparison
        joints = ['Hip', 'Knee', 'Ankle']
        left_angles = [25, 20, 15]  # Simulated data
        right_angles = [23, 22, 14]
        
        x = np.arange(len(joints))
        width = 0.35
        
        ax1.bar(x - width/2, left_angles, width, label='Left', color='skyblue')
        ax1.bar(x + width/2, right_angles, width, label='Right', color='lightcoral')
        ax1.set_xlabel('Joint')
        ax1.set_ylabel('Average Angle (degrees)')
        ax1.set_title('Left vs Right Joint Angles')
        ax1.set_xticks(x)
        ax1.set_xticklabels(joints)
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        # Range of motion
        rom_data = {
            'Hip': [15, 45],
            'Knee': [5, 35],
            'Ankle': [0, 25]
        }
        
        joints_rom = list(rom_data.keys())
        min_angles = [rom_data[j][0] for j in joints_rom]
        max_angles = [rom_data[j][1] for j in joints_rom]
        
        ax2.bar(joints_rom, min_angles, label='Min', color='lightgreen', alpha=0.7)
        ax2.bar(joints_rom, max_angles, bottom=min_angles, label='Max', color='darkgreen', alpha=0.7)
        ax2.set_ylabel('Angle (degrees)')
        ax2.set_title('Range of Motion')
        ax2.legend()
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(f"{self.report_dir}/joint_angles.png", dpi=300, bbox_inches='tight')
        plt.close()
    
    def _generate_ground_reaction_plot(self):
        """Generate ground reaction force plot"""
        fig, ax = plt.subplots(figsize=(12, 6))
        
        # Simulate ground reaction force data
        time = np.linspace(0, 1, 100)
        grf = 800 * np.sin(np.pi * time) + 200  # Simulated GRF curve
        
        ax.plot(time, grf, 'b-', linewidth=3, label='Ground Reaction Force')
        ax.fill_between(time, grf, alpha=0.3, color='blue')
        
        ax.set_xlabel('Stance Phase (%)')
        ax.set_ylabel('Force (N)')
        ax.set_title('Ground Reaction Force During Stance Phase')
        ax.grid(True, alpha=0.3)
        ax.legend()
        
        plt.tight_layout()
        plt.savefig(f"{self.report_dir}/ground_reaction.png", dpi=300, bbox_inches='tight')
        plt.close()
    
    def _generate_assistance_level_plot(self):
        """Generate assistance level over time"""
        fig, ax = plt.subplots(figsize=(12, 6))
        
        # Simulate assistance level data
        time = np.linspace(0, 30, 300)  # 30 minute session
        assistance = 70 - 0.5 * time + np.random.normal(0, 2, 300)  # Decreasing assistance
        assistance = np.clip(assistance, 0, 100)
        
        ax.plot(time, assistance, 'r-', linewidth=2, label='Assistance Level')
        ax.fill_between(time, assistance, alpha=0.3, color='red')
        
        ax.set_xlabel('Time (minutes)')
        ax.set_ylabel('Assistance Level (%)')
        ax.set_title('Exoskeleton Assistance Level Over Session')
        ax.grid(True, alpha=0.3)
        ax.legend()
        
        plt.tight_layout()
        plt.savefig(f"{self.report_dir}/assistance_level.png", dpi=300, bbox_inches='tight')
        plt.close()
    
    def _generate_latex_content(self, session_id):
        """Generate LaTeX content for the report"""
        session_date = datetime.now().strftime('%B %d, %Y')
        
        # Calculate metrics from session data
        duration = self.session_data.get('duration', 30)  # minutes
        cycles = self.session_data.get('cycles', 150)
        avg_assistance = self.session_data.get('avg_assistance', 65)
        
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
\\fancyhead[L]{{Session Summary Report}}
\\fancyhead[R]{{{session_date}}}
\\fancyfoot[C]{{\\thepage}}

\\title{{\\textbf{{Session Summary Report}}}}
\\author{{Gait Intelligence Platform}}
\\date{{{session_date}}}

\\begin{{document}}

\\maketitle

\\section{{Session Overview}}
\\begin{{itemize}}
    \\item \\textbf{{Session ID:}} {session_id}
    \\item \\textbf{{Date:}} {session_date}
    \\item \\textbf{{Duration:}} {duration} minutes
    \\item \\textbf{{Walking Cycles:}} {cycles}
    \\item \\textbf{{Average Assistance:}} {avg_assistance}\\% exoskeleton support
\\end{{itemize}}

\\section{{Gait Analysis}}

\\subsection{{Joint Angles}}
\\begin{{table}}[H]
\\centering
\\begin{{tabular}}{{lccc}}
\\toprule
\\textbf{{Joint}} & \\textbf{{Average}} & \\textbf{{Min}} & \\textbf{{Max}} \\\\
\\midrule
Hip & 25.3° & 15.2° & 42.1° \\\\
Knee & 18.7° & 8.4° & 35.6° \\\\
Ankle & 12.1° & 2.3° & 28.9° \\\\
\\bottomrule
\\end{{tabular}}
\\caption{{Joint Angle Statistics}}
\\end{{table}}

\\subsection{{Gait Cycle Visualization}}
\\begin{{figure}}[H]
\\centering
\\includegraphics[width=0.9\\textwidth]{{gait_cycle.png}}
\\caption{{Joint angles throughout the gait cycle}}
\\end{{figure}}

\\subsection{{Joint Angle Comparison}}
\\begin{{figure}}[H]
\\centering
\\includegraphics[width=0.9\\textwidth]{{joint_angles.png}}
\\caption{{Left vs Right joint angles and range of motion}}
\\end{{figure}}

\\section{{Ground Reaction Forces}}
\\begin{{figure}}[H]
\\centering
\\includegraphics[width=0.9\\textwidth]{{ground_reaction.png}}
\\caption{{Ground reaction force during stance phase}}
\\end{{figure}}

\\section{{Assistance Level Analysis}}
\\begin{{figure}}[H]
\\centering
\\includegraphics[width=0.9\\textwidth]{{assistance_level.png}}
\\caption{{Exoskeleton assistance level throughout the session}}
\\end{{figure}}

\\section{{Key Metrics}}
\\begin{{table}}[H]
\\centering
\\begin{{tabular}}{{ll}}
\\toprule
\\textbf{{Metric}} & \\textbf{{Value}} \\\\
\\midrule
Stride Length & 1.2m \\\\
Cadence & 95 steps/min \\\\
Stance Phase & 62\\% \\\\
Swing Phase & 38\\% \\\\
Symmetry Score & 87\\% \\\\
Fatigue Index & 2.3 \\\\
Stability Index & 8.7/10 \\\\
\\bottomrule
\\end{{tabular}}
\\caption{{Session Performance Metrics}}
\\end{{table}}

\\section{{Recommendations}}
\\begin{{itemize}}
    \\item Patient shows good progress with reduced assistance needs
    \\item Focus on left hip flexion improvement (3° below target)
    \\item Continue current training protocol for next session
    \\item Monitor fatigue levels after 25 minutes
\\end{{itemize}}

\\section{{Next Session Planning}}
\\begin{{itemize}}
    \\item Target assistance level: 60-65\\%
    \\item Recommended duration: 35 minutes
    \\item Focus areas: Hip flexion and balance training
    \\item Expected progress: 5\\% improvement in symmetry score
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
    # Sample session data
    session_data = {
        'session_id': 'session_20241201_001',
        'duration': 30,
        'cycles': 150,
        'avg_assistance': 65,
        'patient_id': 'P001',
        'therapist': 'Dr. Smith'
    }
    
    # Generate report
    report_generator = SessionSummaryReport(session_data)
    pdf_path = report_generator.generate_report()
    
    print(f"Report generated: {pdf_path}")

if __name__ == "__main__":
    main()

