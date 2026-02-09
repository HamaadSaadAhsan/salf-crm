import { Plus, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentHeader } from '@/crm/layout/components/content-header';

interface PageHeaderProps {
  onNewPermission?: () => void;
}

export function PageHeader({ onNewPermission }: PageHeaderProps) {
  return (
    <ContentHeader>
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Lock className="size-5 text-primary" />
            <h1 className="text-lg font-semibold">Permissions Management</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage the permission matrix across all roles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onNewPermission} className="flex items-center gap-2">
            <Plus className="size-4" />
            New Permission
          </Button>
        </div>
      </div>
    </ContentHeader>
  );
}
