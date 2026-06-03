import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useCreateApplication, useUpdateApplication } from '@/hooks/useFormsAutomation';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, ChevronDown, ChevronRight, FileText, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';

// ─── types ─────────────────────────────────────────────────────────────────

interface Program {
    id: number;
    name: string;
    code: string;
    country_code: string | null;
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

interface PassportEntry {
    number: string;
    country_of_issue: string;
    date_of_issue: string;
    date_of_expiry: string;
}

interface EmploymentEntry {
    period_start: string;
    period_end: string;
    employer_name: string;
    address: string;
    position: string;
    business_type: string;
    reason_leaving: string;
}

interface AddressHistoryEntry {
    date_from: string;
    date_to: string;
    full_address: string;
}

interface ChildEntry {
    given_names: string;
    surname: string;
    dob: string;
    gender: string;
    nationality: string;
    place_of_birth: string;
}

interface IntakeForm {
    // Personal
    surname: string;
    given_name: string;
    middle_name: string;
    dob: string;
    place_of_birth: string;
    gender: string;
    nationality: string;
    email: string;
    phone_mobile: string;
    phone_home: string;
    // Passports
    passports: PassportEntry[];
    // Current residential address
    residential_address: string;
    residential_city: string;
    residential_state: string;
    residential_country: string;
    residential_postal_code: string;
    residential_date_since_month: string;
    residential_date_since_year: string;
    // Permanent residential address
    permanent_address: string;
    permanent_city: string;
    permanent_state: string;
    permanent_country: string;
    permanent_postal_code: string;
    permanent_date_since_month: string;
    permanent_date_since_year: string;
    // Address history
    address_history: AddressHistoryEntry[];
    // Employment
    occupation_by_training: string;
    current_occupation: string;
    is_self_employed: boolean;
    employer_name: string;
    employer_address: string;
    employment_history: EmploymentEntry[];
    // Dependents
    has_spouse: boolean;
    spouse_given_names: string;
    spouse_surname: string;
    spouse_dob: string;
    spouse_nationality: string;
    spouse_occupation: string;
    spouse_employer: string;
    spouse_address: string;
    spouse_city: string;
    spouse_country: string;
    spouse_phone_mobile: string;
    has_children: boolean;
    children: ChildEntry[];
}

// ─── canonical mapping ──────────────────────────────────────────────────────

function buildCanonicalData(f: IntakeForm): Record<string, string> {
    const d: Record<string, string> = {};
    const set = (k: string, v: string) => { if (v.trim()) d[k] = v.trim(); };

    set('main_applicant.surname', f.surname);
    set('main_applicant.given_name', f.given_name);
    set('main_applicant.middle_name', f.middle_name);
    set('main_applicant.dob', f.dob);
    set('main_applicant.place_of_birth', f.place_of_birth);
    set('main_applicant.gender', f.gender);
    set('main_applicant.nationality', f.nationality);
    set('main_applicant.email', f.email);
    set('main_applicant.phone_mobile', f.phone_mobile);
    set('main_applicant.phone_home', f.phone_home);

    f.passports.forEach((p, i) => {
        const n = i + 1;
        set(`main_applicant.passport_${n}.number`, p.number);
        set(`main_applicant.passport_${n}.country_of_issue`, p.country_of_issue);
        set(`main_applicant.passport_${n}.date_of_issue`, p.date_of_issue);
        set(`main_applicant.passport_${n}.date_of_expiry`, p.date_of_expiry);
    });

    set('main_applicant.address_residential.full_address', f.residential_address);
    set('main_applicant.address_residential.city', f.residential_city);
    set('main_applicant.address_residential.state_province', f.residential_state);
    set('main_applicant.address_residential.country', f.residential_country);
    set('main_applicant.address_residential.postal_code', f.residential_postal_code);
    set('main_applicant.address_residential.date_since_month', f.residential_date_since_month);
    set('main_applicant.address_residential.date_since_year', f.residential_date_since_year);

    set('main_applicant.address_permanent.full_address', f.permanent_address);
    set('main_applicant.address_permanent.city', f.permanent_city);
    set('main_applicant.address_permanent.state_province', f.permanent_state);
    set('main_applicant.address_permanent.country', f.permanent_country);
    set('main_applicant.address_permanent.postal_code', f.permanent_postal_code);
    set('main_applicant.address_permanent.date_since_month', f.permanent_date_since_month);
    set('main_applicant.address_permanent.date_since_year', f.permanent_date_since_year);

    f.address_history.forEach((a, i) => {
        const n = i + 1;
        set(`main_applicant.residence_history_${n}.from`, a.date_from);
        set(`main_applicant.residence_history_${n}.to`, a.date_to);
        set(`main_applicant.residence_history_${n}.address`, a.full_address);
    });

    set('main_applicant.occupation_by_training', f.occupation_by_training);
    set('main_applicant.current_occupation', f.current_occupation);
    d['main_applicant.is_self_employed'] = f.is_self_employed ? 'Yes' : 'No';
    set('main_applicant.employer_name', f.employer_name);
    set('main_applicant.employer_address', f.employer_address);

    f.employment_history.forEach((e, i) => {
        const n = i + 1;
        set(`main_applicant.employment_history_${n}.period_start`, e.period_start);
        set(`main_applicant.employment_history_${n}.period_end`, e.period_end);
        set(`main_applicant.employment_history_${n}.employer_name`, e.employer_name);
        set(`main_applicant.employment_history_${n}.address`, e.address);
        set(`main_applicant.employment_history_${n}.position`, e.position);
        set(`main_applicant.employment_history_${n}.business_type`, e.business_type);
        set(`main_applicant.employment_history_${n}.reason_leaving`, e.reason_leaving);
    });

    if (f.has_spouse) {
        d['main_applicant.marital_status'] = 'Married';
        set('main_applicant.spouse.given_names', f.spouse_given_names);
        set('main_applicant.spouse.surname', f.spouse_surname);
        set('main_applicant.spouse.dob', f.spouse_dob);
        set('main_applicant.spouse.nationality', f.spouse_nationality);
        set('main_applicant.spouse.occupation', f.spouse_occupation);
        set('main_applicant.spouse.employer', f.spouse_employer);
        set('main_applicant.spouse.address', f.spouse_address);
        set('main_applicant.spouse.city', f.spouse_city);
        set('main_applicant.spouse.country', f.spouse_country);
        set('main_applicant.spouse.phone_mobile', f.spouse_phone_mobile);
    }

    if (f.has_children) {
        f.children.forEach((c, i) => {
            const n = i + 1;
            set(`main_applicant.child_${n}.given_names`, c.given_names);
            set(`main_applicant.child_${n}.surname`, c.surname);
            set(`main_applicant.child_${n}.dob`, c.dob);
            set(`main_applicant.child_${n}.gender`, c.gender);
            set(`main_applicant.child_${n}.nationality`, c.nationality);
            set(`main_applicant.child_${n}.place_of_birth`, c.place_of_birth);
        });
    }

    return d;
}

// ─── parse existing flat data back into structured form ─────────────────────

function flat(data: Record<string, unknown> | null | undefined, key: string): string {
    if (!data) return '';
    const v = data[key];
    return v === null || v === undefined ? '' : String(v);
}

function parseExistingData(data: Record<string, unknown> | null | undefined): Partial<IntakeForm> {
    if (!data) return {};

    const passports: PassportEntry[] = [];
    for (let n = 1; n <= 2; n++) {
        const num = flat(data, `main_applicant.passport_${n}.number`);
        if (num) {
            passports.push({
                number: num,
                country_of_issue: flat(data, `main_applicant.passport_${n}.country_of_issue`),
                date_of_issue: flat(data, `main_applicant.passport_${n}.date_of_issue`),
                date_of_expiry: flat(data, `main_applicant.passport_${n}.date_of_expiry`),
            });
        }
    }

    const employment_history: EmploymentEntry[] = [];
    for (let n = 1; n <= 6; n++) {
        const name = flat(data, `main_applicant.employment_history_${n}.employer_name`);
        if (name) {
            employment_history.push({
                period_start: flat(data, `main_applicant.employment_history_${n}.period_start`),
                period_end: flat(data, `main_applicant.employment_history_${n}.period_end`),
                employer_name: name,
                address: flat(data, `main_applicant.employment_history_${n}.address`),
                position: flat(data, `main_applicant.employment_history_${n}.position`),
                business_type: flat(data, `main_applicant.employment_history_${n}.business_type`),
                reason_leaving: flat(data, `main_applicant.employment_history_${n}.reason_leaving`),
            });
        }
    }

    const address_history: AddressHistoryEntry[] = [];
    for (let n = 1; n <= 7; n++) {
        const addr = flat(data, `main_applicant.residence_history_${n}.address`);
        if (addr) {
            address_history.push({
                date_from: flat(data, `main_applicant.residence_history_${n}.from`),
                date_to: flat(data, `main_applicant.residence_history_${n}.to`),
                full_address: addr,
            });
        }
    }

    const children: ChildEntry[] = [];
    for (let n = 1; n <= 6; n++) {
        const given = flat(data, `main_applicant.child_${n}.given_names`);
        if (given) {
            children.push({
                given_names: given,
                surname: flat(data, `main_applicant.child_${n}.surname`),
                dob: flat(data, `main_applicant.child_${n}.dob`),
                gender: flat(data, `main_applicant.child_${n}.gender`),
                nationality: flat(data, `main_applicant.child_${n}.nationality`),
                place_of_birth: flat(data, `main_applicant.child_${n}.place_of_birth`),
            });
        }
    }

    const hasSpouse = !!(flat(data, 'main_applicant.spouse.given_names') || flat(data, 'main_applicant.spouse.surname'));

    return {
        surname: flat(data, 'main_applicant.surname'),
        given_name: flat(data, 'main_applicant.given_name'),
        middle_name: flat(data, 'main_applicant.middle_name'),
        dob: flat(data, 'main_applicant.dob'),
        place_of_birth: flat(data, 'main_applicant.place_of_birth'),
        gender: flat(data, 'main_applicant.gender'),
        nationality: flat(data, 'main_applicant.nationality'),
        email: flat(data, 'main_applicant.email'),
        phone_mobile: flat(data, 'main_applicant.phone_mobile'),
        phone_home: flat(data, 'main_applicant.phone_home'),
        passports: passports.length ? passports : undefined,
        residential_address: flat(data, 'main_applicant.address_residential.full_address'),
        residential_city: flat(data, 'main_applicant.address_residential.city'),
        residential_state: flat(data, 'main_applicant.address_residential.state_province'),
        residential_country: flat(data, 'main_applicant.address_residential.country'),
        residential_postal_code: flat(data, 'main_applicant.address_residential.postal_code'),
        residential_date_since_month: flat(data, 'main_applicant.address_residential.date_since_month'),
        residential_date_since_year: flat(data, 'main_applicant.address_residential.date_since_year'),
        permanent_address: flat(data, 'main_applicant.address_permanent.full_address'),
        permanent_city: flat(data, 'main_applicant.address_permanent.city'),
        permanent_state: flat(data, 'main_applicant.address_permanent.state_province'),
        permanent_country: flat(data, 'main_applicant.address_permanent.country'),
        permanent_postal_code: flat(data, 'main_applicant.address_permanent.postal_code'),
        permanent_date_since_month: flat(data, 'main_applicant.address_permanent.date_since_month'),
        permanent_date_since_year: flat(data, 'main_applicant.address_permanent.date_since_year'),
        address_history: address_history.length ? address_history : undefined,
        occupation_by_training: flat(data, 'main_applicant.occupation_by_training'),
        current_occupation: flat(data, 'main_applicant.current_occupation'),
        is_self_employed: flat(data, 'main_applicant.is_self_employed') === 'Yes',
        employer_name: flat(data, 'main_applicant.employer_name'),
        employer_address: flat(data, 'main_applicant.employer_address'),
        employment_history: employment_history.length ? employment_history : undefined,
        has_spouse: hasSpouse,
        spouse_given_names: flat(data, 'main_applicant.spouse.given_names'),
        spouse_surname: flat(data, 'main_applicant.spouse.surname'),
        spouse_dob: flat(data, 'main_applicant.spouse.dob'),
        spouse_nationality: flat(data, 'main_applicant.spouse.nationality'),
        spouse_occupation: flat(data, 'main_applicant.spouse.occupation'),
        spouse_employer: flat(data, 'main_applicant.spouse.employer'),
        spouse_address: flat(data, 'main_applicant.spouse.address'),
        spouse_city: flat(data, 'main_applicant.spouse.city'),
        spouse_country: flat(data, 'main_applicant.spouse.country'),
        spouse_phone_mobile: flat(data, 'main_applicant.spouse.phone_mobile'),
        has_children: children.length > 0,
        children: children.length ? children : undefined,
    };
}

// ─── helpers ────────────────────────────────────────────────────────────────

function emptyPassport(): PassportEntry {
    return { number: '', country_of_issue: '', date_of_issue: '', date_of_expiry: '' };
}

function emptyEmployment(): EmploymentEntry {
    return { period_start: '', period_end: '', employer_name: '', address: '', position: '', business_type: '', reason_leaving: '' };
}

function emptyAddressHistory(): AddressHistoryEntry {
    return { date_from: '', date_to: '', full_address: '' };
}

function emptyChild(): ChildEntry {
    return { given_names: '', surname: '', dob: '', gender: '', nationality: '', place_of_birth: '' };
}

function childAge(dob: string): number | null {
    if (!dob) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

// ─── sub-components ──────────────────────────────────────────────────────────

function SectionCard({ title, badge, defaultOpen = true, children }: { title: string; badge?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <Card>
            <CardHeader className="px-4 py-3 cursor-pointer select-none border-b" onClick={() => setOpen(v => !v)}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {open ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                        <span className="font-semibold text-sm">{title}</span>
                    </div>
                    {badge}
                </div>
            </CardHeader>
            {open && <CardContent className="p-4">{children}</CardContent>}
        </Card>
    );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs font-medium">
                {label}{required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            {children}
        </div>
    );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
    return <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder ?? ''} className="h-8 text-sm" />;
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return <Input type="date" value={value} onChange={e => onChange(e.target.value)} className="h-8 text-sm" />;
}

function GenderSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <select value={value} onChange={e => onChange(e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm">
            <option value="">Select…</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
        </select>
    );
}

// ─── page ────────────────────────────────────────────────────────────────────

const DEFAULT_FORM: IntakeForm = {
    surname: '', given_name: '', middle_name: '', dob: '', place_of_birth: '', gender: '', nationality: '', email: '', phone_mobile: '', phone_home: '',
    passports: [emptyPassport()],
    residential_address: '', residential_city: '', residential_state: '', residential_country: '', residential_postal_code: '',
    residential_date_since_month: '', residential_date_since_year: '',
    permanent_address: '', permanent_city: '', permanent_state: '', permanent_country: '', permanent_postal_code: '',
    permanent_date_since_month: '', permanent_date_since_year: '',
    address_history: [],
    occupation_by_training: '', current_occupation: '', is_self_employed: false, employer_name: '', employer_address: '',
    employment_history: [],
    has_spouse: false, spouse_given_names: '', spouse_surname: '', spouse_dob: '', spouse_nationality: '', spouse_occupation: '', spouse_employer: '', spouse_address: '', spouse_city: '', spouse_country: '', spouse_phone_mobile: '',
    has_children: false, children: [],
};

export default function ApplicationCreatePage({ programs, application }: Props) {
    const isEditing = Boolean(application);

    const [programId, setProgramId] = useState<string>(application?.program_id?.toString() ?? '');

    const parsed = parseExistingData(application?.data);
    const [form, setForm] = useState<IntakeForm>({
        ...DEFAULT_FORM,
        ...parsed,
        passports: parsed.passports ?? [emptyPassport()],
        employment_history: parsed.employment_history ?? [],
        address_history: parsed.address_history ?? [],
        children: parsed.children ?? [],
    });

    const set = <K extends keyof IntakeForm>(key: K, value: IntakeForm[K]) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const createApp = useCreateApplication();
    const updateApp = useUpdateApplication();
    const isPending = createApp.isPending || updateApp.isPending;

    const handleSubmit = () => {
        const data = buildCanonicalData(form);
        const applicantName = [form.given_name, form.middle_name, form.surname].filter(Boolean).join(' ');
        const passport = form.passports[0]?.number ?? '';

        if (isEditing && application) {
            updateApp.mutate({ applicationId: application.id, main_applicant_name: applicantName, main_applicant_passport: passport, data });
        } else {
            createApp.mutate({ program_id: parseInt(programId), main_applicant_name: applicantName, main_applicant_passport: passport, data });
        }
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Management', href: '/settings/management' },
        { title: 'Forms Automation', href: '/settings/management/pdf-templates' },
        { title: 'Applications', href: '/settings/management/forms/applications' },
        { title: isEditing ? `Edit ${application?.application_code}` : 'New Application', href: '#' },
    ];

    // ── Employment history helpers
    const addEmployment = () => set('employment_history', [...form.employment_history, emptyEmployment()]);
    const removeEmployment = (i: number) => set('employment_history', form.employment_history.filter((_, idx) => idx !== i));
    const updateEmployment = (i: number, key: keyof EmploymentEntry, val: string) =>
        set('employment_history', form.employment_history.map((e, idx) => idx === i ? { ...e, [key]: val } : e));

    // ── Children helpers
    const addChild = () => set('children', [...form.children, emptyChild()]);
    const removeChild = (i: number) => set('children', form.children.filter((_, idx) => idx !== i));
    const updateChild = (i: number, key: keyof ChildEntry, val: string) =>
        set('children', form.children.map((c, idx) => idx === i ? { ...c, [key]: val } : c));

    // ── Address history helpers
    const addAddressHistory = () => { if (form.address_history.length < 7) set('address_history', [...form.address_history, emptyAddressHistory()]); };
    const removeAddressHistory = (i: number) => set('address_history', form.address_history.filter((_, idx) => idx !== i));
    const updateAddressHistory = (i: number, key: keyof AddressHistoryEntry, val: string) =>
        set('address_history', form.address_history.map((a, idx) => idx === i ? { ...a, [key]: val } : a));

    // ── Passport helpers
    const addPassport = () => { if (form.passports.length < 2) set('passports', [...form.passports, emptyPassport()]); };
    const removePassport = (i: number) => set('passports', form.passports.filter((_, idx) => idx !== i));
    const updatePassport = (i: number, key: keyof PassportEntry, val: string) =>
        set('passports', form.passports.map((p, idx) => idx === i ? { ...p, [key]: val } : p));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEditing ? `Edit ${application?.application_code}` : 'New Application'} />

            {/* Header */}
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
                    <Button onClick={handleSubmit} disabled={isPending || (!isEditing && !programId)}>
                        {isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                        {isEditing ? 'Save Changes' : 'Create Application'}
                    </Button>
                </div>
            </div>

            <div className="p-4 max-w-5xl space-y-4">

                {/* Program selector (create only) */}
                {!isEditing && (
                    <Card>
                        <CardContent className="p-4">
                            <div className="max-w-sm space-y-1.5">
                                <Label className="text-xs font-medium">Program <span className="text-destructive">*</span></Label>
                                <select
                                    value={programId}
                                    onChange={e => setProgramId(e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="">Select program…</option>
                                    {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ── Personal Information */}
                <SectionCard title="Personal Information">
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Surname" required><TextInput value={form.surname} onChange={v => set('surname', v)} placeholder="e.g. Khan" /></Field>
                            <Field label="Given Name(s)" required><TextInput value={form.given_name} onChange={v => set('given_name', v)} placeholder="e.g. Abdul Bari" /></Field>
                            <Field label="Middle Name"><TextInput value={form.middle_name} onChange={v => set('middle_name', v)} /></Field>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Date of Birth"><DateInput value={form.dob} onChange={v => set('dob', v)} /></Field>
                            <Field label="Place of Birth"><TextInput value={form.place_of_birth} onChange={v => set('place_of_birth', v)} placeholder="City, Country" /></Field>
                            <Field label="Gender">
                                <GenderSelect value={form.gender} onChange={v => set('gender', v)} />
                            </Field>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Nationality"><TextInput value={form.nationality} onChange={v => set('nationality', v)} placeholder="e.g. Jordanian" /></Field>
                            <Field label="Email"><TextInput value={form.email} onChange={v => set('email', v)} placeholder="name@example.com" /></Field>
                            <Field label="Mobile Phone"><TextInput value={form.phone_mobile} onChange={v => set('phone_mobile', v)} placeholder="+1 234 567 8900" /></Field>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Home Phone"><TextInput value={form.phone_home} onChange={v => set('phone_home', v)} /></Field>
                        </div>
                    </div>
                </SectionCard>

                {/* ── Passports */}
                <SectionCard title="Passports" badge={<Badge variant="secondary" className="text-xs">{form.passports.length} of 2</Badge>}>
                    <div className="space-y-4">
                        {form.passports.map((p, i) => (
                            <div key={i}>
                                {i > 0 && <Separator className="mb-4" />}
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Passport {i + 1}</span>
                                    {i > 0 && (
                                        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => removePassport(i)}>
                                            <Trash2 className="size-3 mr-1" /> Remove
                                        </Button>
                                    )}
                                </div>
                                <div className="grid grid-cols-4 gap-3">
                                    <Field label="Passport Number" required={i === 0}><TextInput value={p.number} onChange={v => updatePassport(i, 'number', v)} placeholder="e.g. A12345678" /></Field>
                                    <Field label="Country of Issue"><TextInput value={p.country_of_issue} onChange={v => updatePassport(i, 'country_of_issue', v)} placeholder="e.g. Jordan" /></Field>
                                    <Field label="Date of Issue"><DateInput value={p.date_of_issue} onChange={v => updatePassport(i, 'date_of_issue', v)} /></Field>
                                    <Field label="Date of Expiry"><DateInput value={p.date_of_expiry} onChange={v => updatePassport(i, 'date_of_expiry', v)} /></Field>
                                </div>
                            </div>
                        ))}
                        {form.passports.length < 2 && (
                            <Button variant="outline" size="sm" className="text-xs" onClick={addPassport}>
                                <Plus className="size-3 mr-1" /> Add Second Passport
                            </Button>
                        )}
                    </div>
                </SectionCard>

                {/* ── Residential Address */}
                <SectionCard title="Residential Address">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-3">
                            <Field label="Street Address"><TextInput value={form.residential_address} onChange={v => set('residential_address', v)} placeholder="Street address" /></Field>
                        </div>
                        <Field label="City"><TextInput value={form.residential_city} onChange={v => set('residential_city', v)} /></Field>
                        <Field label="State / Province"><TextInput value={form.residential_state} onChange={v => set('residential_state', v)} /></Field>
                        <Field label="Country"><TextInput value={form.residential_country} onChange={v => set('residential_country', v)} /></Field>
                        <Field label="Postal Code"><TextInput value={form.residential_postal_code} onChange={v => set('residential_postal_code', v)} /></Field>
                        <Field label="Date Since (Month MM)"><TextInput value={form.residential_date_since_month} onChange={v => set('residential_date_since_month', v)} placeholder="e.g. 03" /></Field>
                        <Field label="Date Since (Year YYYY)"><TextInput value={form.residential_date_since_year} onChange={v => set('residential_date_since_year', v)} placeholder="e.g. 2020" /></Field>
                    </div>
                </SectionCard>

                {/* ── Permanent Residential Address */}
                <SectionCard title="Permanent Residential Address" defaultOpen={false}>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-3">
                            <Field label="Full Address"><TextInput value={form.permanent_address} onChange={v => set('permanent_address', v)} placeholder="Street address" /></Field>
                        </div>
                        <Field label="City"><TextInput value={form.permanent_city} onChange={v => set('permanent_city', v)} /></Field>
                        <Field label="State / Province"><TextInput value={form.permanent_state} onChange={v => set('permanent_state', v)} /></Field>
                        <Field label="Country"><TextInput value={form.permanent_country} onChange={v => set('permanent_country', v)} /></Field>
                        <Field label="Postal Code"><TextInput value={form.permanent_postal_code} onChange={v => set('permanent_postal_code', v)} /></Field>
                        <Field label="Date Since (Month MM)"><TextInput value={form.permanent_date_since_month} onChange={v => set('permanent_date_since_month', v)} placeholder="e.g. 03" /></Field>
                        <Field label="Date Since (Year YYYY)"><TextInput value={form.permanent_date_since_year} onChange={v => set('permanent_date_since_year', v)} placeholder="e.g. 2018" /></Field>
                    </div>
                </SectionCard>

                {/* ── Address History */}
                <SectionCard
                    title="Address History"
                    badge={<Badge variant="secondary" className="text-xs">{form.address_history.length} entr{form.address_history.length === 1 ? 'y' : 'ies'}</Badge>}
                    defaultOpen={form.address_history.length > 0}
                >
                    <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">List all addresses for the last 10 years — no gaps in history.</p>

                        {form.address_history.length === 0 && (
                            <p className="text-xs text-muted-foreground italic">No address history added.</p>
                        )}

                        {form.address_history.map((a, i) => (
                            <div key={i} className="border rounded-lg p-3 space-y-3 bg-muted/20">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium">Address {i + 1}</span>
                                    <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => removeAddressHistory(i)}>
                                        <Trash2 className="size-3 mr-1" /> Remove
                                    </Button>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <Field label="Date From (MM/YYYY)"><TextInput value={a.date_from} onChange={v => updateAddressHistory(i, 'date_from', v)} placeholder="e.g. 01/2015" /></Field>
                                    <Field label="Date To (MM/YYYY)"><TextInput value={a.date_to} onChange={v => updateAddressHistory(i, 'date_to', v)} placeholder="e.g. 12/2020 or Present" /></Field>
                                    <div className="col-span-1" />
                                    <div className="col-span-3">
                                        <Field label="Full Address (street, town, postal code, country)">
                                            <TextInput value={a.full_address} onChange={v => updateAddressHistory(i, 'full_address', v)} placeholder="e.g. 73-A Ahmed Block, Garden Town, 54000, Lahore, Pakistan" />
                                        </Field>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {form.address_history.length < 7 && (
                            <Button variant="outline" size="sm" className="text-xs" onClick={addAddressHistory}>
                                <Plus className="size-3 mr-1" /> Add Address
                            </Button>
                        )}
                    </div>
                </SectionCard>

                {/* ── Employment */}
                <SectionCard title="Employment">
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Occupation by Training"><TextInput value={form.occupation_by_training} onChange={v => set('occupation_by_training', v)} /></Field>
                            <Field label="Current Occupation"><TextInput value={form.current_occupation} onChange={v => set('current_occupation', v)} /></Field>
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="self-employed"
                                checked={form.is_self_employed}
                                onCheckedChange={v => set('is_self_employed', Boolean(v))}
                            />
                            <Label htmlFor="self-employed" className="text-sm cursor-pointer">Self-Employed</Label>
                        </div>

                        {!form.is_self_employed && (
                            <div className="grid grid-cols-2 gap-3 pl-6 border-l-2 border-muted">
                                <Field label="Employer Name"><TextInput value={form.employer_name} onChange={v => set('employer_name', v)} /></Field>
                                <Field label="Employer Address"><TextInput value={form.employer_address} onChange={v => set('employer_address', v)} /></Field>
                            </div>
                        )}

                        <Separator />

                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employment History</span>
                            {form.employment_history.length < 6 && (
                                <Button variant="outline" size="sm" className="text-xs" onClick={addEmployment}>
                                    <Plus className="size-3 mr-1" /> Add Entry
                                </Button>
                            )}
                        </div>

                        {form.employment_history.length === 0 && (
                            <p className="text-xs text-muted-foreground">No employment history added.</p>
                        )}

                        {form.employment_history.map((e, i) => (
                            <div key={i} className="border rounded-lg p-3 space-y-3 bg-muted/20">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium">Position {i + 1}</span>
                                    <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => removeEmployment(i)}>
                                        <Trash2 className="size-3 mr-1" /> Remove
                                    </Button>
                                </div>
                                <div className="grid grid-cols-4 gap-3">
                                    <Field label="From"><TextInput value={e.period_start} onChange={v => updateEmployment(i, 'period_start', v)} placeholder="MM/YYYY" /></Field>
                                    <Field label="To"><TextInput value={e.period_end} onChange={v => updateEmployment(i, 'period_end', v)} placeholder="MM/YYYY or Present" /></Field>
                                    <Field label="Employer Name"><TextInput value={e.employer_name} onChange={v => updateEmployment(i, 'employer_name', v)} /></Field>
                                    <Field label="Position / Title"><TextInput value={e.position} onChange={v => updateEmployment(i, 'position', v)} /></Field>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <Field label="Address"><TextInput value={e.address} onChange={v => updateEmployment(i, 'address', v)} /></Field>
                                    <Field label="Type of Business"><TextInput value={e.business_type} onChange={v => updateEmployment(i, 'business_type', v)} /></Field>
                                    <Field label="Reason for Leaving"><TextInput value={e.reason_leaving} onChange={v => updateEmployment(i, 'reason_leaving', v)} /></Field>
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>

                {/* ── Dependents */}
                <SectionCard title="Dependents" defaultOpen={form.has_spouse || form.has_children}>
                    <div className="space-y-5">

                        {/* Spouse */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="has-spouse"
                                    checked={form.has_spouse}
                                    onCheckedChange={v => set('has_spouse', Boolean(v))}
                                />
                                <Label htmlFor="has-spouse" className="text-sm font-medium cursor-pointer">Spouse (will require a separate D1 form)</Label>
                            </div>

                            {form.has_spouse && (
                                <div className="pl-6 border-l-2 border-primary/30 space-y-3">
                                    <div className="grid grid-cols-3 gap-3">
                                        <Field label="Given Names"><TextInput value={form.spouse_given_names} onChange={v => set('spouse_given_names', v)} /></Field>
                                        <Field label="Surname"><TextInput value={form.spouse_surname} onChange={v => set('spouse_surname', v)} /></Field>
                                        <Field label="Date of Birth"><DateInput value={form.spouse_dob} onChange={v => set('spouse_dob', v)} /></Field>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <Field label="Nationality"><TextInput value={form.spouse_nationality} onChange={v => set('spouse_nationality', v)} /></Field>
                                        <Field label="Occupation"><TextInput value={form.spouse_occupation} onChange={v => set('spouse_occupation', v)} /></Field>
                                        <Field label="Employer"><TextInput value={form.spouse_employer} onChange={v => set('spouse_employer', v)} /></Field>
                                    </div>
                                    <div className="grid grid-cols-4 gap-3">
                                        <Field label="Address"><TextInput value={form.spouse_address} onChange={v => set('spouse_address', v)} /></Field>
                                        <Field label="City"><TextInput value={form.spouse_city} onChange={v => set('spouse_city', v)} /></Field>
                                        <Field label="Country"><TextInput value={form.spouse_country} onChange={v => set('spouse_country', v)} /></Field>
                                        <Field label="Mobile Phone"><TextInput value={form.spouse_phone_mobile} onChange={v => set('spouse_phone_mobile', v)} /></Field>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Children */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="has-children"
                                    checked={form.has_children}
                                    onCheckedChange={v => {
                                        set('has_children', Boolean(v));
                                        if (!v) set('children', []);
                                    }}
                                />
                                <Label htmlFor="has-children" className="text-sm font-medium cursor-pointer">Children</Label>
                            </div>

                            {form.has_children && (
                                <div className="pl-6 border-l-2 border-primary/30 space-y-3">
                                    {form.children.map((c, i) => {
                                        const age = childAge(c.dob);
                                        const needsOwnD1 = age !== null && age >= 16;
                                        return (
                                            <div key={i} className="border rounded-lg p-3 space-y-3 bg-muted/20">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-medium">Child {i + 1}</span>
                                                        {age !== null && (
                                                            <Badge variant="secondary" className="text-xs">{age} yrs</Badge>
                                                        )}
                                                        {needsOwnD1 && (
                                                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-400 gap-1">
                                                                <AlertTriangle className="size-3" /> Requires own D1
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => removeChild(i)}>
                                                        <Trash2 className="size-3 mr-1" /> Remove
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <Field label="Given Names"><TextInput value={c.given_names} onChange={v => updateChild(i, 'given_names', v)} /></Field>
                                                    <Field label="Surname"><TextInput value={c.surname} onChange={v => updateChild(i, 'surname', v)} /></Field>
                                                    <Field label="Date of Birth"><DateInput value={c.dob} onChange={v => updateChild(i, 'dob', v)} /></Field>
                                                </div>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <Field label="Gender"><GenderSelect value={c.gender} onChange={v => updateChild(i, 'gender', v)} /></Field>
                                                    <Field label="Nationality"><TextInput value={c.nationality} onChange={v => updateChild(i, 'nationality', v)} /></Field>
                                                    <Field label="Place of Birth"><TextInput value={c.place_of_birth} onChange={v => updateChild(i, 'place_of_birth', v)} /></Field>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {form.children.length < 6 && (
                                        <Button variant="outline" size="sm" className="text-xs" onClick={addChild}>
                                            <Plus className="size-3 mr-1" /> Add Child
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </SectionCard>

            </div>
        </AppLayout>
    );
}
