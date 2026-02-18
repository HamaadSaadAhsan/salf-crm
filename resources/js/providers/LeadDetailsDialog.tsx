import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { Calendar, Clock, Mail, MapPin, Phone, Save, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Lead {
    id?: string;
    name?: string;
    email?: string;
    phone: string;
    company?: string;
    position?: string;
    source?: string;
    status?: string;
    notes?: string;
    country?: string;
    city?: string;
    created_at?: string;
    isNew?: boolean;
    avatar?: string;
}

interface CallSession {
    id: string;
    session_id: string;
    caller: {
        id: string;
        name: string;
        avatar?: string;
    };
    callee: {
        id: string;
        name: string;
        avatar?: string;
    };
    caller_number: string;
    callee_number: string;
    status: string;
    call_type: string;
    call_direction: string;
    started_at: string;
    answered_at?: string;
}

interface LeadDetailsDialogProps {
    lead: Lead;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    callSession?: CallSession | null;
}

const leadStatuses = [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'proposal', label: 'Proposal' },
    { value: 'negotiation', label: 'Negotiation' },
    { value: 'closed_won', label: 'Closed Won' },
    { value: 'closed_lost', label: 'Closed Lost' },
];

const leadSources = [
    { value: 'call', label: 'Phone Call' },
    { value: 'website', label: 'Website' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'referral', label: 'Referral' },
    { value: 'advertising', label: 'Advertising' },
    { value: 'other', label: 'Other' },
];

