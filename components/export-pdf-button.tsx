import React from 'react';
import { Button } from './ui/button';
import { Download } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
}

interface ChatState {
  stage: 'initial' | 'preference_gathering' | 'location_selection' | 'recommendations';
  userPreferences: string[];
  selectedLocation: string | null;
  suggestedLocations: string[];
}

interface ExportPdfButtonProps {
  messages: Message[];
  chatState: ChatState;
  disabled?: boolean;
}

const ExportPdfButton: React.FC<ExportPdfButtonProps> = ({ messages, chatState, disabled = false }) => {
  const [isExporting, setIsExporting] = React.useState(false);

  // Helper function to add text with automatic line wrapping
  const addWrappedText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number): number => {
    const fontSize = doc.getFontSize();
    const textLines = doc.splitTextToSize(text, maxWidth);
    doc.text(textLines, x, y);
    return y + (textLines.length * fontSize / 2.5); // Return the new Y position
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // Create a new PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Set page margins
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxWidth = pageWidth - (margin * 2);
      
      // Set initial position
      let yPos = 20;
      
      // Add title
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Your Travel Roadmap', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 15;
      
      // Add interest and location if available
      if (chatState.userPreferences.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Interest: ', margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(chatState.userPreferences[0], margin + 25, yPos);
        yPos += 10;
      }
      
      if (chatState.selectedLocation) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Destination: ', margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(chatState.selectedLocation, margin + 35, yPos);
        yPos += 20;
      }
      
      // Add recommendations section
      if (chatState.stage === 'recommendations') {
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Recommendations', margin, yPos);
        
        yPos += 10;
        
        // Find the last assistant message with recommendations
        const recommendationMessage = messages
          .filter(msg => msg.role === 'assistant')
          .pop();
        
        if (recommendationMessage) {
          // Process markdown in the content
          const content = recommendationMessage.content;
          
          // Split by lines to handle markdown formatting
          const lines = content.split('\n');
          
          doc.setFontSize(12);
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check if we need a new page
            if (yPos > 270) {
              doc.addPage();
              yPos = margin;
            }
            
            // Handle bold text (replace **text** with bold font)
            if (line.includes('**')) {
              // This is a simplified approach - in a real app you'd want to handle mixed formatting better
              const cleanLine = line.replace(/\*\*/g, '');
              doc.setFont('helvetica', 'bold');
              yPos = addWrappedText(doc, cleanLine, margin, yPos, maxWidth);
              doc.setFont('helvetica', 'normal');
            }
            // Handle numbered lists
            else if (/^\d+\./.test(line)) {
              const number = line.split('.')[0] + '.';
              const text = line.substring(line.indexOf('.') + 1);
              
              doc.setFont('helvetica', 'bold');
              doc.text(number, margin, yPos);
              doc.setFont('helvetica', 'normal');
              yPos = addWrappedText(doc, text, margin + 10, yPos, maxWidth - 10);
            }
            // Handle bullet points
            else if (line.trim().startsWith('-')) {
              yPos = addWrappedText(doc, '•' + line.substring(1), margin, yPos, maxWidth);
            }
            // Regular text
            else if (line.trim()) {
              yPos = addWrappedText(doc, line, margin, yPos, maxWidth);
            }
            // Empty line - smaller space
            else if (i > 0 && i < lines.length - 1) {
              yPos += 2; // Small space for empty lines between content
            }
            
            yPos += 3; // Add some space between lines
          }
        }
      }
      
      // Add footer
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('Generated on ' + new Date().toLocaleDateString(), 
        doc.internal.pageSize.getWidth() / 2, 
        doc.internal.pageSize.getHeight() - 10, 
        { align: 'center' });
      
      // Save the PDF
      doc.save(`travel-roadmap-${Date.now()}.pdf`);
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || isExporting}
      variant="outline"
      className="flex items-center gap-2"
    >
      <Download size={16} />
      {isExporting ? 'Exporting...' : 'Export as PDF'}
    </Button>
  );
};

export default ExportPdfButton;