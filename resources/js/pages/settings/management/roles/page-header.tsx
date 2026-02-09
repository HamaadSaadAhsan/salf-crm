import { Plus, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentHeader } from '@/crm/layout/components/content-header';

interface PageHeaderProps {
  onNewRole?: () => void;
}

export function PageHeader({ onNewRole }: PageHeaderProps) {
  return (
    <ContentHeader>
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-primary" />
            <h1 className="text-lg font-semibold">Roles Management</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Create and manage roles with permission assignments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onNewRole} className="flex items-center gap-2">
            <Plus className="size-4" />
            New Role
          </Button>
        </div>
      </div>
    </ContentHeader>
  );
}
