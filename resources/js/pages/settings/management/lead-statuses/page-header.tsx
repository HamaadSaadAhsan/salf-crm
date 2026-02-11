import { Plus, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentHeader } from '@/crm/layout/components/content-header';

interface PageHeaderProps {
  onNewStatus?: () => void;
}

export function PageHeader({ onNewStatus }: PageHeaderProps) {
  return (
    <ContentHeader>
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <ListChecks className="size-5 text-primary" />
            <h1 className="text-lg font-semibold">Lead Statuses Management</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure lead lifecycle statuses and colors
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onNewStatus} className="flex items-center gap-2">
            <Plus className="size-4" />
            New Status
          </Button>
        </div>
      </div>
    </ContentHeader>
  );
}
