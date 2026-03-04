import { Button } from '@/components/ui/button';
import { Calendar, Phone } from 'lucide-react';

export function PageHeader() {
    return (
        <div className="flex items-center justify-between px-5 pt-5 pb-2 lg:px-6">
            <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                    <Phone className="size-5 text-primary" />
                    <h1 className="text-lg font-semibold">Call Sessions</h1>
                </div>
                <p className="text-sm text-muted-foreground">View and manage your call history and active sessions</p>
            </div>

            <div className="flex items-center gap-2.5">
                <Button variant="outline" size="sm">
                    <Calendar className="mr-2 h-4 w-4" />
                    History
                </Button>
            </div>
        </div>
    );
}