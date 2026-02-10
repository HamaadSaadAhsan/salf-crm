import { Plus, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentHeader } from '@/crm/layout/components/content-header';

interface PageHeaderProps {
  onNewOrganization?: () => void;
}

export function PageHeader({ onNewOrganization }: PageHeaderProps) {
  return (
    <ContentHeader>
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Landmark className="size-5 text-primary" />
            <h1 className="text-lg font-semibold">Organizations Management</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Create and manage organizations for multi-tenancy
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onNewOrganization} className="flex items-center gap-2">
            <Plus className="size-4" />
            New Organization
          </Button>
        </div>
      </div>
    </ContentHeader>
  );
}
