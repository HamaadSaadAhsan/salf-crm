<?php

namespace App\Data\Forms;

class SuggestedMappingDictionary
{
    /**
     * Returns a suggested canonical_path for a given template field, or null if unknown.
     */
    public static function get(string $templateCode, string $fieldName): ?string
    {
        return static::forTemplate($templateCode)[$fieldName] ?? null;
    }

    /**
     * @return array<string,string> field_name → canonical_path
     */
    public static function forTemplate(string $templateCode): array
    {
        return match ($templateCode) {
            'form_d1' => self::formD1(),
            'form_d2' => self::formD2(),
            'form_d4' => self::formD4(),
            default => [],
        };
    }

    /** @return array<string,string> */
    private static function formD1(): array
    {
        return [
            // ── Cover page (page 1) ────────────────────────────────────────
            'Surname / Family Name' => 'main_applicant.surname',
            'First  / Given name' => 'main_applicant.given_name',
            'Date of birth' => 'main_applicant.dob',
            'Passport Number' => 'main_applicant.passport_1.number',
            'Country of issue' => 'main_applicant.passport_1.country_of_issue',
            'AUTHORIZED AGENT\'S NUMBER' => 'application.agent_licence_number',

            // ── Part A: personal information (page 3) ─────────────────────
            'A1' => 'main_applicant.surname',
            'A2' => 'main_applicant.given_name',
            'A3' => 'main_applicant.middle_name',
            'A4' => 'main_applicant.other_names',
            // A5 = date of birth split into DD / MM / YYYY sub-fields
            'A5_1' => 'main_applicant.dob',
            'A5_2' => 'main_applicant.dob',
            'A5_3' => 'main_applicant.dob',
            'A6' => 'main_applicant.gender',        // checkbox: Male / Female
            'A7' => 'main_applicant.place_of_birth',
            'A8' => 'main_applicant.nationality',
            // A9 = two passports × (number, country, issue date, expiry)
            'A9_1' => 'main_applicant.passport_1.number',
            'A9_2' => 'main_applicant.passport_1.country_of_issue',
            'A9_3' => 'main_applicant.passport_1.date_of_issue',
            'A9_4' => 'main_applicant.passport_1.date_of_expiry',
            'A9_5' => 'main_applicant.passport_2.number',
            'A9_6' => 'main_applicant.passport_2.country_of_issue',
            'A9_7' => 'main_applicant.passport_2.date_of_issue',
            'A9_8' => 'main_applicant.passport_2.date_of_expiry',
            'A10' => 'main_applicant.name_local_script',
            'A11' => 'main_applicant.mothers_maiden_name',
            // A12 = national ID × 2 (number, country per row)
            'A12_1' => 'main_applicant.national_id_number',
            'A12_2' => 'main_applicant.national_id_country',
            'A12_3' => 'main_applicant.national_id_number_2',
            'A12_4' => 'main_applicant.national_id_country_2',
            // A13 = driver's licence × 2 (number, country per row)
            'A13_1' => 'main_applicant.drivers_licence_number',
            'A13_2' => 'main_applicant.drivers_licence_country',
            'A13_3' => 'main_applicant.drivers_licence_number_2',
            'A13_4' => 'main_applicant.drivers_licence_country_2',
            // A14 = marital status
            'A14_2' => 'main_applicant.marital_status',
            // A15 = country of birth
            'A15' => 'main_applicant.country_of_birth',
            'SPONSORED?' => 'main_applicant.is_sponsored',

            // ── A16 = countries of residence last 10 years (5 rows × 7 cols) ─
            // row 1
            'A16_1' => 'main_applicant.residence_history_1.country',
            'A16_2' => 'main_applicant.residence_history_1.city',
            'A16_3' => 'main_applicant.residence_history_1.from',
            'A16_4' => 'main_applicant.residence_history_1.to',
            'A16_5' => 'main_applicant.residence_history_1.purpose',
            'A16_6' => 'main_applicant.residence_history_1.status',
            'A16_7' => 'main_applicant.residence_history_1.address',
            // row 2
            'A16_8' => 'main_applicant.residence_history_2.country',
            'A16_9' => 'main_applicant.residence_history_2.city',
            'A16_10' => 'main_applicant.residence_history_2.from',
            'A16_11' => 'main_applicant.residence_history_2.to',
            'A16_12' => 'main_applicant.residence_history_2.purpose',
            'A16_13' => 'main_applicant.residence_history_2.status',
            'A16_14' => 'main_applicant.residence_history_2.address',
            // row 3
            'A16_15' => 'main_applicant.residence_history_3.country',
            'A16_16' => 'main_applicant.residence_history_3.city',
            'A16_17' => 'main_applicant.residence_history_3.from',
            'A16_18' => 'main_applicant.residence_history_3.to',
            'A16_19' => 'main_applicant.residence_history_3.purpose',
            'A16_20' => 'main_applicant.residence_history_3.status',
            'A16_21' => 'main_applicant.residence_history_3.address',
            // row 4
            'A16_22' => 'main_applicant.residence_history_4.country',
            'A16_23' => 'main_applicant.residence_history_4.city',
            'A16_24' => 'main_applicant.residence_history_4.from',
            'A16_25' => 'main_applicant.residence_history_4.to',
            'A16_26' => 'main_applicant.residence_history_4.purpose',
            'A16_27' => 'main_applicant.residence_history_4.status',
            'A16_28' => 'main_applicant.residence_history_4.address',
            // row 5
            'A16_29' => 'main_applicant.residence_history_5.country',
            'A16_30' => 'main_applicant.residence_history_5.city',
            'A16_31' => 'main_applicant.residence_history_5.from',
            'A16_32' => 'main_applicant.residence_history_5.to',
            'A16_33' => 'main_applicant.residence_history_5.purpose',
            'A16_34' => 'main_applicant.residence_history_5.status',
            'A16_35' => 'main_applicant.residence_history_5.address',

            // ── Part A continued (page 4) ─────────────────────────────────
            // A17 = residential address (7 lines)
            'A17_1' => 'main_applicant.address_residential.line_1',
            'A17_2' => 'main_applicant.address_residential.line_2',
            'A17_3' => 'main_applicant.address_residential.city',
            'A17_4' => 'main_applicant.address_residential.state_province',
            'A17_5' => 'main_applicant.address_residential.postal_code',
            'A17_6' => 'main_applicant.address_residential.country',
            'A17_7' => 'main_applicant.phone_home',
            // A18 = mailing address
            'A18_1' => 'main_applicant.address_mailing.line_1',
            'A18_2' => 'main_applicant.address_mailing.line_2',
            'A18_3' => 'main_applicant.address_mailing.city',
            'A18_4' => 'main_applicant.address_mailing.state_province',
            'A18_5' => 'main_applicant.address_mailing.postal_code',
            'A18_6' => 'main_applicant.address_mailing.country',
            'A18_7' => 'main_applicant.fax',
            'A19' => 'main_applicant.email',
            'A20' => 'main_applicant.phone_mobile',
            'A21' => 'main_applicant.phone_work',
            'A22' => 'main_applicant.occupation',
            'A23' => 'main_applicant.employer_name',
            'A24' => 'main_applicant.employer_address',
            'A25' => 'main_applicant.employer_city',
            'A26' => 'main_applicant.employer_country',
            'A27' => 'main_applicant.employment_status',
            'A28' => 'main_applicant.source_of_funds',
            // A29 = date range for current employment
            'A29_1' => 'main_applicant.employment_from',
            'A29_2' => 'main_applicant.employment_from',
            'A29_3' => 'main_applicant.employment_from',
            // A30 = date range end
            'A30_1' => 'main_applicant.employment_to',
            'A30_2' => 'main_applicant.employment_to',
            'A30_3' => 'main_applicant.employment_to',
            'A31' => 'main_applicant.net_worth',
            'A32' => 'main_applicant.annual_income',
            'A33' => 'main_applicant.source_of_funds',
            // A35 = employment history table (21 rows)
            'A35_1' => 'main_applicant.employment_history_1.employer',
            'A35_2' => 'main_applicant.employment_history_1.position',
            'A35_3' => 'main_applicant.employment_history_1.from',
            'A35_4' => 'main_applicant.employment_history_1.to',
            'A35_5' => 'main_applicant.employment_history_1.country',
            'A35_6' => 'main_applicant.employment_history_1.reason_leaving',
            'A35_7' => 'main_applicant.employment_history_2.employer',
            'A35_8' => 'main_applicant.employment_history_2.position',
            'A35_9' => 'main_applicant.employment_history_2.from',
            'A35_10' => 'main_applicant.employment_history_2.to',
            'A35_11' => 'main_applicant.employment_history_2.country',
            'A35_12' => 'main_applicant.employment_history_2.reason_leaving',
            'A35_13' => 'main_applicant.employment_history_3.employer',
            'A35_14' => 'main_applicant.employment_history_3.position',
            'A35_15' => 'main_applicant.employment_history_3.from',
            'A35_16' => 'main_applicant.employment_history_3.to',
            'A35_17' => 'main_applicant.employment_history_3.country',
            'A35_18' => 'main_applicant.employment_history_3.reason_leaving',
            'A35_19' => 'main_applicant.employment_history_4.employer',
            'A35_20' => 'main_applicant.employment_history_4.position',
            'A35_21' => 'main_applicant.employment_history_4.from',

            // ── Part B: spouse information (page 5) ───────────────────────
            'B36' => 'spouse.surname',
            'B37' => 'spouse.given_name',
            'B38' => 'spouse.gender',
            'B39' => 'spouse.dob',
            'B40' => 'spouse.place_of_birth',
            'B41' => 'spouse.nationality',
            'B42' => 'spouse.passport_1.number',
            'B43' => 'spouse.passport_1.country_of_issue',
            'B44' => 'spouse.passport_1.date_of_expiry',
            // B45 = spouse passport 2 or other IDs
            'B45_1' => 'spouse.passport_2.number',
            'B45_2' => 'spouse.passport_2.country_of_issue',
            'B45_3' => 'spouse.passport_2.date_of_issue',
            'B45_4' => 'spouse.passport_2.date_of_expiry',
            'B45_5' => 'spouse.national_id_number',
            'B45_6' => 'spouse.national_id_country',
            'B46' => 'spouse.marital_status',
            'B47' => 'spouse.email',
            'B48' => 'spouse.phone_mobile',
            'B49' => 'spouse.occupation',
            'B50' => 'spouse.employer_name',
            'B51' => 'spouse.employer_address',
            'B52' => 'spouse.source_of_funds',
            // B53 = spouse residential address
            'B53_1' => 'spouse.address_residential.line_1',
            'B53_2' => 'spouse.address_residential.city',
            'B53_3' => 'spouse.address_residential.state_province',
            'B53_4' => 'spouse.address_residential.postal_code',
            'B53_5' => 'spouse.address_residential.country',
            // B54 = spouse residence history (9 rows)
            'B54_1' => 'spouse.residence_history_1.country',
            'B54_2' => 'spouse.residence_history_1.city',
            'B54_3' => 'spouse.residence_history_1.from',
            'B54_4' => 'spouse.residence_history_1.to',
            'B54_5' => 'spouse.residence_history_2.country',
            'B54_6' => 'spouse.residence_history_2.city',
            'B54_7' => 'spouse.residence_history_2.from',
            'B54_8' => 'spouse.residence_history_2.to',
            'B54_9' => 'spouse.residence_history_2.purpose',

            // ── Part B continued (page 6) ──────────────────────────────────
            // B55 = spouse employment
            'B55_1' => 'spouse.employer_name',
            'B55_2' => 'spouse.occupation',
            'B55_3' => 'spouse.employment_from',
            'B55_4' => 'spouse.employment_to',
            // B56 = spouse employment history
            'B56_1' => 'spouse.employment_history_1.employer',
            'B56_2' => 'spouse.employment_history_1.position',
            'B56_3' => 'spouse.employment_history_1.from',
            'B56_4' => 'spouse.employment_history_1.to',
            'B56_5' => 'spouse.employment_history_1.country',
            'B56_6' => 'spouse.employment_history_2.employer',
            'B56_7' => 'spouse.employment_history_2.position',
            'B56_8' => 'spouse.employment_history_2.from',
            'B56_9' => 'spouse.employment_history_2.to',
            'B56_10' => 'spouse.employment_history_2.country',
            'B56_11' => 'spouse.employment_history_3.employer',
            'B56_12' => 'spouse.employment_history_3.position',
            'B56_13' => 'spouse.employment_history_3.from',
            'B56_14' => 'spouse.employment_history_3.to',
            'B56_15' => 'spouse.employment_history_3.country',
            'B56_16' => 'spouse.employment_history_4.employer',
            'B56_17' => 'spouse.employment_history_4.position',
            'B56_18' => 'spouse.employment_history_4.from',
            'B56_19' => 'spouse.employment_history_4.to',
            'B56_20' => 'spouse.employment_history_4.country',
        ];
    }

