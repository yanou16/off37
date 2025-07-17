import React, { useState } from 'react';
import { Button } from './ui/button';
import { Download, Loader } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { PlaceImage } from '@/types/place';
// Import jspdf-autotable
import 'jspdf-autotable';

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

interface Place {
  name: string;
  address: string;
  rating?: number;
  description?: string;
  category?: string;
  images?: PlaceImage[];
  coordinates?: [number, number];
}

interface ExportPdfButtonProps {
  messages: Message[];
  chatState: ChatState;
  places?: Place[];
  disabled?: boolean;
}

const ExportPdfButton: React.FC<ExportPdfButtonProps> = ({ 
  messages, 
  chatState, 
  places = [],
  disabled = false 
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Helper function to add text with automatic line wrapping
  const addWrappedText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number, options: any = {}): number => {
    const fontSize = doc.getFontSize();
    const textLines = doc.splitTextToSize(text, maxWidth);
    doc.text(textLines, x, y, options);
    return y + (textLines.length * fontSize / 2); // Return the new Y position
  };

  // Helper function to add an image to the PDF
  const addImageToPdf = async (
    doc: jsPDF, 
    imageUrl: string, 
    x: number, 
    y: number, 
    width: number, 
    height: number
  ): Promise<number> => {
    try {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        
        img.onload = () => {
          try {
            // Create a canvas to draw the image
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Could not get canvas context'));
              return;
            }
            
            // Draw the image on the canvas
            ctx.drawImage(img, 0, 0);
            
            // Get the image data as base64
            const imageData = canvas.toDataURL('image/jpeg');
            
            // Add the image to the PDF
            doc.addImage(imageData, 'JPEG', x, y, width, height);
            
            // Return the new Y position
            resolve(y + height);
          } catch (error) {
            console.error('Error adding image to PDF:', error);
            // If there's an error, just return the original Y position
            resolve(y);
          }
        };
        
        img.onerror = () => {
          console.error('Error loading image:', imageUrl);
          // If there's an error loading the image, just return the original Y position
          resolve(y);
        };
        
        img.src = imageUrl;
      });
    } catch (error) {
      console.error('Error in addImageToPdf:', error);
      return y;
    }
  };

  // Helper function to create a stylish cover page
  const createCoverPage = async (doc: jsPDF, location: string): Promise<void> => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Add a background color
    doc.setFillColor(26, 26, 46); // Dark blue background
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Try to add a background image of the location
    try {
      // Use a static map image or a placeholder image
      let mapUrl = '';
      
      // Try to use an image from the first place if available
      if (places && places.length > 0 && places[0].images && places[0].images.length > 0) {
        mapUrl = places[0].images[0].url;
      } else {
        // Fallback to a generic travel image
        mapUrl = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800';
      }
      
      await addImageToPdf(doc, mapUrl, 0, 0, pageWidth, pageHeight / 2);
      
      // Add a semi-transparent overlay
      doc.setFillColor(26, 26, 46); // Dark blue with opacity
      doc.rect(0, pageHeight / 2 - 50, pageWidth, 50, 'F');
    } catch (error) {
      console.error('Error adding background image:', error);
    }
    
    // Add a decorative element
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight / 2 + 20, pageWidth - margin, pageHeight / 2 + 20);
    
    // Add title with a modern font
    const titleY = pageHeight / 2 + 40;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(42);
    doc.setFont('helvetica', 'bold');
    doc.text('TRAVEL GUIDE', pageWidth / 2, titleY, { align: 'center' });
    
    // Add location with a stylish presentation
    doc.setFontSize(28);
    doc.setFont('helvetica', 'normal');
    doc.text(location.toUpperCase(), pageWidth / 2, titleY + 20, { align: 'center' });
    
    // Add a decorative line
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 40, titleY + 30, pageWidth / 2 + 40, titleY + 30);
    
    // Add interest if available with a modern design
    if (chatState.userPreferences.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(200, 200, 200);
      doc.text(`FOCUSED ON: ${chatState.userPreferences[0].toUpperCase()}`, pageWidth / 2, titleY + 45, { align: 'center' });
    }
    
    // Add a decorative element at the bottom
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 40, pageWidth - margin, pageHeight - 40);
    
    // Add date with a modern style
    const today = new Date();
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 200);
    doc.text(
      `CREATED: ${today.toLocaleDateString()}`, 
      pageWidth / 2, 
      pageHeight - 30, 
      { align: 'center' }
    );
  };

  // Helper function to add a place to the PDF with a modern design
  const addPlaceToPdf = async (
    doc: jsPDF, 
    place: Place, 
    index: number, 
    startY: number, 
    margin: number, 
    maxWidth: number
  ): Promise<number> => {
    let yPos = startY;
    
    // Check if we need a new page
    if (yPos > 220) {
      doc.addPage();
      yPos = margin;
    }
    
    // Add a background rectangle for the place card
    doc.setFillColor(245, 245, 245);
    doc.rect(margin - 5, yPos - 5, maxWidth + 10, 90, 'F');
    
    // Add place image if available
    if (place.images && place.images.length > 0) {
      try {
        const imageUrl = place.images[0].url;
        const imageWidth = 50;
        const imageHeight = 50;
        
        // Add the image
        await addImageToPdf(doc, imageUrl, margin, yPos, imageWidth, imageHeight);
        
        // Add place details next to the image
        // Add place number and name
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 40);
        doc.text(`${index + 1}. ${place.name}`, margin + imageWidth + 5, yPos + 10);
        
        // Add place category if available
        if (place.category) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100, 100, 100);
          doc.text(place.category, margin + imageWidth + 5, yPos + 20);
        }
        
        // Add place address
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(place.address, margin + imageWidth + 5, yPos + 30);
        
        // Add place rating if available
        if (place.rating) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          
          // Draw rating stars
          const rating = Math.round(place.rating * 2) / 2; // Round to nearest 0.5
          const fullStars = Math.floor(rating);
          const halfStar = rating % 1 !== 0;
          
          doc.text(`Rating: ${rating}/5`, margin + imageWidth + 5, yPos + 40);
          
          // Draw stars
          const starSize = 3;
          const starSpacing = 4;
          let starX = margin + imageWidth + 40;
          
          // Full stars
          for (let i = 0; i < fullStars; i++) {
            doc.setFillColor(255, 215, 0); // Gold color
            doc.circle(starX, yPos + 39, starSize, 'F');
            starX += starSpacing;
          }
          
          // Half star
          if (halfStar) {
            doc.setFillColor(255, 215, 0); // Gold color
            doc.circle(starX, yPos + 39, starSize, 'F');
            doc.setFillColor(245, 245, 245); // Background color
            doc.circle(starX + starSize / 2, yPos + 39, starSize / 2, 'F');
            starX += starSpacing;
          }
          
          // Empty stars
          for (let i = 0; i < 5 - fullStars - (halfStar ? 1 : 0); i++) {
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.circle(starX, yPos + 39, starSize, 'S');
            starX += starSpacing;
          }
        }
        
        // Add place description if available
        if (place.description) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
          
          // Limit description length
          const maxDescLength = 150;
          const description = place.description.length > maxDescLength 
            ? place.description.substring(0, maxDescLength) + '...' 
            : place.description;
          
          addWrappedText(doc, description, margin, yPos + 60, maxWidth);
        }
        
        // Add image credit
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150, 150, 150);
        doc.text(`Photo: ${place.images[0].credit}`, margin, yPos + 80);
        
      } catch (error) {
        console.error('Error adding place image:', error);
        
        // Fallback if image fails
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 40);
        doc.text(`${index + 1}. ${place.name}`, margin, yPos + 10);
        
        if (place.category) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100, 100, 100);
          doc.text(place.category, margin, yPos + 20);
        }
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(place.address, margin, yPos + 30);
      }
    } else {
      // No image available
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text(`${index + 1}. ${place.name}`, margin, yPos + 10);
      
      if (place.category) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text(place.category, margin, yPos + 20);
      }
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(place.address, margin, yPos + 30);
    }
    
    // Add some space after each place
    yPos += 100;
    
    return yPos;
  };

  // Extract key points from AI recommendations
  const extractKeyPoints = (content: string): string[] => {
    const keyPoints: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Extract numbered points or bullet points
      if (/^\d+\./.test(line) || line.trim().startsWith('-') || line.trim().startsWith('*')) {
        // Clean up the line
        let cleanLine = line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim();
        cleanLine = cleanLine.replace(/\*\*/g, '');
        
        if (cleanLine) {
          keyPoints.push(cleanLine);
        }
      }
    }
    
    return keyPoints;
  };

  // Format the AI recommendations in a more visually appealing way
  const formatAIRecommendations = (doc: jsPDF, content: string, startY: number, margin: number, maxWidth: number): number => {
    let yPos = startY;
    
    // Extract key points from the content
    const keyPoints = extractKeyPoints(content);
    
    // Add a stylish header
    doc.setFillColor(40, 40, 40);
    doc.rect(margin - 5, yPos - 5, maxWidth + 10, 12, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOP RECOMMENDATIONS', margin, yPos + 3);
    
    yPos += 15;
    
    // Add key points in a visually appealing format
    for (let i = 0; i < Math.min(keyPoints.length, 5); i++) {
      // Check if we need a new page
      if (yPos > 270) {
        doc.addPage();
        yPos = margin;
      }
      
      // Add a background for each point
      doc.setFillColor(i % 2 === 0 ? 245 : 240, 245, 245);
      doc.rect(margin - 5, yPos - 5, maxWidth + 10, 25, 'F');
      
      // Add point number in a circle
      doc.setFillColor(40, 40, 40);
      doc.circle(margin + 5, yPos + 5, 7, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}`, margin + 5, yPos + 8, { align: 'center' });
      
      // Add point text
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      addWrappedText(doc, keyPoints[i], margin + 15, yPos + 5, maxWidth - 15);
      
      yPos += 30;
    }
    
    return yPos;
  };

  // Constants
  const margin = 20;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setProgress(0);
      
      // Create a new PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Set page margins
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxWidth = pageWidth - (margin * 2);
      
      // Create cover page
      await createCoverPage(doc, chatState.selectedLocation || 'Your Destination');
      setProgress(10);
      
      // Add a new page for content
      doc.addPage();
      
      // Set initial position for content
      let yPos = margin;
      
      // Add a stylish header for the travel plan
      doc.setFillColor(40, 40, 40);
      doc.rect(0, yPos - 10, pageWidth, 20, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('YOUR PERSONALIZED TRAVEL PLAN', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 25;
      
      // Add interest and location with icons
      if (chatState.userPreferences.length > 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin - 5, yPos - 5, maxWidth + 10, 15, 'F');
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 40);
        doc.text('INTEREST:', margin, yPos + 3);
        
        doc.setFont('helvetica', 'normal');
        doc.text(chatState.userPreferences[0], margin + 30, yPos + 3);
        
        yPos += 20;
      }
      
      if (chatState.selectedLocation) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin - 5, yPos - 5, maxWidth + 10, 15, 'F');
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 40);
        doc.text('DESTINATION:', margin, yPos + 3);
        
        doc.setFont('helvetica', 'normal');
        doc.text(chatState.selectedLocation, margin + 40, yPos + 3);
        
        yPos += 25;
      }
      
      setProgress(20);
      
      // Add recommendations section with a modern design
      if (chatState.stage === 'recommendations') {
        // Find the last assistant message with recommendations
        const recommendationMessage = messages
          .filter(msg => msg.role === 'assistant')
          .pop();
        
        if (recommendationMessage) {
          yPos = formatAIRecommendations(doc, recommendationMessage.content, yPos, margin, maxWidth);
        }
      }
      
      setProgress(50);
      
      // Add places section if available with a modern gallery layout
      if (places && places.length > 0) {
        // Add a new page for places
        doc.addPage();
        yPos = margin;
        
        // Add a stylish header for recommended places
        doc.setFillColor(40, 40, 40);
        doc.rect(0, yPos - 10, pageWidth, 20, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('MUST-VISIT PLACES', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 25;
        
        // Add each place with a modern card design
        for (let i = 0; i < places.length; i++) {
          const place = places[i];
          yPos = await addPlaceToPdf(doc, place, i, yPos, margin, maxWidth);
          setProgress(50 + Math.floor((i + 1) / places.length * 40));
        }
      }
      
      // Add a practical tips page
      doc.addPage();
      yPos = margin;
      
      // Add a stylish header for practical tips
      doc.setFillColor(40, 40, 40);
      doc.rect(0, yPos - 10, pageWidth, 20, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('PRACTICAL TRAVEL TIPS', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 25;
      
      // Add practical tips in a simple format instead of using autoTable
      const tipData = [
        ['Best Time to Visit', 'Weekdays are generally less crowded than weekends. Early morning or late afternoon for popular attractions.'],
        ['Local Transportation', 'Consider using ride-sharing services or public transportation to avoid parking hassles.'],
        ['Weather', 'Check the local forecast before your trip and pack accordingly.'],
        ['Safety', 'Keep your belongings secure and be aware of your surroundings, especially in crowded tourist areas.'],
        ['Local Customs', 'Research local customs and etiquette before your trip to show respect for the local culture.']
      ];
      
      // Manually create a table-like structure
      for (let i = 0; i < tipData.length; i++) {
        // Check if we need a new page
        if (yPos > 250) {
          doc.addPage();
          yPos = margin;
        }
        
        // Add a background for each tip
        doc.setFillColor(i % 2 === 0 ? 245 : 240, 245, 245);
        doc.rect(margin - 5, yPos - 5, maxWidth + 10, 25, 'F');
        
        // Add category
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 40);
        doc.text(tipData[i][0], margin, yPos + 5);
        
        // Add tip text
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        yPos = addWrappedText(doc, tipData[i][1], margin + 45, yPos + 5, maxWidth - 45);
        
        yPos += 10;
      }
      
      // Add footer to all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Skip footer on cover page
        if (i > 1) {
          // Add a stylish footer
          doc.setFillColor(40, 40, 40);
          doc.rect(0, doc.internal.pageSize.getHeight() - 15, pageWidth, 15, 'F');
          
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(200, 200, 200);
          doc.text(
            `YOUR TRAVEL GUIDE - ${chatState.selectedLocation?.toUpperCase() || 'DESTINATION'}`, 
            margin, 
            doc.internal.pageSize.getHeight() - 5
          );
          
          doc.text(
            `PAGE ${i} OF ${pageCount}`, 
            pageWidth - margin, 
            doc.internal.pageSize.getHeight() - 5,
            { align: 'right' }
          );
        }
      }
      
      setProgress(95);
      
      // Save the PDF
      doc.save(`travel-guide-${chatState.selectedLocation?.replace(/\s+/g, '-').toLowerCase() || 'destination'}-${Date.now()}.pdf`);
      setProgress(100);
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || isExporting}
      variant="outline"
      className="flex items-center gap-2"
    >
      {isExporting ? (
        <>
          <Loader size={16} className="animate-spin" />
          {progress > 0 ? `${progress}%` : 'Exporting...'}
        </>
      ) : (
        <>
          <Download size={16} />
          Export as PDF
        </>
      )}
    </Button>
  );
};

export default ExportPdfButton;