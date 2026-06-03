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
    place_of_issue: string;
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
    country_of_residence: string;
    occupation: string;
    phone: string;
    is_not_included: string;
}

interface SiblingEntry {
    given_names: string;
    surname: string;
    gender: string;
    dob: string;
    place_of_birth: string;
    nationality: string;
    country_of_residence: string;
    occupation: string;
    phone: string;
    relationship: string;
}

interface PrevSpouseEntry {
    name: string;
    nationality: string;
    dob: string;
    date_of_marriage: string;
    date_of_dissolution: string;
}

interface ParentEntry {
    given_names: string;
    surname: string;
    dob: string;
    place_of_birth: string;
    citizenship: string;
    occupation: string;
    residential_address: string;
    is_deceased: string;
}

interface IntakeForm {
    // Personal
    surname: string;
    given_name: string;
    middle_name: string;
    other_names: string;
    mothers_maiden_name: string;
    name_local_script: string;
    dob: string;
    place_of_birth: string;
    nationality: string;
    gender: string;
    marital_status: string;
    marriage_date: string;
    marriage_place: string;
    has_other_citizenship: string;
    other_citizenship_details_1: string;
    other_citizenship_details_2: string;
    height_cm: string;
    weight_kg: string;
    eye_colour: string;
    hair_colour: string;
    distinguishing_marks: string;
    languages: string;
    is_sponsored: string;
    email: string;
    phone_mobile: string;
    phone_home: string;
    // Identity documents
    national_id_number: string;
    national_id_country: string;
    national_id_number_2: string;
    national_id_country_2: string;
    drivers_licence_number: string;
    drivers_licence_country: string;
    drivers_licence_number_2: string;
    drivers_licence_country_2: string;
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
    employer_phone: string;
    employer_website: string;
    employer_nature_of_business: string;
    employer_country_of_incorporation: string;
    employment_more_info: string;
    employment_history: EmploymentEntry[];
    // Financial
    annual_income_gross_usd: string;
    sources_of_income: string;
    assets_savings_amount: string;
    assets_fixed_amount: string;
    assets_investments_amount: string;
    assets_other_amount: string;
    assets_total: string;
    liabilities_short_term_amount: string;
    liabilities_long_term_amount: string;
    liabilities_other_amount: string;
    liabilities_total: string;
    net_worth_total: string;
    business_geographical_locations: string;
    companies_shareholder_director: string;
    key_business_partners: string;
    // Military
    military_served: string;
    military_branch: string;
    military_ranking: string;
    military_serial_number: string;
    military_entry: string;
    military_separation: string;
    military_discharge_type: string;
    military_arrested: string;
    // Disciplinary
    has_disciplinary_action: string;
    disciplinary_action_details: string;
    // Address helpers
    permanent_same_as_residential: boolean;
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
    spouse_state: string;
    spouse_postal_code: string;
    spouse_country: string;
    spouse_phone_mobile: string;
    spouse_phone_home: string;
    spouse_phone_work: string;
    spouse_employer_address: string;
    spouse_employer_city: string;
    spouse_employer_state: string;
    spouse_employer_postal_code: string;
    spouse_employer_country: string;
    has_prev_spouses: boolean;
    prev_spouses: PrevSpouseEntry[];
    has_children: boolean;
    children: ChildEntry[];
    has_siblings: boolean;
    siblings: SiblingEntry[];
    has_parents: boolean;
    father: ParentEntry;
    mother: ParentEntry;
    father_in_law: ParentEntry;
    mother_in_law: ParentEntry;
}

// ─── canonical mapping ──────────────────────────────────────────────────────

