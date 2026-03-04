import { Button } from '@/components/ui/button';
import { CircleHelp } from 'lucide-react';
import { Link, usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';

export function HeaderHelp() {
    const { auth } = usePage<SharedData>().props;
    const href = auth.isSuperAdmin ? '/admin/tickets' : '/support';

    return (
        <div className="relative">
            <Button
                asChild
                variant="ghost"
                size="sm"
                mode="icon"
                className="text-muted-foreground hover:border-accent hover:bg-accent hover:text-foreground"
            >
                <Link href={href}>
                    <CircleHelp className="size-4" />
                </Link>
            </Button>
            {auth.isSuperAdmin && auth.openTicketsCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                    {auth.openTicketsCount > 9 ? '9+' : auth.openTicketsCount}
                </span>
            )}
        </div>
    );
}
