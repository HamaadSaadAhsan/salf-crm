import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, X } from 'lucide-react';
import type { Lead } from '@/types/lead';

interface Navigation {
    prev: number | null;
    next: number | null;
    current: number;
    total: number;
}

interface PanelHeaderProps {
    lead: Lead;
    navigation: Navigation;
}

export function PanelHeader({ lead, navigation }: PanelHeaderProps) {
    const handleClose = () => {
        router.visit('/leads', { preserveState: false });
    };

    const handlePrev = () => {
        if (navigation.prev) {
            router.visit(`/leads/${navigation.prev}/overview`, {
                preserveState: false,
            });
        }
    };

    const handleNext = () => {
        if (navigation.next) {
            router.visit(`/leads/${navigation.next}/overview`, {
                preserveState: false,
            });
        }
    };

    return (
        <div className="group/header flex h-10 max-h-[49px] min-h-[49px] shrink-0 items-center gap-1 border-b border-white/[0.08] px-3">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-[rgb(162,164,167)] hover:text-white" onClick={handleClose}>
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
            </Button>

            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handlePrev}
                    disabled={!navigation.prev}
                >
                    <ChevronUp className="h-4 w-4" />
                    <span className="sr-only">Previous lead</span>
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleNext}
                    disabled={!navigation.next}
                >
                    <ChevronDown className="h-4 w-4" />
                    <span className="sr-only">Next lead</span>
                </Button>
            </div>

            <span className="ml-1 text-xs text-[rgb(162,164,167)]">
                {navigation.current} of {navigation.total} in all leads
            </span>
        </div>
    );
}
