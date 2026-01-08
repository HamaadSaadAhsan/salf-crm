import { Button } from '@/components/ui/button';
import { Plus, Globe } from 'lucide-react';
import { ContentHeader } from '@/crm/layout/components/content-header';

interface PageHeaderProps {
  onNewService: () => void;
}

export function PageHeader({ onNewService }: PageHeaderProps) {
  return (
      <ContentHeader>
          <div className="flex w-full items-center justify-between">
              <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                      <Globe className="size-5 text-primary" />
                      <h1 className="text-lg font-semibold">Program Management</h1>
                  </div>
                  <p className="text-sm text-muted-foreground">Manage services and programs</p>
              </div>
              <div className="flex items-center gap-2">
                  <Button
                      size="sm"
                      className="bg-gradient-to-r from-blue-800 to-blue-600 text-white hover:from-blue-600 hover:text-white"
                      onClick={onNewService}
                  >
                      <Plus className="mr-2 h-4 w-4" />
                      New Service
                  </Button>
              </div>
          </div>
      </ContentHeader>
  );
}
