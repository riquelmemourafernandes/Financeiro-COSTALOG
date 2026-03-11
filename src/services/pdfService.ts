import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const PDFService = {
  /**
   * Generates a PDF from a DOM element
   * @param elementId The ID of the element to capture
   * @param fileName The name of the resulting PDF file
   */
  async generatePDF(elementId: string, fileName: string) {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`PDFService: Elemento com ID ${elementId} não encontrado.`);
      return;
    }

    try {
      // Create a clone of the element to modify it for PDF if needed
      // For now we capture it as is but with higher scale for quality
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#0a0a0a', // Match site background
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById(elementId);
          if (clonedElement) {
            // Add a style tag to the cloned document to override oklch colors
            const style = clonedDoc.createElement('style');
            style.innerHTML = `
              * { 
                color-scheme: dark;
              }
              /* Force hex colors for common elements to avoid oklch parsing errors */
              .text-slate-100 { color: #f1f5f9 !important; }
              .text-slate-200 { color: #e2e8f0 !important; }
              .text-slate-300 { color: #cbd5e1 !important; }
              .text-slate-400 { color: #94a3b8 !important; }
              .text-slate-500 { color: #64748b !important; }
              .bg-background { background-color: #111621 !important; }
              .bg-surface { background-color: #1a2233 !important; }
              .text-primary { color: #144bb8 !important; }
              .bg-primary { background-color: #144bb8 !important; }
              .text-emerald-500 { color: #10b981 !important; }
              .text-rose-500 { color: #f43f5e !important; }
              .border-border { border-color: #2d3a54 !important; }
            `;
            clonedDoc.head.appendChild(style);

            // Remove elements that shouldn't be in PDF (buttons, etc)
            const buttons = clonedElement.querySelectorAll('button');
            buttons.forEach(btn => btn.style.display = 'none');
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // Handle multiple pages if content is too long
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      console.error('PDFService: Erro ao gerar PDF:', error);
    }
  }
};