function buildCanonicalData(f: IntakeForm): Record<string, string> {
    const d: Record<string, string> = {};
    const set = (k: string, v: string) => { if (v.trim()) d[k] = v.trim(); };

    // Personal
    set('main_applicant.surname', f.surname);
    set('main_applicant.given_name', f.given_name);
    set('main_applicant.middle_name', f.middle_name);
    set('main_applicant.other_names', f.other_names);
    set('main_applicant.mothers_maiden_name', f.mothers_maiden_name);
    set('main_applicant.name_local_script', f.name_local_script);
    set('main_applicant.dob', f.dob);
    set('main_applicant.place_of_birth', f.place_of_birth);
    set('main_applicant.nationality', f.nationality);
    set('main_applicant.gender', f.gender);
    set('main_applicant.marital_status', f.marital_status);
    set('main_applicant.marriage_date', f.marriage_date);
    set('main_applicant.marriage_place', f.marriage_place);
    set('main_applicant.has_other_citizenship', f.has_other_citizenship);
    set('main_applicant.other_citizenship_details_1', f.other_citizenship_details_1);
    set('main_applicant.other_citizenship_details_2', f.other_citizenship_details_2);
    set('main_applicant.height_cm', f.height_cm);
    set('main_applicant.weight_kg', f.weight_kg);
    set('main_applicant.eye_colour', f.eye_colour);
    set('main_applicant.hair_colour', f.hair_colour);
    set('main_applicant.distinguishing_marks', f.distinguishing_marks);
    set('main_applicant.languages', f.languages);
    set('main_applicant.is_sponsored', f.is_sponsored);
    set('main_applicant.email', f.email);
    set('main_applicant.phone_mobile', f.phone_mobile);
    set('main_applicant.phone_home', f.phone_home);

    // Identity documents
    set('main_applicant.national_id_number', f.national_id_number);
    set('main_applicant.national_id_country', f.national_id_country);
    set('main_applicant.national_id_number_2', f.national_id_number_2);
    set('main_applicant.national_id_country_2', f.national_id_country_2);
    set('main_applicant.drivers_licence_number', f.drivers_licence_number);
    set('main_applicant.drivers_licence_country', f.drivers_licence_country);
    set('main_applicant.drivers_licence_number_2', f.drivers_licence_number_2);
    set('main_applicant.drivers_licence_country_2', f.drivers_licence_country_2);

    // Passports
    f.passports.forEach((p, i) => {
        const n = i + 1;
        set(`main_applicant.passport_${n}.number`, p.number);
        set(`main_applicant.passport_${n}.country_of_issue`, p.country_of_issue);
        set(`main_applicant.passport_${n}.date_of_issue`, p.date_of_issue);
        set(`main_applicant.passport_${n}.place_of_issue`, p.place_of_issue);
        set(`main_applicant.passport_${n}.date_of_expiry`, p.date_of_expiry);
    });

    // Addresses
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

    // Employment
    set('main_applicant.occupation_by_training', f.occupation_by_training);
    set('main_applicant.current_occupation', f.current_occupation);
    d['main_applicant.is_self_employed'] = f.is_self_employed ? 'Yes' : 'No';
    set('main_applicant.employer_name', f.employer_name);
    set('main_applicant.employer_address', f.employer_address);
    set('main_applicant.employer_phone', f.employer_phone);
    set('main_applicant.employer_website', f.employer_website);
    set('main_applicant.employer_nature_of_business', f.employer_nature_of_business);
    set('main_applicant.employer_country_of_incorporation', f.employer_country_of_incorporation);
    set('main_applicant.employment_more_info', f.employment_more_info);

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

    // Financial
    set('main_applicant.annual_income_gross_usd', f.annual_income_gross_usd);
    set('main_applicant.sources_of_income', f.sources_of_income);
    set('main_applicant.assets_savings_amount', f.assets_savings_amount);
    set('main_applicant.assets_fixed_amount', f.assets_fixed_amount);
    set('main_applicant.assets_investments_amount', f.assets_investments_amount);
    set('main_applicant.assets_other_amount', f.assets_other_amount);
    set('main_applicant.assets_total', f.assets_total);
    set('main_applicant.liabilities_short_term_amount', f.liabilities_short_term_amount);
    set('main_applicant.liabilities_long_term_amount', f.liabilities_long_term_amount);
    set('main_applicant.liabilities_other_amount', f.liabilities_other_amount);
    set('main_applicant.liabilities_total', f.liabilities_total);
    set('main_applicant.net_worth_total', f.net_worth_total);
    set('main_applicant.business_geographical_locations', f.business_geographical_locations);
    set('main_applicant.companies_shareholder_director', f.companies_shareholder_director);
    set('main_applicant.key_business_partners', f.key_business_partners);

    // Military
    set('main_applicant.military_served', f.military_served);
    set('main_applicant.military_branch', f.military_branch);
    set('main_applicant.military_ranking', f.military_ranking);
    set('main_applicant.military_serial_number', f.military_serial_number);
    set('main_applicant.military_entry', f.military_entry);
    set('main_applicant.military_separation', f.military_separation);
    set('main_applicant.military_discharge_type', f.military_discharge_type);
    set('main_applicant.military_arrested', f.military_arrested);

    // Disciplinary
    set('main_applicant.has_disciplinary_action', f.has_disciplinary_action);
    set('main_applicant.disciplinary_action_details', f.disciplinary_action_details);

    // Spouse
    if (f.has_spouse) {
        if (!f.marital_status) d['main_applicant.marital_status'] = 'Married';
        set('main_applicant.spouse.given_names', f.spouse_given_names);
        set('main_applicant.spouse.surname', f.spouse_surname);
        set('main_applicant.spouse.dob', f.spouse_dob);
        set('main_applicant.spouse.nationality', f.spouse_nationality);
        set('main_applicant.spouse.occupation', f.spouse_occupation);
        set('main_applicant.spouse.employer', f.spouse_employer);
        set('main_applicant.spouse.address', f.spouse_address);
        set('main_applicant.spouse.city', f.spouse_city);
        set('main_applicant.spouse.state', f.spouse_state);
        set('main_applicant.spouse.postal_code', f.spouse_postal_code);
        set('main_applicant.spouse.country', f.spouse_country);
        set('main_applicant.spouse.phone_mobile', f.spouse_phone_mobile);
        set('main_applicant.spouse.phone_home', f.spouse_phone_home);
        set('main_applicant.spouse.phone_work', f.spouse_phone_work);
        set('main_applicant.spouse.employer_address', f.spouse_employer_address);
        set('main_applicant.spouse.employer_city', f.spouse_employer_city);
        set('main_applicant.spouse.employer_state', f.spouse_employer_state);
        set('main_applicant.spouse.employer_postal_code', f.spouse_employer_postal_code);
        set('main_applicant.spouse.employer_country', f.spouse_employer_country);
    }

    // Previous spouses
    if (f.has_prev_spouses) {
        f.prev_spouses.forEach((ps, i) => {
            const n = i + 1;
            set(`main_applicant.previous_spouse_${n}.name`, ps.name);
            set(`main_applicant.previous_spouse_${n}.nationality`, ps.nationality);
            set(`main_applicant.previous_spouse_${n}.dob`, ps.dob);
            set(`main_applicant.previous_spouse_${n}.date_of_marriage`, ps.date_of_marriage);
            set(`main_applicant.previous_spouse_${n}.date_of_dissolution`, ps.date_of_dissolution);
        });
    }

    // Children
    if (f.has_children) {
        f.children.forEach((c, i) => {
            const n = i + 1;
            set(`main_applicant.child_${n}.given_names`, c.given_names);
            set(`main_applicant.child_${n}.surname`, c.surname);
            set(`main_applicant.child_${n}.dob`, c.dob);
            set(`main_applicant.child_${n}.gender`, c.gender);
            set(`main_applicant.child_${n}.nationality`, c.nationality);
            set(`main_applicant.child_${n}.place_of_birth`, c.place_of_birth);
            set(`main_applicant.child_${n}.country_of_residence`, c.country_of_residence);
            set(`main_applicant.child_${n}.occupation`, c.occupation);
            set(`main_applicant.child_${n}.phone`, c.phone);
            set(`main_applicant.child_${n}.is_not_included`, c.is_not_included);
        });
    }

    // Siblings
    if (f.has_siblings) {
        f.siblings.forEach((s, i) => {
            const n = i + 1;
            set(`main_applicant.sibling_${n}.given_names`, s.given_names);
            set(`main_applicant.sibling_${n}.surname`, s.surname);
            set(`main_applicant.sibling_${n}.gender`, s.gender);
            set(`main_applicant.sibling_${n}.dob`, s.dob);
            set(`main_applicant.sibling_${n}.place_of_birth`, s.place_of_birth);
            set(`main_applicant.sibling_${n}.nationality`, s.nationality);
            set(`main_applicant.sibling_${n}.country_of_residence`, s.country_of_residence);
            set(`main_applicant.sibling_${n}.occupation`, s.occupation);
            set(`main_applicant.sibling_${n}.phone`, s.phone);
            set(`main_applicant.sibling_${n}.relationship`, s.relationship);
        });
    }

    // Parents / in-laws
    if (f.has_parents) {
        (['father', 'mother', 'father_in_law', 'mother_in_law'] as const).forEach((rel) => {
            const p = f[rel];
            set(`main_applicant.${rel}.given_names`, p.given_names);
            set(`main_applicant.${rel}.surname`, p.surname);
            set(`main_applicant.${rel}.dob`, p.dob);
            set(`main_applicant.${rel}.place_of_birth`, p.place_of_birth);
            set(`main_applicant.${rel}.citizenship`, p.citizenship);
            set(`main_applicant.${rel}.occupation`, p.occupation);
            set(`main_applicant.${rel}.residential_address`, p.residential_address);
            set(`main_applicant.${rel}.is_deceased`, p.is_deceased);
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
                place_of_issue: flat(data, `main_applicant.passport_${n}.place_of_issue`),
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
                country_of_residence: flat(data, `main_applicant.child_${n}.country_of_residence`),
                occupation: flat(data, `main_applicant.child_${n}.occupation`),
                phone: flat(data, `main_applicant.child_${n}.phone`),
                is_not_included: flat(data, `main_applicant.child_${n}.is_not_included`),
            });
        }
    }

    const siblings: SiblingEntry[] = [];
    for (let n = 1; n <= 4; n++) {
        const given = flat(data, `main_applicant.sibling_${n}.given_names`);
        if (given) {
            siblings.push({
                given_names: given,
                surname: flat(data, `main_applicant.sibling_${n}.surname`),
                gender: flat(data, `main_applicant.sibling_${n}.gender`),
                dob: flat(data, `main_applicant.sibling_${n}.dob`),
                place_of_birth: flat(data, `main_applicant.sibling_${n}.place_of_birth`),
                nationality: flat(data, `main_applicant.sibling_${n}.nationality`),
                country_of_residence: flat(data, `main_applicant.sibling_${n}.country_of_residence`),
                occupation: flat(data, `main_applicant.sibling_${n}.occupation`),
                phone: flat(data, `main_applicant.sibling_${n}.phone`),
                relationship: flat(data, `main_applicant.sibling_${n}.relationship`),
            });
        }
    }

    const prev_spouses: PrevSpouseEntry[] = [];
    for (let n = 1; n <= 2; n++) {
        const name = flat(data, `main_applicant.previous_spouse_${n}.name`);
        if (name) {
            prev_spouses.push({
                name,
                nationality: flat(data, `main_applicant.previous_spouse_${n}.nationality`),
                dob: flat(data, `main_applicant.previous_spouse_${n}.dob`),
                date_of_marriage: flat(data, `main_applicant.previous_spouse_${n}.date_of_marriage`),
                date_of_dissolution: flat(data, `main_applicant.previous_spouse_${n}.date_of_dissolution`),
            });
        }
    }

    const parseParent = (rel: string): ParentEntry => ({
        given_names: flat(data, `main_applicant.${rel}.given_names`),
        surname: flat(data, `main_applicant.${rel}.surname`),
        dob: flat(data, `main_applicant.${rel}.dob`),
        place_of_birth: flat(data, `main_applicant.${rel}.place_of_birth`),
        citizenship: flat(data, `main_applicant.${rel}.citizenship`),
        occupation: flat(data, `main_applicant.${rel}.occupation`),
        residential_address: flat(data, `main_applicant.${rel}.residential_address`),
        is_deceased: flat(data, `main_applicant.${rel}.is_deceased`),
    });

    const hasSpouse = !!(flat(data, 'main_applicant.spouse.given_names') || flat(data, 'main_applicant.spouse.surname'));
    const hasParents = !!(flat(data, 'main_applicant.father.given_names') || flat(data, 'main_applicant.mother.given_names'));

    return {
        surname: flat(data, 'main_applicant.surname'),
        given_name: flat(data, 'main_applicant.given_name'),
        middle_name: flat(data, 'main_applicant.middle_name'),
        other_names: flat(data, 'main_applicant.other_names'),
        mothers_maiden_name: flat(data, 'main_applicant.mothers_maiden_name'),
        name_local_script: flat(data, 'main_applicant.name_local_script'),
        dob: flat(data, 'main_applicant.dob'),
        place_of_birth: flat(data, 'main_applicant.place_of_birth'),
        nationality: flat(data, 'main_applicant.nationality'),
        gender: flat(data, 'main_applicant.gender'),
        marital_status: flat(data, 'main_applicant.marital_status'),
        marriage_date: flat(data, 'main_applicant.marriage_date'),
        marriage_place: flat(data, 'main_applicant.marriage_place'),
        has_other_citizenship: flat(data, 'main_applicant.has_other_citizenship'),
        other_citizenship_details_1: flat(data, 'main_applicant.other_citizenship_details_1'),
        other_citizenship_details_2: flat(data, 'main_applicant.other_citizenship_details_2'),
        height_cm: flat(data, 'main_applicant.height_cm'),
        weight_kg: flat(data, 'main_applicant.weight_kg'),
        eye_colour: flat(data, 'main_applicant.eye_colour'),
        hair_colour: flat(data, 'main_applicant.hair_colour'),
        distinguishing_marks: flat(data, 'main_applicant.distinguishing_marks'),
        languages: flat(data, 'main_applicant.languages'),
        is_sponsored: flat(data, 'main_applicant.is_sponsored'),
        email: flat(data, 'main_applicant.email'),
        phone_mobile: flat(data, 'main_applicant.phone_mobile'),
        phone_home: flat(data, 'main_applicant.phone_home'),
        national_id_number: flat(data, 'main_applicant.national_id_number'),
        national_id_country: flat(data, 'main_applicant.national_id_country'),
        national_id_number_2: flat(data, 'main_applicant.national_id_number_2'),
        national_id_country_2: flat(data, 'main_applicant.national_id_country_2'),
        drivers_licence_number: flat(data, 'main_applicant.drivers_licence_number'),
        drivers_licence_country: flat(data, 'main_applicant.drivers_licence_country'),
        drivers_licence_number_2: flat(data, 'main_applicant.drivers_licence_number_2'),
        drivers_licence_country_2: flat(data, 'main_applicant.drivers_licence_country_2'),
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
        employer_phone: flat(data, 'main_applicant.employer_phone'),
        employer_website: flat(data, 'main_applicant.employer_website'),
        employer_nature_of_business: flat(data, 'main_applicant.employer_nature_of_business'),
        employer_country_of_incorporation: flat(data, 'main_applicant.employer_country_of_incorporation'),
        employment_more_info: flat(data, 'main_applicant.employment_more_info'),
        employment_history: employment_history.length ? employment_history : undefined,
        annual_income_gross_usd: flat(data, 'main_applicant.annual_income_gross_usd'),
        sources_of_income: flat(data, 'main_applicant.sources_of_income'),
        assets_savings_amount: flat(data, 'main_applicant.assets_savings_amount'),
        assets_fixed_amount: flat(data, 'main_applicant.assets_fixed_amount'),
        assets_investments_amount: flat(data, 'main_applicant.assets_investments_amount'),
        assets_other_amount: flat(data, 'main_applicant.assets_other_amount'),
        assets_total: flat(data, 'main_applicant.assets_total'),
        liabilities_short_term_amount: flat(data, 'main_applicant.liabilities_short_term_amount'),
        liabilities_long_term_amount: flat(data, 'main_applicant.liabilities_long_term_amount'),
        liabilities_other_amount: flat(data, 'main_applicant.liabilities_other_amount'),
        liabilities_total: flat(data, 'main_applicant.liabilities_total'),
        net_worth_total: flat(data, 'main_applicant.net_worth_total'),
        business_geographical_locations: flat(data, 'main_applicant.business_geographical_locations'),
        companies_shareholder_director: flat(data, 'main_applicant.companies_shareholder_director'),
        key_business_partners: flat(data, 'main_applicant.key_business_partners'),
        military_served: flat(data, 'main_applicant.military_served'),
        military_branch: flat(data, 'main_applicant.military_branch'),
        military_ranking: flat(data, 'main_applicant.military_ranking'),
        military_serial_number: flat(data, 'main_applicant.military_serial_number'),
        military_entry: flat(data, 'main_applicant.military_entry'),
        military_separation: flat(data, 'main_applicant.military_separation'),
        military_discharge_type: flat(data, 'main_applicant.military_discharge_type'),
        military_arrested: flat(data, 'main_applicant.military_arrested'),
        has_disciplinary_action: flat(data, 'main_applicant.has_disciplinary_action'),
        disciplinary_action_details: flat(data, 'main_applicant.disciplinary_action_details'),
        has_spouse: hasSpouse,
        spouse_given_names: flat(data, 'main_applicant.spouse.given_names'),
        spouse_surname: flat(data, 'main_applicant.spouse.surname'),
        spouse_dob: flat(data, 'main_applicant.spouse.dob'),
        spouse_nationality: flat(data, 'main_applicant.spouse.nationality'),
        spouse_occupation: flat(data, 'main_applicant.spouse.occupation'),
        spouse_employer: flat(data, 'main_applicant.spouse.employer'),
        spouse_address: flat(data, 'main_applicant.spouse.address'),
        spouse_city: flat(data, 'main_applicant.spouse.city'),
        spouse_state: flat(data, 'main_applicant.spouse.state'),
        spouse_postal_code: flat(data, 'main_applicant.spouse.postal_code'),
        spouse_country: flat(data, 'main_applicant.spouse.country'),
        spouse_phone_mobile: flat(data, 'main_applicant.spouse.phone_mobile'),
        spouse_phone_home: flat(data, 'main_applicant.spouse.phone_home'),
        spouse_phone_work: flat(data, 'main_applicant.spouse.phone_work'),
        spouse_employer_address: flat(data, 'main_applicant.spouse.employer_address'),
        spouse_employer_city: flat(data, 'main_applicant.spouse.employer_city'),
        spouse_employer_state: flat(data, 'main_applicant.spouse.employer_state'),
        spouse_employer_postal_code: flat(data, 'main_applicant.spouse.employer_postal_code'),
        spouse_employer_country: flat(data, 'main_applicant.spouse.employer_country'),
        has_prev_spouses: prev_spouses.length > 0,
        prev_spouses: prev_spouses.length ? prev_spouses : undefined,
        has_children: children.length > 0,
        children: children.length ? children : undefined,
        has_siblings: siblings.length > 0,
        siblings: siblings.length ? siblings : undefined,
        has_parents: hasParents,
        father: hasParents ? parseParent('father') : undefined,
        mother: hasParents ? parseParent('mother') : undefined,
        father_in_law: hasParents ? parseParent('father_in_law') : undefined,
        mother_in_law: hasParents ? parseParent('mother_in_law') : undefined,
    };
}

