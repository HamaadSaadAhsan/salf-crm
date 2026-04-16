import { Head } from '@inertiajs/react';

import AppearanceTabs from '@/components/appearance-tabs';
import { Card, CardContent, CardDescription, CardHeader, CardHeading, CardTitle } from '@/components/ui/card';
import { type BreadcrumbItem } from '@/types';

import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { appearance } from '@/routes';
import { useAppearance } from '@/hooks/use-appearance';
import { Monitor, Moon, Sun } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Appearance settings',
        href: appearance().url,
    },
];

const themeOptions = [
    {
        value: 'light' as const,
        icon: Sun,
        label: 'Light',
        description: 'A clean, bright interface for well-lit environments',
        preview: 'bg-white border-2',
        previewInner: 'bg-gray-100',
        previewAccent: 'bg-blue-500',
    },
    {
        value: 'dark' as const,
        icon: Moon,
        label: 'Dark',
        description: 'Easy on the eyes in low-light environments',
        preview: 'bg-zinc-900 border-2',
        previewInner: 'bg-zinc-700',
        previewAccent: 'bg-blue-400',
    },
    {
        value: 'system' as const,
        icon: Monitor,
        label: 'System',
        description: 'Automatically match your device\'s theme preference',
        preview: 'bg-linear-to-r from-white to-zinc-900 border-2',
        previewInner: 'bg-linear-to-r from-gray-100 to-zinc-700',
        previewAccent: 'bg-blue-500',
    },
];

export default function Appearance() {
    const { appearance: currentAppearance, updateAppearance } = useAppearance();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Appearance settings" />

            <SettingsLayout>
                <div className="w-full max-w-3xl space-y-6 py-6">
                    {/* Theme Selection */}
                    <Card>
                        <CardHeader>
                            <CardHeading>
                                <CardTitle>Theme</CardTitle>
                                <CardDescription>Choose how the interface looks for you</CardDescription>
                            </CardHeading>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                {themeOptions.map(({ value, icon: Icon, label, description, preview, previewInner, previewAccent }) => {
                                    const isActive = currentAppearance === value;
                                    return (
                                        <button
                                            key={value}
                                            onClick={() => updateAppearance(value)}
                                            className={`group relative flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all hover:shadow-md ${
                                                isActive
                                                    ? 'border-blue-600 shadow-sm ring-1 ring-blue-600/20'
                                                    : 'border-border hover:border-blue-600/40'
                                            }`}
                                        >
                                            {/* Mini preview */}
                                            <div className={`flex h-24 w-full items-start gap-1.5 overflow-hidden p-2 ${preview}`}>
                                                <div className={`h-full w-8 rounded ${previewInner}`} />
                                                <div className="flex flex-1 flex-col gap-1.5 pt-1">
                                                    <div className={`h-2 w-12 rounded-full ${previewAccent}`} />
                                                    <div className={`h-1.5 w-full rounded-full ${previewInner}`} />
                                                    <div className={`h-1.5 w-3/4 rounded-full ${previewInner}`} />
                                                    <div className={`mt-1 h-5 w-10 rounded ${previewAccent} opacity-80`} />
                                                </div>
                                            </div>

                                            {/* Label */}
                                            <div className="flex items-center gap-2.5 px-3 py-3">
                                                <div
                                                    className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                                                        isActive ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'
                                                    }`}
                                                >
                                                    <Icon className="size-3.5" />
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-medium ${isActive ? 'text-blue-600' : ''}`}>{label}</p>
                                                    <p className="text-xs text-muted-foreground">{description}</p>
                                                </div>
                                            </div>

                                            {isActive && (
                                                <div className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-blue-600">
                                                    <svg className="size-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Compact toggle fallback */}
                            <div className="mt-5 flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                                <div>
                                    <p className="text-sm font-medium">Quick toggle</p>
                                    <p className="text-xs text-muted-foreground">Switch theme using the tab selector</p>
                                </div>
                                <AppearanceTabs />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
