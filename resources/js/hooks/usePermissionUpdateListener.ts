import { useCallback } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { useEcho } from '@laravel/echo-react';

interface PermissionsUpdatedData {
    role_name: string;
    timestamp: string;
}

interface UsePermissionUpdateListenerOptions {
    userId: number;
    enabled?: boolean;
}

export function usePermissionUpdateListener({
    userId,
    enabled = true,
}: UsePermissionUpdateListenerOptions) {

    const handlePermissionsUpdated = useCallback((event: PermissionsUpdatedData) => {
        toast.info('Permissions Updated', {
            description: `Your permissions for the "${event.role_name}" role have been updated.`,
            duration: 5000,
        });

        // Full page reload to refresh shared auth data + sidebar navigation
        router.reload();
    }, []);

    useEcho(`user.${userId}`, '.permissions.updated', (event: PermissionsUpdatedData) => {
        if (enabled) {
            handlePermissionsUpdated(event);
        }
    });

    return null;
}
