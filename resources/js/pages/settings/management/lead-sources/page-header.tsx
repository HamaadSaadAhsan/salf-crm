import { Plus, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentHeader } from '@/crm/layout/components/content-header';

interface PageHeaderProps {
  onNewSource?: () => void;
}

export function PageHeader({ onNewSource }: PageHeaderProps) {
  return (
    <ContentHeader>
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Share2 className="size-5 text-primary" />
            <h1 className="text-lg font-semibold">Lead Sources Management</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage and organize lead sources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onNewSource} className="flex items-center gap-2">
            <Plus className="size-4" />
            New Source
          </Button>
        </div>
      </div>
    </ContentHeader>
  );
}
