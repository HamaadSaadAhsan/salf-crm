import { Button } from '@/components/ui/button';
import { Content } from '@/crm/layout/components/content';
import { Plus } from 'lucide-react';

interface PageHeaderProps {
    onNewUser?: () => void;
}

export function PageHeader({ onNewUser }: PageHeaderProps) {
    return (
        <Content className="px-5 pt-3 pb-3 border-b">
            <div className="flex w-full items-center justify-between">
                <div className="flex flex-col">
                    <h1 className="text-lg font-semibold">Users Management</h1>
                    <p className="text-sm text-muted-foreground">Manage users, roles, and program assignments</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={onNewUser} className="flex items-center gap-2">
                        <Plus className="size-4" />
                        New User
                    </Button>
                </div>
            </div>
        </Content>
    );
}