export function LeadDetailsDialog({ lead, open, onOpenChange, callSession }: LeadDetailsDialogProps) {
    const [isEditing, setIsEditing] = useState(lead.isNew || false);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        company: lead.company || '',
        position: lead.position || '',
        source: lead.source || (callSession ? 'call' : 'other'),
        status: lead.status || 'new',
        notes: lead.notes || (callSession ? `Call received from ${callSession.caller_number} on ${new Date().toLocaleDateString()}` : ''),
        country: lead.country || '',
        city: lead.city || '',
    });

    useEffect(() => {
        if (open && lead) {
            setData({
                name: lead.name || '',
                email: lead.email || '',
                phone: lead.phone || '',
                company: lead.company || '',
                position: lead.position || '',
                source: lead.source || (callSession ? 'call' : 'other'),
                status: lead.status || 'new',
                notes: lead.notes || (callSession ? `Call received from ${callSession.caller_number} on ${new Date().toLocaleDateString()}` : ''),
                country: lead.country || '',
                city: lead.city || '',
            });
            setIsEditing(lead.isNew || false);
        }
    }, [open, lead, callSession]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (lead.isNew || !lead.id) {
            // Create new lead
            post('/leads', {
                onSuccess: () => {
                    toast.success('Lead created successfully');
                    onOpenChange(false);
                    setIsEditing(false);
                    reset();
                },
                onError: (errors) => {
                    toast.error('Failed to create lead');
                    console.error(errors);
                },
            });
        } else {
            // Update existing lead
            put(`/leads/${lead.id}`, {
                onSuccess: () => {
                    toast.success('Lead updated successfully');
                    setIsEditing(false);
                },
                onError: (errors) => {
                    toast.error('Failed to update lead');
                    console.error(errors);
                },
            });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'contacted':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'qualified':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
            case 'proposal':
                return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
            case 'negotiation':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
            case 'closed_won':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'closed_lost':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {lead.isNew ? 'Create New Lead' : 'Lead Details'}
                        {callSession && (
                            <Badge variant="secondary" className="ml-2">
                                From Call
                            </Badge>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Call Information (if applicable) */}
                    {callSession && (
                        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                    <Phone className="h-4 w-4" />
                                    Call Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 pt-0">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Direction:</span>
                                    <Badge variant={callSession.call_direction === 'inbound' ? 'default' : 'secondary'}>
                                        {callSession.call_direction === 'inbound' ? 'Incoming' : 'Outgoing'}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Number:</span>
                                    <span className="font-mono">{callSession.caller_number}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Time:</span>
                                    <span>{new Date(callSession.started_at).toLocaleString()}</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Lead Information */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">Lead Information</CardTitle>
                            {!lead.isNew && !isEditing && (
                                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                    Edit
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            {!isEditing && !lead.isNew ? (
                                // Display mode
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-4">
                                        <Avatar className="h-16 w-16">
                                            <AvatarImage src={lead.avatar} />
                                            <AvatarFallback className="text-lg">{getInitials(lead.name) || '?'}</AvatarFallback>
                                        </Avatar>
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-semibold">{lead.name || 'Unknown'}</h3>
                                            {lead.position && lead.company && (
                                                <p className="text-muted-foreground">
                                                    {lead.position} at {lead.company}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <Badge className={getStatusColor(lead.status || 'new')}>
                                                    {leadStatuses.find((s) => s.value === lead.status)?.label || 'Unknown'}
                                                </Badge>
                                                {lead.source && (
                                                    <Badge variant="outline">
                                                        {leadSources.find((s) => s.value === lead.source)?.label || lead.source}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        {lead.email && (
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                <span>{lead.email}</span>
                                            </div>
                                        )}
                                        {lead.phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-mono">{lead.phone}</span>
                                            </div>
                                        )}
                                        {(lead.city || lead.country) && (
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                                <span>{[lead.city, lead.country].filter(Boolean).join(', ')}</span>
                                            </div>
                                        )}
                                        {lead.created_at && (
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>

                                    {lead.notes && (
                                        <>
                                            <Separator />
                                            <div>
                                                <Label className="text-sm font-medium">Notes</Label>
                                                <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{lead.notes}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                // Edit/Create mode
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Name *</Label>
                                            <Input
                                                id="name"
                                                value={data.name}
                                                onChange={(e) => setData('name', e.target.value)}
                                                placeholder="Enter full name"
                                                required
                                            />
                                            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={data.email}
                                                onChange={(e) => setData('email', e.target.value)}
                                                placeholder="Enter email address"
                                            />
                                            {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone *</Label>
                                            <Input
                                                id="phone"
                                                type="tel"
                                                value={data.phone}
                                                onChange={(e) => setData('phone', e.target.value)}
                                                placeholder="Enter phone number"
                                                disabled={callSession && lead.isNew} // Disable for new leads from calls
                                                className="font-mono"
                                                required
                                            />
                                            {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="company">Company</Label>
                                            <Input
                                                id="company"
                                                value={data.company}
                                                onChange={(e) => setData('company', e.target.value)}
                                                placeholder="Enter company name"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="position">Position</Label>
                                            <Input
                                                id="position"
                                                value={data.position}
                                                onChange={(e) => setData('position', e.target.value)}
                                                placeholder="Enter job title"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="status">Status</Label>
                                            <Select value={data.status} onValueChange={(value) => setData('status', value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {leadStatuses.map((status) => (
                                                        <SelectItem key={status.value} value={status.value}>
                                                            {status.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="source">Source</Label>
                                            <Select value={data.source} onValueChange={(value) => setData('source', value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select source" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {leadSources.map((source) => (
                                                        <SelectItem key={source.value} value={source.value}>
                                                            {source.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="city">City</Label>
                                            <Input
                                                id="city"
                                                value={data.city}
                                                onChange={(e) => setData('city', e.target.value)}
                                                placeholder="Enter city"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="country">Country</Label>
                                            <Input
                                                id="country"
                                                value={data.country}
                                                onChange={(e) => setData('country', e.target.value)}
                                                placeholder="Enter country"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="notes">Notes</Label>
                                        <Textarea
                                            id="notes"
                                            value={data.notes}
                                            onChange={(e) => setData('notes', e.target.value)}
                                            placeholder="Enter any additional notes..."
                                            rows={3}
                                        />
                                    </div>

                                    <div className="flex justify-end space-x-2 pt-4">
                                        {!lead.isNew && (
                                            <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={processing}>
                                                Cancel
                                            </Button>
                                        )}
                                        <Button type="submit" disabled={processing}>
                                            {processing && <Clock className="mr-2 h-4 w-4 animate-spin" />}
                                            <Save className="mr-2 h-4 w-4" />
                                            {lead.isNew ? 'Create Lead' : 'Update Lead'}
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}
