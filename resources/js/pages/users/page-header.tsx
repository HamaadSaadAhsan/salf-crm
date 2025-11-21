import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentHeader } from '@/crm/layout/components/content-header';

interface PageHeaderProps {
  onNewUser?: () => void;
}

export function PageHeader({ onNewUser }: PageHeaderProps) {
  return (
    <ContentHeader>
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">Users Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage users, roles, and program assignments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onNewUser} className="flex items-center gap-2">
            <Plus className="size-4" />
            New User
          </Button>
        </div>
      </div>
    </ContentHeader>
  );
}