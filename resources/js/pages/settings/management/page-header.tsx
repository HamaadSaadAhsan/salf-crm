import { Content } from '@/crm/layout/components/content';
import { Settings2 } from 'lucide-react';

export function PageHeader() {
    return (
        <Content className="border-b px-5 pt-3 pb-3">
            <div className="flex w-full items-center justify-between">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <Settings2 className="size-5 text-primary" />
                        <h1 className="text-lg font-semibold">Management Settings</h1>
                    </div>
                    <p className="text-sm text-muted-foreground">Configure zones, locations, and system settings</p>
                </div>
            </div>
        </Content>
    );
}