// ─── helpers ────────────────────────────────────────────────────────────────

function emptyPassport(): PassportEntry {
    return { number: '', country_of_issue: '', date_of_issue: '', place_of_issue: '', date_of_expiry: '' };
}

function emptyEmployment(): EmploymentEntry {
    return { period_start: '', period_end: '', employer_name: '', address: '', position: '', business_type: '', reason_leaving: '' };
}

function emptyAddressHistory(): AddressHistoryEntry {
    return { date_from: '', date_to: '', full_address: '' };
}

function emptyChild(): ChildEntry {
    return { given_names: '', surname: '', dob: '', gender: '', nationality: '', place_of_birth: '', country_of_residence: '', occupation: '', phone: '', is_not_included: '' };
}

function emptySibling(): SiblingEntry {
    return { given_names: '', surname: '', gender: '', dob: '', place_of_birth: '', nationality: '', country_of_residence: '', occupation: '', phone: '', relationship: '' };
}

function emptyPrevSpouse(): PrevSpouseEntry {
    return { name: '', nationality: '', dob: '', date_of_marriage: '', date_of_dissolution: '' };
}

function emptyParent(): ParentEntry {
    return { given_names: '', surname: '', dob: '', place_of_birth: '', citizenship: '', occupation: '', residential_address: '', is_deceased: '' };
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
    surname: '', given_name: '', middle_name: '', other_names: '', mothers_maiden_name: '', name_local_script: '',
    dob: '', place_of_birth: '', nationality: '', gender: '', marital_status: '', marriage_date: '', marriage_place: '',
    has_other_citizenship: '', other_citizenship_details_1: '', other_citizenship_details_2: '',
    height_cm: '', weight_kg: '', eye_colour: '', hair_colour: '', distinguishing_marks: '', languages: '', is_sponsored: '',
    email: '', phone_mobile: '', phone_home: '',
    national_id_number: '', national_id_country: '', national_id_number_2: '', national_id_country_2: '',
    drivers_licence_number: '', drivers_licence_country: '', drivers_licence_number_2: '', drivers_licence_country_2: '',
    passports: [emptyPassport()],
    residential_address: '', residential_city: '', residential_state: '', residential_country: '', residential_postal_code: '',
    residential_date_since_month: '', residential_date_since_year: '',
    permanent_address: '', permanent_city: '', permanent_state: '', permanent_country: '', permanent_postal_code: '',
    permanent_date_since_month: '', permanent_date_since_year: '',
    address_history: [],
    occupation_by_training: '', current_occupation: '', is_self_employed: false,
    employer_name: '', employer_address: '', employer_phone: '', employer_website: '',
    employer_nature_of_business: '', employer_country_of_incorporation: '', employment_more_info: '',
    employment_history: [],
    annual_income_gross_usd: '', sources_of_income: '',
    assets_savings_amount: '', assets_fixed_amount: '', assets_investments_amount: '', assets_other_amount: '', assets_total: '',
    liabilities_short_term_amount: '', liabilities_long_term_amount: '', liabilities_other_amount: '', liabilities_total: '',
    net_worth_total: '', business_geographical_locations: '', companies_shareholder_director: '', key_business_partners: '',
    military_served: '', military_branch: '', military_ranking: '', military_serial_number: '',
    military_entry: '', military_separation: '', military_discharge_type: '', military_arrested: '',
    has_disciplinary_action: '', disciplinary_action_details: '',
    permanent_same_as_residential: false,
    has_spouse: false, spouse_given_names: '', spouse_surname: '', spouse_dob: '', spouse_nationality: '',
    spouse_occupation: '', spouse_employer: '', spouse_address: '', spouse_city: '', spouse_state: '',
    spouse_postal_code: '', spouse_country: '', spouse_phone_mobile: '', spouse_phone_home: '', spouse_phone_work: '',
    spouse_employer_address: '', spouse_employer_city: '', spouse_employer_state: '',
    spouse_employer_postal_code: '', spouse_employer_country: '',
    has_prev_spouses: false, prev_spouses: [],
    has_children: false, children: [],
    has_siblings: false, siblings: [],
    has_parents: false,
    father: emptyParent(), mother: emptyParent(),
    father_in_law: emptyParent(), mother_in_law: emptyParent(),
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
        siblings: parsed.siblings ?? [],
        prev_spouses: parsed.prev_spouses ?? [],
        father: parsed.father ?? emptyParent(),
        mother: parsed.mother ?? emptyParent(),
        father_in_law: parsed.father_in_law ?? emptyParent(),
        mother_in_law: parsed.mother_in_law ?? emptyParent(),
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

    // ── Previous spouse helpers
    const addPrevSpouse = () => { if (form.prev_spouses.length < 2) set('prev_spouses', [...form.prev_spouses, emptyPrevSpouse()]); };
    const removePrevSpouse = (i: number) => set('prev_spouses', form.prev_spouses.filter((_, idx) => idx !== i));
    const updatePrevSpouse = (i: number, key: keyof PrevSpouseEntry, val: string) =>
        set('prev_spouses', form.prev_spouses.map((ps, idx) => idx === i ? { ...ps, [key]: val } : ps));

    // ── Sibling helpers
    const addSibling = () => { if (form.siblings.length < 4) set('siblings', [...form.siblings, emptySibling()]); };
    const removeSibling = (i: number) => set('siblings', form.siblings.filter((_, idx) => idx !== i));
    const updateSibling = (i: number, key: keyof SiblingEntry, val: string) =>
        set('siblings', form.siblings.map((s, idx) => idx === i ? { ...s, [key]: val } : s));

    // ── Parent helper
    const updateParent = (rel: 'father' | 'mother' | 'father_in_law' | 'mother_in_law', key: keyof ParentEntry, val: string) =>
        set(rel, { ...form[rel], [key]: val });

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
                            <Field label="Other Names Used"><TextInput value={form.other_names} onChange={v => set('other_names', v)} /></Field>
                            <Field label="Mother's Maiden Name"><TextInput value={form.mothers_maiden_name} onChange={v => set('mothers_maiden_name', v)} /></Field>
                            <Field label="Name in Local Script"><TextInput value={form.name_local_script} onChange={v => set('name_local_script', v)} /></Field>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Date of Birth"><DateInput value={form.dob} onChange={v => set('dob', v)} /></Field>
                            <Field label="Place of Birth"><TextInput value={form.place_of_birth} onChange={v => set('place_of_birth', v)} placeholder="City, Country" /></Field>
                            <Field label="Nationality"><TextInput value={form.nationality} onChange={v => set('nationality', v)} placeholder="e.g. Jordanian" /></Field>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Gender"><GenderSelect value={form.gender} onChange={v => set('gender', v)} /></Field>
                            <Field label="Marital Status">
                                <select value={form.marital_status} onChange={e => set('marital_status', e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm">
                                    <option value="">Select…</option>
                                    {['Single', 'Married', 'Divorced', 'Widowed', 'Separated'].map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </Field>
                            <Field label="Date of Marriage"><DateInput value={form.marriage_date} onChange={v => set('marriage_date', v)} /></Field>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Place of Marriage"><TextInput value={form.marriage_place} onChange={v => set('marriage_place', v)} /></Field>
                            <Field label="Has Other Citizenship">
                                <select value={form.has_other_citizenship} onChange={e => set('has_other_citizenship', e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm">
                                    <option value="">Select…</option>
                                    <option value="Yes">Yes</option><option value="No">No</option>
                                </select>
                            </Field>
                            <Field label="Other Citizenship Details 1"><TextInput value={form.other_citizenship_details_1} onChange={v => set('other_citizenship_details_1', v)} /></Field>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Other Citizenship Details 2"><TextInput value={form.other_citizenship_details_2} onChange={v => set('other_citizenship_details_2', v)} /></Field>
                            <Field label="Languages Spoken"><TextInput value={form.languages} onChange={v => set('languages', v)} /></Field>
                            <Field label="Sponsored Applicant">
                                <select value={form.is_sponsored} onChange={e => set('is_sponsored', e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm">
                                    <option value="">Select…</option>
                                    <option value="Yes">Yes</option><option value="No">No</option>
                                </select>
                            </Field>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            <Field label="Height (cm)"><TextInput value={form.height_cm} onChange={v => set('height_cm', v)} /></Field>
                            <Field label="Weight (kg)"><TextInput value={form.weight_kg} onChange={v => set('weight_kg', v)} /></Field>
                            <Field label="Eye Colour"><TextInput value={form.eye_colour} onChange={v => set('eye_colour', v)} /></Field>
                            <Field label="Hair Colour"><TextInput value={form.hair_colour} onChange={v => set('hair_colour', v)} /></Field>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Distinguishing Marks"><TextInput value={form.distinguishing_marks} onChange={v => set('distinguishing_marks', v)} /></Field>
                            <Field label="Email"><TextInput value={form.email} onChange={v => set('email', v)} placeholder="name@example.com" /></Field>
                            <Field label="Mobile Phone"><TextInput value={form.phone_mobile} onChange={v => set('phone_mobile', v)} placeholder="+1 234 567 8900" /></Field>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Home Phone"><TextInput value={form.phone_home} onChange={v => set('phone_home', v)} /></Field>
                        </div>
                    </div>
                </SectionCard>

                {/* ── Identity Documents */}
                <SectionCard title="Identity Documents" defaultOpen={false}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-4 gap-3">
                            <Field label="National ID Number"><TextInput value={form.national_id_number} onChange={v => set('national_id_number', v)} /></Field>
                            <Field label="National ID Country"><TextInput value={form.national_id_country} onChange={v => set('national_id_country', v)} /></Field>
                            <Field label="National ID Number 2"><TextInput value={form.national_id_number_2} onChange={v => set('national_id_number_2', v)} /></Field>
                            <Field label="National ID Country 2"><TextInput value={form.national_id_country_2} onChange={v => set('national_id_country_2', v)} /></Field>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            <Field label="Driver's Licence"><TextInput value={form.drivers_licence_number} onChange={v => set('drivers_licence_number', v)} /></Field>
                            <Field label="Licence Country"><TextInput value={form.drivers_licence_country} onChange={v => set('drivers_licence_country', v)} /></Field>
                            <Field label="Driver's Licence 2"><TextInput value={form.drivers_licence_number_2} onChange={v => set('drivers_licence_number_2', v)} /></Field>
                            <Field label="Licence Country 2"><TextInput value={form.drivers_licence_country_2} onChange={v => set('drivers_licence_country_2', v)} /></Field>
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
                                <div className="grid grid-cols-3 gap-3">
                                    <Field label="Passport Number" required={i === 0}><TextInput value={p.number} onChange={v => updatePassport(i, 'number', v)} placeholder="e.g. A12345678" /></Field>
                                    <Field label="Country of Issue"><TextInput value={p.country_of_issue} onChange={v => updatePassport(i, 'country_of_issue', v)} placeholder="e.g. Jordan" /></Field>
                                    <Field label="Date of Issue"><DateInput value={p.date_of_issue} onChange={v => updatePassport(i, 'date_of_issue', v)} /></Field>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <Field label="Place of Issue"><TextInput value={p.place_of_issue} onChange={v => updatePassport(i, 'place_of_issue', v)} placeholder="e.g. Amman" /></Field>
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
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-1">
                            <Checkbox
                                id="permanent-same"
                                checked={form.permanent_same_as_residential}
                                onCheckedChange={v => {
                                    const same = Boolean(v);
                                    setForm(prev => ({
                                        ...prev,
                                        permanent_same_as_residential: same,
                                        ...(same ? {
                                            permanent_address: prev.residential_address,
                                            permanent_city: prev.residential_city,
                                            permanent_state: prev.residential_state,
                                            permanent_country: prev.residential_country,
                                            permanent_postal_code: prev.residential_postal_code,
                                            permanent_date_since_month: prev.residential_date_since_month,
                                            permanent_date_since_year: prev.residential_date_since_year,
                                        } : {}),
                                    }));
                                }}
                            />
                            <Label htmlFor="permanent-same" className="text-sm cursor-pointer">Same as Residential Address</Label>
                        </div>
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
                            <div className="space-y-3 pl-6 border-l-2 border-muted">
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Employer Name"><TextInput value={form.employer_name} onChange={v => set('employer_name', v)} /></Field>
                                    <Field label="Employer Address"><TextInput value={form.employer_address} onChange={v => set('employer_address', v)} /></Field>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Employer Phone"><TextInput value={form.employer_phone} onChange={v => set('employer_phone', v)} /></Field>
                                    <Field label="Employer Website"><TextInput value={form.employer_website} onChange={v => set('employer_website', v)} /></Field>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Nature of Business"><TextInput value={form.employer_nature_of_business} onChange={v => set('employer_nature_of_business', v)} /></Field>
                                    <Field label="Country of Incorporation"><TextInput value={form.employer_country_of_incorporation} onChange={v => set('employer_country_of_incorporation', v)} /></Field>
                                </div>
                                <Field label="Additional Employment Info"><TextInput value={form.employment_more_info} onChange={v => set('employment_more_info', v)} /></Field>
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

                {/* ── Financial */}
                <SectionCard title="Financial" defaultOpen={false}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Annual Income Gross (USD)"><TextInput value={form.annual_income_gross_usd} onChange={v => set('annual_income_gross_usd', v)} /></Field>
                            <Field label="Sources of Income"><TextInput value={form.sources_of_income} onChange={v => set('sources_of_income', v)} /></Field>
                        </div>
                        <div>
                            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Assets</p>
                            <div className="grid grid-cols-3 gap-3">
                                <Field label="Savings / Cash"><TextInput value={form.assets_savings_amount} onChange={v => set('assets_savings_amount', v)} /></Field>
                                <Field label="Fixed Assets"><TextInput value={form.assets_fixed_amount} onChange={v => set('assets_fixed_amount', v)} /></Field>
                                <Field label="Investments"><TextInput value={form.assets_investments_amount} onChange={v => set('assets_investments_amount', v)} /></Field>
                                <Field label="Other Assets"><TextInput value={form.assets_other_amount} onChange={v => set('assets_other_amount', v)} /></Field>
                                <Field label="Total Assets"><TextInput value={form.assets_total} onChange={v => set('assets_total', v)} /></Field>
                            </div>
                        </div>
                        <div>
                            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Liabilities</p>
                            <div className="grid grid-cols-3 gap-3">
                                <Field label="Short-Term Liabilities"><TextInput value={form.liabilities_short_term_amount} onChange={v => set('liabilities_short_term_amount', v)} /></Field>
                                <Field label="Long-Term Liabilities"><TextInput value={form.liabilities_long_term_amount} onChange={v => set('liabilities_long_term_amount', v)} /></Field>
                                <Field label="Other Liabilities"><TextInput value={form.liabilities_other_amount} onChange={v => set('liabilities_other_amount', v)} /></Field>
                                <Field label="Total Liabilities"><TextInput value={form.liabilities_total} onChange={v => set('liabilities_total', v)} /></Field>
                                <Field label="Net Worth Total"><TextInput value={form.net_worth_total} onChange={v => set('net_worth_total', v)} /></Field>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Business Geographic Locations"><TextInput value={form.business_geographical_locations} onChange={v => set('business_geographical_locations', v)} /></Field>
                            <Field label="Companies (Shareholder/Director)"><TextInput value={form.companies_shareholder_director} onChange={v => set('companies_shareholder_director', v)} /></Field>
                            <Field label="Key Business Partners"><TextInput value={form.key_business_partners} onChange={v => set('key_business_partners', v)} /></Field>
                        </div>
                    </div>
                </SectionCard>

                {/* ── Military Service */}
                <SectionCard title="Military Service" defaultOpen={false}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Served in Military">
                                <select value={form.military_served} onChange={e => set('military_served', e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm">
                                    <option value="">Select…</option>
                                    <option value="Yes">Yes</option><option value="No">No</option>
                                </select>
                            </Field>
                            <Field label="Branch"><TextInput value={form.military_branch} onChange={v => set('military_branch', v)} /></Field>
                            <Field label="Ranking / Grade"><TextInput value={form.military_ranking} onChange={v => set('military_ranking', v)} /></Field>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Service Number"><TextInput value={form.military_serial_number} onChange={v => set('military_serial_number', v)} /></Field>
                            <Field label="Entry Date"><DateInput value={form.military_entry} onChange={v => set('military_entry', v)} /></Field>
                            <Field label="Separation Date"><DateInput value={form.military_separation} onChange={v => set('military_separation', v)} /></Field>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Type of Discharge"><TextInput value={form.military_discharge_type} onChange={v => set('military_discharge_type', v)} /></Field>
                            <Field label="Arrested While in Service">
                                <select value={form.military_arrested} onChange={e => set('military_arrested', e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm">
                                    <option value="">Select…</option>
                                    <option value="Yes">Yes</option><option value="No">No</option>
                                </select>
                            </Field>
                        </div>
                    </div>
                </SectionCard>

                {/* ── Disciplinary */}
                <SectionCard title="Disciplinary" defaultOpen={false}>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Disciplinary Action Taken">
                            <select value={form.has_disciplinary_action} onChange={e => set('has_disciplinary_action', e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm">
                                <option value="">Select…</option>
                                <option value="Yes">Yes</option><option value="No">No</option>
                            </select>
                        </Field>
                        <Field label="Disciplinary Action Details"><TextInput value={form.disciplinary_action_details} onChange={v => set('disciplinary_action_details', v)} /></Field>
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
                                        <Field label="State / Province"><TextInput value={form.spouse_state} onChange={v => set('spouse_state', v)} /></Field>
                                        <Field label="Postal Code"><TextInput value={form.spouse_postal_code} onChange={v => set('spouse_postal_code', v)} /></Field>
                                    </div>
                                    <div className="grid grid-cols-4 gap-3">
                                        <Field label="Country"><TextInput value={form.spouse_country} onChange={v => set('spouse_country', v)} /></Field>
                                        <Field label="Mobile Phone"><TextInput value={form.spouse_phone_mobile} onChange={v => set('spouse_phone_mobile', v)} /></Field>
                                        <Field label="Home Phone"><TextInput value={form.spouse_phone_home} onChange={v => set('spouse_phone_home', v)} /></Field>
                                        <Field label="Work Phone"><TextInput value={form.spouse_phone_work} onChange={v => set('spouse_phone_work', v)} /></Field>
                                    </div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Spouse Employer Address</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        <Field label="Employer Address"><TextInput value={form.spouse_employer_address} onChange={v => set('spouse_employer_address', v)} /></Field>
                                        <Field label="Employer City"><TextInput value={form.spouse_employer_city} onChange={v => set('spouse_employer_city', v)} /></Field>
                                        <Field label="Employer State"><TextInput value={form.spouse_employer_state} onChange={v => set('spouse_employer_state', v)} /></Field>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <Field label="Employer Postal Code"><TextInput value={form.spouse_employer_postal_code} onChange={v => set('spouse_employer_postal_code', v)} /></Field>
                                        <Field label="Employer Country"><TextInput value={form.spouse_employer_country} onChange={v => set('spouse_employer_country', v)} /></Field>
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
                                                <div className="grid grid-cols-3 gap-3">
                                                    <Field label="Country of Residence"><TextInput value={c.country_of_residence} onChange={v => updateChild(i, 'country_of_residence', v)} /></Field>
                                                    <Field label="Occupation"><TextInput value={c.occupation} onChange={v => updateChild(i, 'occupation', v)} /></Field>
                                                    <Field label="Phone"><TextInput value={c.phone} onChange={v => updateChild(i, 'phone', v)} /></Field>
                                                </div>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <Field label="Not Included in Application">
                                                        <select value={c.is_not_included} onChange={e => updateChild(i, 'is_not_included', e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm">
                                                            <option value="">Select…</option>
                                                            <option value="Yes">Yes</option>
                                                            <option value="No">No</option>
                                                        </select>
                                                    </Field>
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

                        <Separator />

                        {/* Previous Spouses */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="has-prev-spouses"
                                    checked={form.has_prev_spouses}
                                    onCheckedChange={v => {
                                        set('has_prev_spouses', Boolean(v));
                                        if (!v) set('prev_spouses', []);
                                    }}
                                />
                                <Label htmlFor="has-prev-spouses" className="text-sm font-medium cursor-pointer">Previous Spouses</Label>
                            </div>

                            {form.has_prev_spouses && (
                                <div className="pl-6 border-l-2 border-primary/30 space-y-3">
                                    {form.prev_spouses.map((ps, i) => (
                                        <div key={i} className="border rounded-lg p-3 space-y-3 bg-muted/20">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium">Previous Spouse {i + 1}</span>
                                                <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => removePrevSpouse(i)}>
                                                    <Trash2 className="size-3 mr-1" /> Remove
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <Field label="Full Name"><TextInput value={ps.name} onChange={v => updatePrevSpouse(i, 'name', v)} /></Field>
                                                <Field label="Nationality"><TextInput value={ps.nationality} onChange={v => updatePrevSpouse(i, 'nationality', v)} /></Field>
                                                <Field label="Date of Birth"><DateInput value={ps.dob} onChange={v => updatePrevSpouse(i, 'dob', v)} /></Field>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <Field label="Date of Marriage"><DateInput value={ps.date_of_marriage} onChange={v => updatePrevSpouse(i, 'date_of_marriage', v)} /></Field>
                                                <Field label="Date of Dissolution"><DateInput value={ps.date_of_dissolution} onChange={v => updatePrevSpouse(i, 'date_of_dissolution', v)} /></Field>
                                            </div>
                                        </div>
                                    ))}

                                    {form.prev_spouses.length < 2 && (
                                        <Button variant="outline" size="sm" className="text-xs" onClick={addPrevSpouse}>
                                            <Plus className="size-3 mr-1" /> Add Previous Spouse
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Siblings */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="has-siblings"
                                    checked={form.has_siblings}
                                    onCheckedChange={v => {
                                        set('has_siblings', Boolean(v));
                                        if (!v) set('siblings', []);
                                    }}
                                />
                                <Label htmlFor="has-siblings" className="text-sm font-medium cursor-pointer">Siblings</Label>
                            </div>

                            {form.has_siblings && (
                                <div className="pl-6 border-l-2 border-primary/30 space-y-3">
                                    {form.siblings.map((s, i) => (
                                        <div key={i} className="border rounded-lg p-3 space-y-3 bg-muted/20">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium">Sibling {i + 1}</span>
                                                <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => removeSibling(i)}>
                                                    <Trash2 className="size-3 mr-1" /> Remove
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <Field label="Given Names"><TextInput value={s.given_names} onChange={v => updateSibling(i, 'given_names', v)} /></Field>
                                                <Field label="Surname"><TextInput value={s.surname} onChange={v => updateSibling(i, 'surname', v)} /></Field>
                                                <Field label="Gender"><GenderSelect value={s.gender} onChange={v => updateSibling(i, 'gender', v)} /></Field>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <Field label="Date of Birth"><DateInput value={s.dob} onChange={v => updateSibling(i, 'dob', v)} /></Field>
                                                <Field label="Place of Birth"><TextInput value={s.place_of_birth} onChange={v => updateSibling(i, 'place_of_birth', v)} /></Field>
                                                <Field label="Nationality"><TextInput value={s.nationality} onChange={v => updateSibling(i, 'nationality', v)} /></Field>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <Field label="Country of Residence"><TextInput value={s.country_of_residence} onChange={v => updateSibling(i, 'country_of_residence', v)} /></Field>
                                                <Field label="Occupation"><TextInput value={s.occupation} onChange={v => updateSibling(i, 'occupation', v)} /></Field>
                                                <Field label="Phone"><TextInput value={s.phone} onChange={v => updateSibling(i, 'phone', v)} /></Field>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <Field label="Relationship"><TextInput value={s.relationship} onChange={v => updateSibling(i, 'relationship', v)} /></Field>
                                            </div>
                                        </div>
                                    ))}

                                    {form.siblings.length < 4 && (
                                        <Button variant="outline" size="sm" className="text-xs" onClick={addSibling}>
                                            <Plus className="size-3 mr-1" /> Add Sibling
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Parents & In-Laws */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="has-parents"
                                    checked={form.has_parents}
                                    onCheckedChange={v => set('has_parents', Boolean(v))}
                                />
                                <Label htmlFor="has-parents" className="text-sm font-medium cursor-pointer">Parents &amp; In-Laws</Label>
                            </div>

                            {form.has_parents && (
                                <div className="pl-6 border-l-2 border-primary/30 space-y-4">
                                    {(
                                        [
                                            { rel: 'father', label: 'Father' },
                                            { rel: 'mother', label: 'Mother' },
                                            { rel: 'father_in_law', label: 'Father-in-Law' },
                                            { rel: 'mother_in_law', label: 'Mother-in-Law' },
                                        ] as { rel: 'father' | 'mother' | 'father_in_law' | 'mother_in_law'; label: string }[]
                                    ).map(({ rel, label }) => {
                                        const p = form[rel];
                                        return (
                                            <div key={rel} className="border rounded-lg p-3 space-y-3 bg-muted/20">
                                                <span className="text-xs font-medium">{label}</span>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <Field label="Given Names"><TextInput value={p.given_names} onChange={v => updateParent(rel, 'given_names', v)} /></Field>
                                                    <Field label="Surname"><TextInput value={p.surname} onChange={v => updateParent(rel, 'surname', v)} /></Field>
                                                    <Field label="Date of Birth"><DateInput value={p.dob} onChange={v => updateParent(rel, 'dob', v)} /></Field>
                                                </div>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <Field label="Place of Birth"><TextInput value={p.place_of_birth} onChange={v => updateParent(rel, 'place_of_birth', v)} /></Field>
                                                    <Field label="Citizenship"><TextInput value={p.citizenship} onChange={v => updateParent(rel, 'citizenship', v)} /></Field>
                                                    <Field label="Occupation"><TextInput value={p.occupation} onChange={v => updateParent(rel, 'occupation', v)} /></Field>
                                                </div>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <Field label="Residential Address"><TextInput value={p.residential_address} onChange={v => updateParent(rel, 'residential_address', v)} /></Field>
                                                    <Field label="Deceased">
                                                        <select value={p.is_deceased} onChange={e => updateParent(rel, 'is_deceased', e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm">
                                                            <option value="">Select…</option>
                                                            <option value="Yes">Yes</option>
                                                            <option value="No">No</option>
                                                        </select>
                                                    </Field>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                    </div>
                </SectionCard>

            </div>
        </AppLayout>
    );
}
