<?php

namespace App\Data\Forms;

class CanonicalPathDictionary
{
    /**
     * Returns known canonical paths for a given program code.
     * Merged with DB-sourced paths to populate the mapping autocomplete.
     */
    public static function forProgram(string $programCode): array
    {
        return match ($programCode) {
            'dominica-cbi' => self::dominicanCbi(),
            default => [],
        };
    }

    /** @return string[] */
    private static function dominicanCbi(): array
    {
        return [
            // ── Main applicant: personal ──────────────────────────────────
            'main_applicant.surname',
            'main_applicant.given_name',
            'main_applicant.middle_name',
            'main_applicant.other_names',
            'main_applicant.dob',
            'main_applicant.gender',
            'main_applicant.place_of_birth',
            'main_applicant.country_of_birth',
            'main_applicant.citizenship',
            'main_applicant.other_citizenship',
            'main_applicant.other_citizenship_details',
            'main_applicant.name_local_characters',
            'main_applicant.mothers_maiden_name',
            'main_applicant.national_id_number',
            'main_applicant.national_id_country',
            'main_applicant.drivers_licence_number',
            'main_applicant.drivers_licence_country',
            'main_applicant.title',
            'main_applicant.maiden_surname',
            'main_applicant.original_name_aliases',
            'main_applicant.marital_status',

            // ── Main applicant: passports ─────────────────────────────────
            'main_applicant.passport_1.number',
            'main_applicant.passport_1.issuing_country',
            'main_applicant.passport_1.issue_date',
            'main_applicant.passport_1.expiry_date',
            'main_applicant.passport_2.number',
            'main_applicant.passport_2.issuing_country',
            'main_applicant.passport_2.issue_date',
            'main_applicant.passport_2.expiry_date',

            // ── Main applicant: contact & address ─────────────────────────
            'main_applicant.email',
            'main_applicant.phone_home',
            'main_applicant.phone_mobile',
            'main_applicant.phone_dominica',
            'main_applicant.current_address.street',
            'main_applicant.current_address.city',
            'main_applicant.current_address.state',
            'main_applicant.current_address.country',
            'main_applicant.current_address.postal_code',
            'main_applicant.permanent_address.street',
            'main_applicant.permanent_address.city',
            'main_applicant.permanent_address.state',
            'main_applicant.permanent_address.country',
            'main_applicant.permanent_address.postal_code',
            'main_applicant.address_history',

            // ── Main applicant: physical ──────────────────────────────────
            'main_applicant.eye_colour',
            'main_applicant.hair_colour',
            'main_applicant.height_cm',
            'main_applicant.height_feet',
            'main_applicant.height_inches',
            'main_applicant.weight_kg',
            'main_applicant.distinguishing_marks',

            // ── Main applicant: work & business ───────────────────────────
            'main_applicant.occupation',
            'main_applicant.occupation_by_training',
            'main_applicant.self_employed',
            'main_applicant.employer_name',
            'main_applicant.employer_nature',
            'main_applicant.employer_address',
            'main_applicant.employer_website',
            'main_applicant.employer_phone',
            'main_applicant.employer_incorporation_country',
            'main_applicant.professional_licences',
            'main_applicant.disciplinary_action',
            'main_applicant.disciplinary_action_details',
            'main_applicant.directorships',
            'main_applicant.annual_income_usd',
            'main_applicant.net_worth_usd',
            'main_applicant.income_sources',
            'main_applicant.business_geographies',
            'main_applicant.key_business_counterparties',
            'main_applicant.net_worth_narrative',
            'main_applicant.assets_fixed',
            'main_applicant.assets_investments',
            'main_applicant.assets_savings',
            'main_applicant.assets_other',
            'main_applicant.liabilities_long_term',
            'main_applicant.liabilities_short_term',
            'main_applicant.liabilities_other',

            // ── Main applicant: bank account ──────────────────────────────
            'main_applicant.bank_account_holder',
            'main_applicant.bank_account_number',
            'main_applicant.bank_iban_bic',
            'main_applicant.bank_name_address',

            // ── Main applicant: history ───────────────────────────────────
            'main_applicant.education_history',
            'main_applicant.employment_history',

            // ── Main applicant: military ──────────────────────────────────
            'main_applicant.military_served',
            'main_applicant.military_branch',
            'main_applicant.military_serial_number',
            'main_applicant.military_rank_at_separation',
            'main_applicant.military_type_of_discharge',
            'main_applicant.military_entry_date',
            'main_applicant.military_separation_date',
            'main_applicant.military_arrested',
            'main_applicant.military_arrest_details',

            // ── Spouse ────────────────────────────────────────────────────
            'spouse.surname',
            'spouse.given_name',
            'spouse.dob',
            'spouse.place_of_birth',
            'spouse.citizenship',
            'spouse.passport_number',
            'spouse.email',
            'spouse.phone_home',
            'spouse.phone_work',
            'spouse.phone_mobile',
            'spouse.occupation',
            'spouse.employer',
            'spouse.residential_address.street',
            'spouse.residential_address.city',
            'spouse.residential_address.state',
            'spouse.residential_address.country',
            'spouse.residential_address.postal_code',
            'spouse.employer_address.street',
            'spouse.employer_address.city',
            'spouse.employer_address.state',
            'spouse.employer_address.country',
            'spouse.employer_address.postal_code',
            'spouse.marriage_date',
            'spouse.marriage_place',
            'spouse.previous_spouses',
            'spouse.included_in_application',

            // ── Father ────────────────────────────────────────────────────
            'father.surname',
            'father.given_name',
            'father.dob',
            'father.place_of_birth',
            'father.citizenship',
            'father.residential_address',
            'father.occupation',
            'father.included_in_application',

            // ── Mother ────────────────────────────────────────────────────
            'mother.surname',
            'mother.given_name',
            'mother.dob',
            'mother.place_of_birth',
            'mother.citizenship',
            'mother.residential_address',
            'mother.occupation',
            'mother.included_in_application',

            // ── Father-in-law ─────────────────────────────────────────────
            'father_in_law.surname',
            'father_in_law.given_name',
            'father_in_law.dob',
            'father_in_law.place_of_birth',
            'father_in_law.citizenship',
            'father_in_law.residential_address',
            'father_in_law.included_in_application',

            // ── Mother-in-law ─────────────────────────────────────────────
            'mother_in_law.surname',
            'mother_in_law.given_name',
            'mother_in_law.dob',
            'mother_in_law.place_of_birth',
            'mother_in_law.citizenship',
            'mother_in_law.residential_address',
            'mother_in_law.included_in_application',

            // ── Siblings 1–4 ──────────────────────────────────────────────
            ...self::siblingPaths(1),
            ...self::siblingPaths(2),
            ...self::siblingPaths(3),
            ...self::siblingPaths(4),

            // ── Children 1–6 ──────────────────────────────────────────────
            ...self::childPaths(1),
            ...self::childPaths(2),
            ...self::childPaths(3),
            ...self::childPaths(4),
            ...self::childPaths(5),
            ...self::childPaths(6),

            // ── Dependants 1–6 (D4 cover list) ───────────────────────────
            ...self::dependentPaths(1),
            ...self::dependentPaths(2),
            ...self::dependentPaths(3),
            ...self::dependentPaths(4),
            ...self::dependentPaths(5),
            ...self::dependentPaths(6),

            // ── Declarations (D1 Part D) ──────────────────────────────────
            'declaration.arrested_or_convicted',
            'declaration.arrested_details',
            'declaration.testified_grand_jury',
            'declaration.charges_illegal_activity',
            'declaration.sentenced_detention',
            'declaration.received_pardon',
            'declaration.record_expunged',
            'declaration.subpoenaed',
            'declaration.unindicted_co_party',
            'declaration.party_to_lawsuit',
            'declaration.terrorism_financing',
            'declaration.under_investigation',
            'declaration.bankruptcy_insolvency',
            'declaration.visa_refused_deported',
            'declaration.visa_cancelled',
            'declaration.citizenship_refused',
            'declaration.professional_bar',
            'declaration.pep',
            'declaration.yes_details',

            // ── Character references ──────────────────────────────────────
            'reference_1.full_name',
            'reference_1.street_address',
            'reference_1.city_state',
            'reference_1.country_postal',
            'reference_1.phone_home',
            'reference_1.phone_work',
            'reference_1.phone_mobile',
            'reference_1.email',
            'reference_1.years_known',
            'reference_1.occupation',
            'reference_1.employer',
            'reference_2.full_name',
            'reference_2.street_address',
            'reference_2.city_state',
            'reference_2.country_postal',
            'reference_2.phone_home',
            'reference_2.phone_work',
            'reference_2.phone_mobile',
            'reference_2.email',
            'reference_2.years_known',
            'reference_2.occupation',
            'reference_2.employer',

            // ── Investment ────────────────────────────────────────────────
            'investment.programme',
            'investment.amount_usd',
            'investment.property_name',
            'investment.payment_reference',

            // ── Medical (Form D3) ─────────────────────────────────────────
            'medical.health_problems_yn',
            'medical.health_problems_details',
            'medical.hospitalised_yn',
            'medical.hospitalised_details',
            'medical.doctor_visit_3yr_yn',
            'medical.doctor_visit_details',
            'medical.marital_status',
            'medical.examiner_full_name',
            'medical.examiner_organisation_address',
            'medical.examiner_telephone',
            'medical.examiner_fax',
            'medical.examiner_email',
            'medical.examination_date',
            'medical.examination_place',
            'medical.examiner_licence_number',
            'medical.examiner_designation',
            'medical.final_evaluation',

            // ── Passport application ──────────────────────────────────────
            'passport_app.document_type',
            'passport_app.passport_type',
            'passport_app.application_reason',
            'passport_app.replacement_reason',
            'passport_app.processing_time',
            'passport_app.submitter_surname',
            'passport_app.submitter_given_names',
            'passport_app.submitter_id_type',
            'passport_app.submitter_id_number',
            'passport_app.citizenship_how',
            'passport_app.citizenship_doc_no',
            'passport_app.citizenship_issue_place',
            'passport_app.citizenship_registration_date',
            'passport_app.travel_doc_no',
            'passport_app.loss_date',
            'passport_app.loss_place',
            'passport_app.loss_country',
            'passport_app.loss_police_station',
            'passport_app.loss_case_report_no',
            'passport_app.loss_report_date',
            'passport_app.recommender_surname',
            'passport_app.recommender_given_names',
            'passport_app.recommender_address',
            'passport_app.recommender_phone',
            'passport_app.recommender_email',
            'passport_app.recommender_profession',
            'passport_app.recommender_years_known',
            'passport_app.supplemental_comments',

            // ── Agent / sponsor ───────────────────────────────────────────
            'agent.reference_number',
            'agent.date_received',
            'agent.authorized_agent_number',
            'agent.lpa_principal_name',
            'agent.lpa_nationality',
            'agent.lpa_residence',
            'agent.lpa_date',
            'agent.lpa_place',
            'agent.sponsored',

            // ── Application meta ──────────────────────────────────────────
            'application.submission_date',
            'application.affidavit_occupation',
            'application.affidavit_annual_income',
            'application.form12_address',
            'application.form12_birth_place',
            'application.form12_children',
            'application.sign_date',
            'application.sign_place',
        ];
    }

    /** @return string[] */
    private static function siblingPaths(int $n): array
    {
        $p = "sibling_{$n}";

        return [
            "{$p}.surname",
            "{$p}.given_name",
            "{$p}.gender",
            "{$p}.dob",
            "{$p}.place_of_birth",
            "{$p}.citizenship",
            "{$p}.residential_address",
            "{$p}.occupation",
        ];
    }

    /** @return string[] */
    private static function childPaths(int $n): array
    {
        $p = "child_{$n}";

        return [
            "{$p}.surname",
            "{$p}.given_name",
            "{$p}.gender",
            "{$p}.dob",
            "{$p}.place_of_birth",
            "{$p}.citizenship",
            "{$p}.residential_address",
            "{$p}.occupation",
            "{$p}.included_in_application",
        ];
    }

    /** @return string[] */
    private static function dependentPaths(int $n): array
    {
        $p = "dependent_{$n}";

        return [
            "{$p}.full_name",
            "{$p}.dob",
            "{$p}.relationship",
            "{$p}.citizenship",
            "{$p}.passport_number",
        ];
    }
}