    /** @return array<string,string> */
    private static function formD2(): array
    {
        return [
            'Surname' => 'main_applicant.surname',
            'Firstname' => 'main_applicant.given_name',
            'Date of birth' => 'main_applicant.dob',
            'Place and country of birth' => 'main_applicant.place_of_birth',
            'Passport number' => 'main_applicant.passport_1.number',
            'Passport issuing country' => 'main_applicant.passport_1.country_of_issue',
            'Address_1' => 'main_applicant.address_residential.line_1',
            'Addres_2' => 'main_applicant.address_residential.line_2',
            'DATE AND PLACE' => 'application.date',
            'Designation' => 'main_applicant.occupation',
        ];
    }

    /** @return array<string,string> */
    private static function formD4(): array
    {
        return [
            'PART I Details of the Main Applicant' => 'main_applicant.surname',
            'I the undersigned' => 'main_applicant.given_name',
            'Passport Number' => 'main_applicant.passport_1.number',
            'Date of Birth' => 'main_applicant.dob',
            'Country of Residence' => 'main_applicant.address_residential.country',
            'Gender' => 'main_applicant.gender',
            'place of issue' => 'main_applicant.passport_1.place_of_issue',
            'Place and Date' => 'application.date',
            'USD' => 'investment.amount',
            // Dependents/family members listed in the declaration
            'Full Name_3' => 'spouse.given_name',
            'Full Name_4' => 'dependent_1.given_name',
            'Fulla Name_5' => 'dependent_2.given_name',
            'Full Name_6' => 'dependent_3.given_name',
            'Full Name_7' => 'dependent_4.given_name',
            'Full Name_8' => 'dependent_1.surname',
            'Fulla Name_9' => 'dependent_2.surname',
            'Date of Birth_10' => 'spouse.dob',
            'Date of Birth_11' => 'dependent_1.dob',
            'Date of Birth_12' => 'dependent_2.dob',
            'Date of Birth_13' => 'dependent_3.dob',
            'Date of Birth_14' => 'dependent_4.dob',
            'Date of Birth_15' => 'dependent_1.dob',
            'Date of Birth_16' => 'dependent_2.dob',
            'Relationship_17' => 'spouse.relationship',
            'Relationship_18' => 'dependent_1.relationship',
            'Relationship_19' => 'dependent_2.relationship',
            'Relationship_20' => 'dependent_3.relationship',
            'Relationship_21' => 'dependent_4.relationship',
            'Relationship_22' => 'dependent_1.relationship',
            'Relationship_23' => 'dependent_2.relationship',
        ];
    }
}
