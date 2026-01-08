import { Settings2 } from 'lucide-react';
import { ContentHeader } from '@/crm/layout/components/content-header';

export function PageHeader() {
  return (
    <ContentHeader>
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Settings2 className="size-5 text-primary" />
            <h1 className="text-lg font-semibold">Management Settings</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure zones, locations, and system settings
          </p>
        </div>
      </div>
    </ContentHeader>
  );
}
