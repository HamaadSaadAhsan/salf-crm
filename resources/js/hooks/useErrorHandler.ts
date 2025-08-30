import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {handleApiError, logError} from "@/utils/errorHandling";

export function useErrorHandler() {
    const router = useRouter();

    const handleError = useCallback((error: any, context?: string) => {
        const appError = handleApiError(error);
        logError(appError, context);

        // Handle specific error types
        switch (appError.statusCode) {
            case 401:
                // Redirect to login
                router.push('/login');
                break;
            case 403:
                // Redirect to unauthorized page
                router.push('/unauthorized');
                break;
            case 404:
                // Could redirect to 404 page or handle differently
                break;
            default:
                // Show error message or toast
                console.error('Unhandled error:', appError.message);
        }

        return appError;
    }, [router]);

    return { handleError };
}