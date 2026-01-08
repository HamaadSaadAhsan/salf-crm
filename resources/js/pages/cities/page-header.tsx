import { Plus, MapPinned } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentHeader } from '@/crm/layout/components/content-header';

interface PageHeaderProps {
  onNewCity?: () => void;
}

export function PageHeader({ onNewCity }: PageHeaderProps) {
  return (
    <ContentHeader>
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <MapPinned className="size-5 text-primary" />
            <h1 className="text-lg font-semibold">Cities Management</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage cities and municipalities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onNewCity} className="flex items-center gap-2">
            <Plus className="size-4" />
            New City
          </Button>
        </div>
      </div>
    </ContentHeader>
  );
}
