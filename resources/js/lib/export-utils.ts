import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Export data to CSV format
 */
export function exportToCSV(data: any[], filename: string): void {
  if (!data || data.length === 0) {
    console.error('No data to export');
    return;
  }

  // Get headers from the first object
  const headers = Object.keys(data[0]);

  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape values that contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export element as PNG image
 */
export async function exportToPNG(
  elementId: string,
  filename: string,
  options?: {
    backgroundColor?: string;
    scale?: number;
  }
): Promise<void> {
  const element = document.getElementById(elementId);

  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: options?.backgroundColor || '#ffffff',
      scale: options?.scale || 2,
      logging: false,
      useCORS: true,
    });

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.png`;
        link.click();
        URL.revokeObjectURL(url);
      }
    });
  } catch (error) {
    console.error('Error exporting to PNG:', error);
  }
}

/**
 * Export element as PDF
 */
export async function exportToPDF(
  elementId: string,
  filename: string,
  options?: {
    orientation?: 'portrait' | 'landscape';
    title?: string;
  }
): Promise<void> {
  const element = document.getElementById(elementId);

  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: options?.orientation || 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 10;

    // Add title if provided
    if (options?.title) {
      pdf.setFontSize(16);
      pdf.text(options.title, pdfWidth / 2, 10, { align: 'center' });
    }

    pdf.addImage(
      imgData,
      'PNG',
      imgX,
      options?.title ? imgY + 10 : imgY,
      imgWidth * ratio,
      imgHeight * ratio
    );

    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
  }
}

/**
 * Export JSON data
 */
export function exportToJSON(data: any, filename: string): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `${filename}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Copy data to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Format data for export based on type
 */
export function formatDataForExport(
  data: any[],
  format: 'csv' | 'json' | 'table'
): string {
  switch (format) {
    case 'csv': {
      const headers = Object.keys(data[0]);
      return [
        headers.join(','),
        ...data.map(row => headers.map(h => row[h]).join(','))
      ].join('\n');
    }

    case 'json':
      return JSON.stringify(data, null, 2);

    case 'table': {
      // Simple ASCII table format
      const keys = Object.keys(data[0]);
      const maxLengths = keys.map(key =>
        Math.max(
          key.length,
          ...data.map(row => String(row[key]).length)
        )
      );

      const header = keys.map((key, i) =>
        key.padEnd(maxLengths[i])
      ).join(' | ');

      const separator = maxLengths.map(len => '-'.repeat(len)).join('-+-');

      const rows = data.map(row =>
        keys.map((key, i) =>
          String(row[key]).padEnd(maxLengths[i])
        ).join(' | ')
      );

      return [header, separator, ...rows].join('\n');
    }

    default:
      return JSON.stringify(data);
  }
}