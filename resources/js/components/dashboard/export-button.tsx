import React, { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, FileImage, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToCSV, exportToJSON, exportToPNG, exportToPDF } from '@/lib/export-utils';

export interface ExportButtonProps {
  data?: any[];
  elementId?: string;
  filename: string;
  title?: string;
  formats?: ('csv' | 'json' | 'png' | 'pdf')[];
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function ExportButton({
  data,
  elementId,
  filename,
  title,
  formats = ['csv', 'png', 'pdf'],
  variant = 'outline',
  size = 'sm',
  className,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'json' | 'png' | 'pdf') => {
    setIsExporting(true);

    try {
      switch (format) {
        case 'csv':
          if (!data || data.length === 0) {
            toast.error('Export failed', {
              description: 'No data available to export',
            });
            return;
          }
          exportToCSV(data, filename);
          toast.success('Export successful', {
            description: 'Data exported as CSV',
          });
          break;

        case 'json':
          if (!data) {
            toast.error('Export failed', {
              description: 'No data available to export',
            });
            return;
          }
          exportToJSON(data, filename);
          toast.success('Export successful', {
            description: 'Data exported as JSON',
          });
          break;

        case 'png':
          if (!elementId) {
            toast.error('Export failed', {
              description: 'No element ID provided',
            });
            return;
          }
          await exportToPNG(elementId, filename);
          toast.success('Export successful', {
            description: 'Chart exported as PNG',
          });
          break;

        case 'pdf':
          if (!elementId) {
            toast.error('Export failed', {
              description: 'No element ID provided',
            });
            return;
          }
          await exportToPDF(elementId, filename, { title });
          toast.success('Export successful', {
            description: 'Chart exported as PDF',
          });
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed', {
        description: 'An error occurred during export',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv':
        return <FileSpreadsheet className="mr-2 h-4 w-4" />;
      case 'json':
        return <FileJson className="mr-2 h-4 w-4" />;
      case 'png':
        return <FileImage className="mr-2 h-4 w-4" />;
      case 'pdf':
        return <FileText className="mr-2 h-4 w-4" />;
      default:
        return <Download className="mr-2 h-4 w-4" />;
    }
  };

  const getFormatLabel = (format: string) => {
    switch (format) {
      case 'csv':
        return 'Export as CSV';
      case 'json':
        return 'Export as JSON';
      case 'png':
        return 'Export as PNG';
      case 'pdf':
        return 'Export as PDF';
      default:
        return 'Export';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {formats.map((format) => (
          <DropdownMenuItem
            key={format}
            onClick={() => handleExport(format)}
            disabled={isExporting}
          >
            {getFormatIcon(format)}
            {getFormatLabel(format)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}