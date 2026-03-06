import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { store } from '@/actions/App/Http/Controllers/Leads/LeadController';

interface LeadSource {
    id: number;
    name: string;
}

interface NewLeadSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leadSources: LeadSource[];
}

const LEAD_STATUSES = [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'proposal', label: 'Proposal Sent' },
    { value: 'nurturing', label: 'Nurturing' },
    { value: 'won', label: 'Won' },
    { value: 'lost', label: 'Lost' },
];

const LEAD_PRIORITIES = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
];

export function NewLeadSheet({ open, onOpenChange, leadSources }: NewLeadSheetProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        phone: '',
        occupation: '',
        inquiry_status: 'new',
        priority: 'medium',
        lead_source_id: '' as string | number,
        detail: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(store().url, {
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        });
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            reset();
        }
        onOpenChange(isOpen);
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent className="sm:max-w-[540px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Create New Lead</SheetTitle>
                    <SheetDescription>
                        Add a new lead to the system. Fill in the details below.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-6 mb-6">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">
                            Full Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="John Doe"
                            disabled={processing}
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive">{errors.name}</p>
                        )}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="john@example.com"
                            disabled={processing}
                        />
                        {errors.email && (
                            <p className="text-sm text-destructive">{errors.email}</p>
                        )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            placeholder="+1 (555) 123-4567"
                            disabled={processing}
                        />
                        {errors.phone && (
                            <p className="text-sm text-destructive">{errors.phone}</p>
                        )}
                    </div>

                    {/* Occupation */}
                    <div className="space-y-2">
                        <Label htmlFor="occupation">Occupation / Company</Label>
                        <Input
                            id="occupation"
                            value={data.occupation}
                            onChange={(e) => setData('occupation', e.target.value)}
                            placeholder="CEO at Acme Inc."
                            disabled={processing}
                        />
                        {errors.occupation && (
                            <p className="text-sm text-destructive">{errors.occupation}</p>
                        )}
                    </div>

                    {/* Status & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="inquiry_status">Status</Label>
                            <Select
                                value={data.inquiry_status}
                                onValueChange={(value) => setData('inquiry_status', value)}
                                disabled={processing}
                            >
                                <SelectTrigger id="inquiry_status">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {LEAD_STATUSES.map((status) => (
                                        <SelectItem key={status.value} value={status.value}>
                                            {status.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.inquiry_status && (
                                <p className="text-sm text-destructive">{errors.inquiry_status}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Select
                                value={data.priority}
                                onValueChange={(value) => setData('priority', value)}
                                disabled={processing}
                            >
                                <SelectTrigger id="priority">
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    {LEAD_PRIORITIES.map((priority) => (
                                        <SelectItem key={priority.value} value={priority.value}>
                                            {priority.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.priority && (
                                <p className="text-sm text-destructive">{errors.priority}</p>
                            )}
                        </div>
                    </div>

                    {/* Lead Source */}
                    <div className="space-y-2">
                        <Label htmlFor="lead_source_id">Lead Source</Label>
                        <Select
                            value={data.lead_source_id ? String(data.lead_source_id) : ''}
                            onValueChange={(value) => setData('lead_source_id', value ? Number(value) : '')}
                            disabled={processing}
                        >
                            <SelectTrigger id="lead_source_id">
                                <SelectValue placeholder="Select source" />
                            </SelectTrigger>
                            <SelectContent>
                                {leadSources.map((source) => (
                                    <SelectItem key={source.id} value={String(source.id)}>
                                        {source.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.lead_source_id && (
                            <p className="text-sm text-destructive">{errors.lead_source_id}</p>
                        )}
                    </div>

                    {/* Detail / Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="detail">Notes</Label>
                        <Textarea
                            id="detail"
                            value={data.detail}
                            onChange={(e) => setData('detail', e.target.value)}
                            placeholder="Add any additional notes about this lead..."
                            disabled={processing}
                            rows={4}
                        />
                        {errors.detail && (
                            <p className="text-sm text-destructive">{errors.detail}</p>
                        )}
                    </div>

                    <SheetFooter className="mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating...' : 'Create Lead'}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}