import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useGlobalSearch, useRecentSearches } from '@/hooks/useGlobalSearch';
import { type GlobalSearchResult, type SharedData } from '@/types';
import { router } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import { Activity, ArrowRight, Briefcase, Clock, ListChecks, Search, User, Users, X } from 'lucide-react';
import { type ReactNode, useCallback, useState } from 'react';
import { MAIN_NAV } from '@/crm/config/app.config';

interface GlobalSearchProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const EMPTY_RESULTS = { leads: [], tasks: [], users: [], services: [], activities: [] };

const ENTITY_STYLES: Record<string, { bg: string; text: string; icon: ReactNode }> = {
    leads: {
        bg: 'bg-blue-500/10',
        text: 'text-blue-500',
        icon: <Users className="size-3.5" />,
    },
    tasks: {
        bg: 'bg-amber-500/10',
        text: 'text-amber-500',
        icon: <ListChecks className="size-3.5" />,
    },
    users: {
        bg: 'bg-purple-500/10',
        text: 'text-purple-500',
        icon: <User className="size-3.5" />,
    },
    services: {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-500',
        icon: <Briefcase className="size-3.5" />,
    },
    activities: {
        bg: 'bg-orange-500/10',
        text: 'text-orange-500',
        icon: <Activity className="size-3.5" />,
    },
};

function EntityIcon({ entity }: { entity: string }) {
    const style = ENTITY_STYLES[entity];
    if (!style) {
        return null;
    }
    return (
        <span className={`flex size-7 shrink-0 items-center justify-center rounded-md ${style.bg} ${style.text}`}>
            {style.icon}
        </span>
    );
}

