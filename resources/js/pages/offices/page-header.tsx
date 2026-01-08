import { Plus, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentHeader } from '@/crm/layout/components/content-header';

interface PageHeaderProps {
  onNewOffice?: () => void;
}

export function PageHeader({ onNewOffice }: PageHeaderProps) {
  return (
    <ContentHeader>
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Building className="size-5 text-primary" />
            <h1 className="text-lg font-semibold">Offices Management</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage office locations and assign them to zones
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onNewOffice} className="flex items-center gap-2">
            <Plus className="size-4" />
            New Office
          </Button>
        </div>
      </div>
    </ContentHeader>
  );
}
