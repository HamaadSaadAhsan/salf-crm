import { Plus, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentHeader } from '@/crm/layout/components/content-header';

interface PageHeaderProps {
  onNewCountry?: () => void;
}

export function PageHeader({ onNewCountry }: PageHeaderProps) {
  return (
    <ContentHeader>
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Globe className="size-5 text-primary" />
            <h1 className="text-lg font-semibold">Countries Management</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage countries and regional settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onNewCountry} className="flex items-center gap-2">
            <Plus className="size-4" />
            New Country
          </Button>
        </div>
      </div>
    </ContentHeader>
  );
}