function SkeletonRows() {
    return (
        <div className="space-y-3 p-4">
            <div className="flex items-center gap-1.5">
                <div className="h-2 w-16 animate-pulse rounded-full bg-muted" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md px-1 py-1.5">
                    <div className="size-7 animate-pulse rounded-md bg-muted" />
                    <div className="flex-1 space-y-1.5">
                        <div
                            className="h-3.5 animate-pulse rounded bg-muted"
                            style={{ width: `${65 - i * 10}%` }}
                        />
                        <div
                            className="h-2.5 animate-pulse rounded bg-muted/60"
                            style={{ width: `${40 - i * 5}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

function ResultGroup({
    entity,
    heading,
    results,
    onSelect,
    showSeparator,
}: {
    entity: string;
    heading: string;
    results: GlobalSearchResult[];
    onSelect: (result: GlobalSearchResult, entity: string) => void;
    showSeparator: boolean;
}) {
    if (results.length === 0) {
        return null;
    }
    return (
        <>
            {showSeparator && <CommandSeparator />}
            <CommandGroup heading={heading}>
                {results.map((result) => (
                    <CommandItem
                        key={result.id}
                        value={`${entity}-${result.id}`}
                        onSelect={() => onSelect(result, entity)}
                        className="flex items-center gap-3 rounded-md px-2 py-2"
                    >
                        <EntityIcon entity={entity} />
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{result.label}</span>
                            {result.meta && (
                                <span className="block truncate text-xs text-muted-foreground">
                                    {result.meta}
                                </span>
                            )}
                        </span>
                    </CommandItem>
                ))}
            </CommandGroup>
        </>
    );
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
    const [query, setQuery] = useState('');
    const { results, isLoading } = useGlobalSearch(query);
    const { getAll, add, remove } = useRecentSearches();
    const { auth } = usePage<SharedData>().props;

    const handleSelect = useCallback(
        (result: GlobalSearchResult, entity: string) => {
            const listEntities: Record<string, string> = {
                leads: '/leads',
                services: '/services',
                users: '/users',
            };
            const basePath = listEntities[entity];
            const targetUrl = basePath
                ? `${basePath}?search=${encodeURIComponent(result.label)}`
                : result.url;

            if (targetUrl && targetUrl !== '#') {
                if (query.trim()) {
                    add(query.trim());
                }
                onOpenChange(false);
                setQuery('');
                router.visit(targetUrl);
            }
        },
        [query, add, onOpenChange],
    );

    const handleNavSelect = useCallback(
        (path: string) => {
            onOpenChange(false);
            setQuery('');
            router.visit(path);
        },
        [onOpenChange],
    );

    const handleRecentSelect = useCallback(
        (term: string) => {
            setQuery(term);
        },
        [],
    );

    const handleRemoveRecent = useCallback(
        (e: React.MouseEvent, term: string) => {
            e.stopPropagation();
            e.preventDefault();
            remove(term);
        },
        [remove],
    );

    const data = results ?? EMPTY_RESULTS;
    const hasResults =
        data.leads.length > 0 ||
        data.tasks.length > 0 ||
        data.users.length > 0 ||
        data.services.length > 0 ||
        data.activities.length > 0;

    const recentSearches = getAll();
    const showEmpty = query.length >= 2 && !isLoading && !hasResults;
    const showResults = query.length >= 2 && !isLoading && hasResults;
    const showLoading = query.length >= 2 && isLoading;
    const showIdle = query.length < 2;

    // Flat navigation actions from MAIN_NAV, deduplicated by path
    const navActions = MAIN_NAV.flatMap((item) => {
        const children = (item.items ?? []).map((sub) => ({ title: `${item.title} › ${sub.title}`, path: sub.path ?? '' }));
        const childPaths = new Set(children.map((c) => c.path));
        const base = item.path && !childPaths.has(item.path) ? [{ title: item.title ?? '', path: item.path }] : [];
        return [...base, ...children];
    }).filter((a) => a.path && a.path !== '#');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="**:data-[slot=dialog-close]: overflow-hidden p-0 shadow-lg sm:max-w-2xl **:data-[slot=dialog-close]:top-4"
                aria-describedby={undefined}
            >
                <DialogTitle className="sr-only">Global Search</DialogTitle>
                <Command
                    shouldFilter={false}
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/70 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]_svg]:pointer-events-none"
                >
                    <CommandInput placeholder="Search leads, tasks, users..." value={query} onValueChange={setQuery} />
                    <CommandList className="max-h-[480px]">
                        {showLoading && <SkeletonRows />}

                        {showEmpty && (
                            <div className="flex flex-col items-center justify-center gap-3 py-14">
                                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                                    <Search className="size-5 text-muted-foreground" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-foreground">No results found</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        No matches for &ldquo;{query}&rdquo;. Try a different search term.
                                    </p>
                                </div>
                            </div>
                        )}

                        {showResults && (
                            <>
                                <ResultGroup entity="leads" heading="Leads" results={data.leads} onSelect={handleSelect} showSeparator={false} />
                                <ResultGroup
                                    entity="tasks"
                                    heading="Tasks"
                                    results={data.tasks}
                                    onSelect={handleSelect}
                                    showSeparator={data.leads.length > 0}
                                />
                                {auth.isSuperAdmin && (
                                    <ResultGroup
                                        entity="users"
                                        heading="Users"
                                        results={data.users}
                                        onSelect={handleSelect}
                                        showSeparator={data.leads.length > 0 || data.tasks.length > 0}
                                    />
                                )}
                                <ResultGroup
                                    entity="services"
                                    heading="Services"
                                    results={data.services}
                                    onSelect={handleSelect}
                                    showSeparator={data.leads.length > 0 || data.tasks.length > 0 || (auth.isSuperAdmin && data.users.length > 0)}
                                />
                                <ResultGroup
                                    entity="activities"
                                    heading="Activities"
                                    results={data.activities}
                                    onSelect={handleSelect}
                                    showSeparator={
                                        data.leads.length > 0 ||
                                        data.tasks.length > 0 ||
                                        (auth.isSuperAdmin && data.users.length > 0) ||
                                        data.services.length > 0
                                    }
                                />
                            </>
                        )}

                        {showIdle && (
                            <>
                                {recentSearches.length > 0 && (
                                    <CommandGroup heading="Recent">
                                        {recentSearches.map((term) => (
                                            <CommandItem
                                                key={term}
                                                value={`recent-${term}`}
                                                onSelect={() => handleRecentSelect(term)}
                                                className="group flex items-center gap-3 rounded-md px-2 py-2"
                                            >
                                                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                                    <Clock className="size-3.5" />
                                                </span>
                                                <span className="flex-1 truncate text-sm">{term}</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleRemoveRecent(e, term)}
                                                    className="flex size-5 shrink-0 items-center justify-center rounded opacity-0 transition-opacity group-data-[selected=true]:opacity-100 hover:bg-muted"
                                                    aria-label={`Remove "${term}" from recent searches`}
                                                >
                                                    <X className="size-3 text-muted-foreground" />
                                                </button>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}

                                {recentSearches.length > 0 && <CommandSeparator />}

                                <CommandGroup heading="Quick Navigation">
                                    {navActions.slice(0, 8).map((action) => (
                                        <CommandItem
                                            key={action.path}
                                            value={`nav-${action.path}`}
                                            onSelect={() => handleNavSelect(action.path)}
                                            className="flex items-center gap-3 rounded-md px-2 py-2"
                                        >
                                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                                <ArrowRight className="size-3.5" />
                                            </span>
                                            <span className="truncate text-sm">{action.title}</span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>

                    <div className="flex items-center justify-between border-t border-border px-3 py-2">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] leading-none">↑</kbd>
                                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] leading-none">↓</kbd>
                                <span className="ml-0.5">navigate</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] leading-none">↵</kbd>
                                <span className="ml-0.5">select</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] leading-none">esc</kbd>
                                <span className="ml-0.5">close</span>
                            </span>
                        </div>
                    </div>
                </Command>
            </DialogContent>
        </Dialog>
    );
}
