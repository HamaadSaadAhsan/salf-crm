import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateApplication, useUpdateApplication } from '@/hooks/useFormsAutomation';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { FileText, Loader2, Save } from 'lucide-react';
import { useState } from 'react';

interface Program {
    id: number;
    name: string;
    code: string;
    country_code: string;
}

interface ExistingApplication {
    id: number;
    application_code: string;
    main_applicant_name: string | null;
    main_applicant_passport: string | null;
    status: string;
    data: Record<string, unknown> | null;
    program_id: number;
}

interface Props {
    programs: Program[];
    application?: ExistingApplication;
}

const DEFAULT_DATA = `{
  "main_applicant": {
    "surname": "",
    "given_names": "",
    "date_of_birth": "",
    "place_of_birth": "",
    "nationality": "",
    "passport_number": "",
    "passport_expiry": "",
    "occupation": "",
    "gender": { "male": false, "female": false },
    "marital_status": "",
    "email": "",
    "phone": "",
    "address": {
      "line1": "",
      "city": "",
      "country": ""
    }
  },
  "spouse": null,
  "children": [],
  "investment": {
    "type": "",
    "amount": ""
  }
}`;

export default function ApplicationCreatePage({ programs, application }: Props) {
    const isEditing = Boolean(application);

    const [programId, setProgramId] = useState<string>(application?.program_id?.toString() ?? '');
    const [name, setName] = useState(application?.main_applicant_name ?? '');
    const [passport, setPassport] = useState(application?.main_applicant_passport ?? '');
    const [dataText, setDataText] = useState(
        application?.data ? JSON.stringify(application.data, null, 2) : DEFAULT_DATA,
    );
    const [jsonError, setJsonError] = useState('');

    const createApp = useCreateApplication();
    const updateApp = useUpdateApplication();

    const isPending = createApp.isPending || updateApp.isPending;

    const validateJson = (text: string) => {
        try {
            JSON.parse(text);
            setJsonError('');
            return true;
        } catch (e) {
            setJsonError((e as Error).message);
            return false;
        }
    };

    const handleSubmit = () => {
        if (!programId) { return; }
        if (!validateJson(dataText)) { return; }

        const data = JSON.parse(dataText) as Record<string, unknown>;

        if (isEditing && application) {
            updateApp.mutate({
                applicationId: application.id,
                main_applicant_name: name,
                main_applicant_passport: passport,
                data,
            });
        } else {
            createApp.mutate({
                program_id: parseInt(programId),
                main_applicant_name: name,
                main_applicant_passport: passport,
                data,
            });
        }
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Management', href: '/settings/management' },
        { title: 'Forms Automation', href: '/settings/management/pdf-templates' },
        { title: 'Applications', href: '/settings/management/forms/applications' },
        { title: isEditing ? `Edit ${application?.application_code}` : 'New Application', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEditing ? `Edit ${application?.application_code}` : 'New Application'} />

            <div className="flex w-full items-center justify-between px-4 py-2 border-b">
                <div className="flex items-center gap-2">
                    <FileText className="size-5 text-primary" />
                    <h1 className="text-lg font-semibold">
                        {isEditing ? `Edit ${application?.application_code}` : 'New Application'}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" asChild>
                        <Link href="/settings/management/forms/applications">Cancel</Link>
                    </Button>
                    <Button onClick={handleSubmit} disabled={isPending || !programId}>
                        {isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                        {isEditing ? 'Save Changes' : 'Create Application'}
                    </Button>
                </div>
            </div>

            <div className="p-4 max-w-4xl space-y-4">
                {/* Basic details */}
                <Card>
                    <CardHeader className="px-4 py-3 border-b">
                        <h2 className="font-semibold text-sm">Application Details</h2>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="program">Program *</Label>
                                <select
                                    id="program"
                                    value={programId}
                                    onChange={(e) => setProgramId(e.target.value)}
                                    disabled={isEditing}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
                                >
                                    <option value="">Select program…</option>
                                    {programs.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="name">Main Applicant Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. John Smith"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="passport">Passport Number</Label>
                                <Input
                                    id="passport"
                                    value={passport}
                                    onChange={(e) => setPassport(e.target.value)}
                                    placeholder="e.g. A12345678"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Applicant data */}
                <Card>
                    <CardHeader className="px-4 py-3 border-b">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-sm">Applicant Data (JSON)</h2>
                            <p className="text-xs text-muted-foreground">
                                This data is used to fill all forms in the program. Use dot-notation canonical paths from field mappings.
                            </p>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        <textarea
                            value={dataText}
                            onChange={(e) => {
                                setDataText(e.target.value);
                                if (jsonError) { validateJson(e.target.value); }
                            }}
                            onBlur={() => validateJson(dataText)}
                            rows={28}
                            className="w-full font-mono text-xs rounded-md border border-input bg-background p-3 resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                            spellCheck={false}
                        />
                        {jsonError && (
                            <p className="mt-1 text-xs text-red-600 font-mono">{jsonError}</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
