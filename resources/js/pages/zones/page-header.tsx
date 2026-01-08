import { Plus, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentHeader } from '@/crm/layout/components/content-header';

interface PageHeaderProps {
  onNewZone?: () => void;
}

export function PageHeader({ onNewZone }: PageHeaderProps) {
  return (
    <ContentHeader>
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <MapPin className="size-5 text-primary" />
            <h1 className="text-lg font-semibold">Zones Management</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage geographic zones for territory organization and lead assignment
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onNewZone} className="flex items-center gap-2">
            <Plus className="size-4" />
            New Zone
          </Button>
        </div>
      </div>
    </ContentHeader>
  );
}
