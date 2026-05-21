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
            'main_applicant.nationality',
            'main_applicant.name_local_script',
            'main_applicant.mothers_maiden_name',
            'main_applicant.marital_status',
            'main_applicant.is_sponsored',

            // ── Main applicant: national ID / licence ─────────────────────
            'main_applicant.national_id_number',
            'main_applicant.national_id_country',
            'main_applicant.national_id_number_2',
            'main_applicant.national_id_country_2',
            'main_applicant.drivers_licence_number',
            'main_applicant.drivers_licence_country',

            // ── Main applicant: passports ─────────────────────────────────
            'main_applicant.passport_1.number',
            'main_applicant.passport_1.country_of_issue',
            'main_applicant.passport_1.place_of_issue',
            'main_applicant.passport_1.date_of_issue',
            'main_applicant.passport_1.date_of_expiry',
            'main_applicant.passport_2.number',
            'main_applicant.passport_2.country_of_issue',
            'main_applicant.passport_2.place_of_issue',
            'main_applicant.passport_2.date_of_issue',
            'main_applicant.passport_2.date_of_expiry',

            // ── Main applicant: contact ───────────────────────────────────
            'main_applicant.email',
            'main_applicant.phone_mobile',
            'main_applicant.phone_home',
            'main_applicant.phone_work',
            'main_applicant.fax',

            // ── Main applicant: residential address ───────────────────────
            'main_applicant.address_residential.line_1',
            'main_applicant.address_residential.line_2',
            'main_applicant.address_residential.city',
            'main_applicant.address_residential.state_province',
            'main_applicant.address_residential.postal_code',
            'main_applicant.address_residential.country',

            // ── Main applicant: mailing address ───────────────────────────
            'main_applicant.address_mailing.line_1',
            'main_applicant.address_mailing.line_2',
            'main_applicant.address_mailing.city',
            'main_applicant.address_mailing.state_province',
            'main_applicant.address_mailing.postal_code',
            'main_applicant.address_mailing.country',

            // ── Main applicant: employment / financial ────────────────────
            'main_applicant.occupation',
            'main_applicant.employer_name',
            'main_applicant.employer_address',
            'main_applicant.employer_city',
            'main_applicant.employer_country',
            'main_applicant.employment_status',
            'main_applicant.source_of_funds',
            'main_applicant.annual_income',
            'main_applicant.net_worth',

            // ── Spouse: personal ──────────────────────────────────────────
            'spouse.surname',
            'spouse.given_name',
            'spouse.middle_name',
            'spouse.other_names',
            'spouse.dob',
            'spouse.gender',
            'spouse.place_of_birth',
            'spouse.country_of_birth',
            'spouse.nationality',
            'spouse.name_local_script',
            'spouse.mothers_maiden_name',
            'spouse.national_id_number',
            'spouse.national_id_country',
            'spouse.drivers_licence_number',
            'spouse.drivers_licence_country',

            // ── Spouse: passports ─────────────────────────────────────────
            'spouse.passport_1.number',
            'spouse.passport_1.country_of_issue',
            'spouse.passport_1.place_of_issue',
            'spouse.passport_1.date_of_issue',
            'spouse.passport_1.date_of_expiry',
            'spouse.passport_2.number',
            'spouse.passport_2.country_of_issue',
            'spouse.passport_2.place_of_issue',
            'spouse.passport_2.date_of_issue',
            'spouse.passport_2.date_of_expiry',

            // ── Spouse: contact / address ─────────────────────────────────
            'spouse.email',
            'spouse.phone_mobile',
            'spouse.phone_home',
            'spouse.address_residential.line_1',
            'spouse.address_residential.line_2',
            'spouse.address_residential.city',
            'spouse.address_residential.state_province',
            'spouse.address_residential.postal_code',
            'spouse.address_residential.country',

            // ── Spouse: employment ────────────────────────────────────────
            'spouse.occupation',
            'spouse.employer_name',
            'spouse.employer_address',
            'spouse.employment_status',
            'spouse.source_of_funds',

            // ── Dependents 1–4 ────────────────────────────────────────────
            ...self::dependentPaths(1),
            ...self::dependentPaths(2),
            ...self::dependentPaths(3),
            ...self::dependentPaths(4),

            // ── Investment ────────────────────────────────────────────────
            'investment.option',
            'investment.amount',
            'investment.fund_name',
            'investment.property_name',
            'investment.property_developer',
            'investment.property_location',
            'investment.property_purchase_price',

            // ── Application meta ──────────────────────────────────────────
            'application.date',
            'application.place',
            'application.agent_name',
            'application.agent_licence_number',
            'application.agent_company',
        ];
    }

    /** @return string[] */
    private static function dependentPaths(int $n): array
    {
        $p = "dependent_{$n}";

        return [
            "{$p}.surname",
            "{$p}.given_name",
            "{$p}.middle_name",
            "{$p}.dob",
            "{$p}.gender",
            "{$p}.relationship",
            "{$p}.nationality",
            "{$p}.place_of_birth",
            "{$p}.country_of_birth",
            "{$p}.passport_1.number",
            "{$p}.passport_1.country_of_issue",
            "{$p}.passport_1.date_of_issue",
            "{$p}.passport_1.date_of_expiry",
        ];
    }
}
