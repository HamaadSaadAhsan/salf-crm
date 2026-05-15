import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Plus, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as teamActions from '@/actions/App/Http/Controllers/TeamController';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Teams', href: '#' },
    { title: 'Create Team', href: '/teams/create' },
];

export default function TeamCreate() {
    const { data, setData, post, processing, errors } = useForm({ name: '' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(teamActions.store().url);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Team" />

            <div className="flex items-center justify-between border-b px-6 py-4">
                <h1 className="inline-flex items-center gap-2.5 text-lg font-semibold">
                    <Users className="size-5 text-primary" /> Create Team
                </h1>
            </div>

            <div className="mx-auto max-w-md px-6 py-10">
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <div className="mb-6 text-center">
                        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
                            <Users className="size-6 text-primary" />
                        </div>
                        <h2 className="text-base font-semibold">New Team</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Create a team to collaborate with your colleagues.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="name">Team name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Sales Team"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                autoFocus
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive">{errors.name}</p>
                            )}
                        </div>

                        <Button type="submit" disabled={processing} className="w-full">
                            <Plus className="size-4" />
                            {processing ? 'Creating…' : 'Create Team'}
                        </Button>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
