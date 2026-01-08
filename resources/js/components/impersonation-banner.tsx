import { Button } from '@/components/ui/button';
import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { LogOut, UserCog } from 'lucide-react';

export function ImpersonationBanner() {
    const { impersonation, auth } = usePage<SharedData>().props;

    if (!impersonation.isImpersonating) {
        return null;
    }

    const handleLeaveImpersonation = () => {
        router.post('/impersonate/leave');
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 py-2 px-4">
            <div className="container mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <UserCog className="h-5 w-5" />
                    <span className="text-sm font-medium">
                        You are currently impersonating{' '}
                        <strong>{auth.user.name}</strong>
                        {impersonation.impersonator && (
                            <span className="ml-1 opacity-75">
                                (Logged in as {impersonation.impersonator.name})
                            </span>
                        )}
                    </span>
                </div>
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleLeaveImpersonation}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-600"
                >
                    <LogOut className="h-4 w-4 mr-2" />
                    Leave Impersonation
                </Button>
            </div>
        </div>
    );
}
