import { Plus, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentHeader } from '@/crm/layout/components/content-header';

interface PageHeaderProps {
  onNewProvince?: () => void;
}

export function PageHeader({ onNewProvince }: PageHeaderProps) {
  return (
    <ContentHeader>
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Map className="size-5 text-primary" />
            <h1 className="text-lg font-semibold">Provinces Management</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure provinces and states
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onNewProvince} className="flex items-center gap-2">
            <Plus className="size-4" />
            New Province
          </Button>
        </div>
      </div>
    </ContentHeader>
  );
}
