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
import { useCountryOptions, useCityOptions } from '@/hooks/useLocation';
import { Checkbox } from '@/components/ui/checkbox';

interface LeadSource {
    id: number;
    name: string;
}

interface Service {
    id: number;
    name: string;
}

interface NewLeadSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leadSources: LeadSource[];
    services: Service[];
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

function getCityPlaceholder(country: string, isLoading: boolean): string {
    if (!country) return 'Select country first';
    if (isLoading) return 'Loading...';
    return 'Select city';
}

export function NewLeadSheet({ open, onOpenChange, leadSources, services }: NewLeadSheetProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        phone: '',
        secondary_phone: '',
        occupation: '',
        inquiry_status: 'new',
        priority: 'medium',
        lead_source_id: '' as string | number,
        service_id: '' as string | number,
        country: '',
        city: '',
        budget: {
            amount: '',
            currency: 'USD',
        },
        detail: '',
    });

    const { options: countryOptions } = useCountryOptions();
    const { options: cityOptions, isLoading: isLoadingCities } = useCityOptions(data.country || null);

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

    const handleCountryChange = (value: string) => {
        setData((prev) => ({ ...prev, country: value, city: '' }));
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent className="sm:max-w-[680px] overflow-y-auto">
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

                    {/* Phone & Secondary Phone */}
                    <div className="grid grid-cols-2 gap-4">
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

                        <div className="space-y-2">
                            <Label htmlFor="secondary_phone">
                                Secondary Phone <span className="text-muted-foreground text-xs">(Optional)</span>
                            </Label>
                            <Input
                                id="secondary_phone"
                                type="tel"
                                value={data.secondary_phone}
                                onChange={(e) => setData('secondary_phone', e.target.value)}
                                placeholder="+1 (555) 987-6543"
                                disabled={processing}
                            />
                            {errors.secondary_phone && (
                                <p className="text-sm text-destructive">{errors.secondary_phone}</p>
                            )}
                        </div>
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
                                disabled={processing || data.inquiry_status === 'closed'}
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
                                    <SelectItem value="closed">Closed</SelectItem>
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

                    {/* Lead Source & Service */}
                    <div className="grid grid-cols-2 gap-4">
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
                                    {[...leadSources].sort((a, b) => (a.name === 'Facebook Ads' ? -1 : b.name === 'Facebook Ads' ? 1 : 0)).map((source) => (
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

                        <div className="space-y-2">
                            <Label htmlFor="service_id">Service</Label>
                            <Select
                                value={data.service_id ? String(data.service_id) : ''}
                                onValueChange={(value) => setData('service_id', value ? Number(value) : '')}
                                disabled={processing}
                            >
                                <SelectTrigger id="service_id">
                                    <SelectValue placeholder="Select service" />
                                </SelectTrigger>
                                <SelectContent>
                                    {services.map((service) => (
                                        <SelectItem key={service.id} value={String(service.id)}>
                                            {service.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.service_id && (
                                <p className="text-sm text-destructive">{errors.service_id}</p>
                            )}
                        </div>
                    </div>

                    {/* Country & City */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="country">Country</Label>
                            <Select
                                value={data.country}
                                onValueChange={handleCountryChange}
                                disabled={processing}
                            >
                                <SelectTrigger id="country">
                                    <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                                <SelectContent>
                                    {countryOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.country && (
                                <p className="text-sm text-destructive">{errors.country}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Select
                                value={data.city}
                                onValueChange={(value) => setData('city', value)}
                                disabled={processing || !data.country || isLoadingCities}
                            >
                                <SelectTrigger id="city">
                                    <SelectValue placeholder={getCityPlaceholder(data.country, isLoadingCities)} />
                                </SelectTrigger>
                                <SelectContent>
                                    {[...new Map(cityOptions.map((o) => [o.value, o])).values()].map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.city && (
                                <p className="text-sm text-destructive">{errors.city}</p>
                            )}
                        </div>
                    </div>

                    {/* Budget + Is Closed */}
                    <div className="flex items-end gap-4">
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="budget_amount">Budget</Label>
                            <div className="flex gap-2">
                                <Select
                                    value={data.budget.currency}
                                    onValueChange={(value) => setData('budget', { ...data.budget, currency: value })}
                                    disabled={processing}
                                >
                                    <SelectTrigger className="w-[100px]">
                                        <SelectValue placeholder="Currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USD">$ USD</SelectItem>
                                        <SelectItem value="EUR">€ EUR</SelectItem>
                                        <SelectItem value="PKR">₨ PKR</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    id="budget_amount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={data.budget.amount}
                                    onChange={(e) => setData('budget', { ...data.budget, amount: e.target.value })}
                                    placeholder="0.00"
                                    disabled={processing}
                                    className="flex-1"
                                />
                            </div>
                            {errors['budget.amount'] && (
                                <p className="text-sm text-destructive">{errors['budget.amount']}</p>
                            )}
                        </div>

                        <div className="flex items-center gap-2 pb-2">
                            <Checkbox
                                id="is_closed"
                                checked={data.inquiry_status === 'closed'}
                                onCheckedChange={(checked) =>
                                    setData('inquiry_status', checked === true ? 'closed' : 'new')
                                }
                                disabled={processing}
                            />
                            <Label htmlFor="is_closed" className="cursor-pointer">Is Closed</Label>
                        </div>
                    </div>

                    {/* Detail / Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="detail">Comments</Label>
                        <Textarea
                            id="detail"
                            value={data.detail}
                            onChange={(e) => setData('detail', e.target.value)}
                            placeholder="Add any additional comments on this lead..."
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
