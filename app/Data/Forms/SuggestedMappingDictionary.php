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
            'form_d3' => self::formD3(),
            'form_d4' => self::formD4(),
            'affidavit_sd' => self::affidavitSd(),
            'e_passport_application' => self::ePassportApplication(),
            default => [],
        };
    }

    /** @return array<string,string> */
    private static function formD1(): array
    {
        return [
            // ── Cover page ────────────────────────────────────────────────
            'Surname / Family Name' => 'main_applicant.surname',
            'First  / Given name' => 'main_applicant.given_name',
            'Passport Number' => 'main_applicant.passport_1.number',
            'Country of issue' => 'main_applicant.passport_1.issuing_country',
            'Date of birth' => 'main_applicant.dob',
            'REFERENCE NUMBER' => 'agent.reference_number',
            'DATE RECEIVED' => 'agent.date_received',
            "AUTHORIZED AGENT'S NUMBER" => 'agent.authorized_agent_number',

            // ── Part A: personal (page 3) ─────────────────────────────────
            'A1' => 'main_applicant.surname',
            'A2' => 'main_applicant.given_name',
            'A3' => 'main_applicant.middle_name',
            'A4' => 'main_applicant.other_names',
            'A5_1' => 'main_applicant.dob',
            'A5_2' => 'main_applicant.dob',
            'A5_3' => 'main_applicant.dob',
            'A6' => 'main_applicant.gender',
            'A7' => 'main_applicant.country_of_birth',
            'A8' => 'main_applicant.citizenship',
            // A9 = other citizenships list
            'A9_1' => 'main_applicant.other_citizenship_details',
            'A10' => 'main_applicant.name_local_characters',
            'A11' => 'main_applicant.mothers_maiden_name',
            // A12 = main passport (number, country, issue date, expiry)
            'A12_1' => 'main_applicant.passport_1.number',
            'A12_2' => 'main_applicant.passport_1.issuing_country',
            'A12_3' => 'main_applicant.passport_1.issue_date',
            'A12_4' => 'main_applicant.passport_1.expiry_date',
            // A13 = national ID (two rows)
            'A13_1' => 'main_applicant.national_id_number',
            'A13_2' => 'main_applicant.national_id_country',
            'A13_3' => 'main_applicant.national_id_number',
            'A13_4' => 'main_applicant.national_id_country',
            // A14 = other citizenship checkbox + driver's licence
            'A14_1' => 'main_applicant.other_citizenship',
            'A14_2' => 'main_applicant.drivers_licence_number',
            'A14_3' => 'main_applicant.drivers_licence_country',
            // A15 = dependants list header / cover field
            'A15' => 'dependent_1.full_name',
            // A16 = dependants rows (2 per row: full_name, dob, relationship, citizenship, passport_number)
            'A16_1' => 'dependent_1.full_name',
            'A16_2' => 'dependent_1.dob',
            'A16_3' => 'dependent_1.relationship',
            'A16_4' => 'dependent_1.citizenship',
            'A16_5' => 'dependent_1.passport_number',
            'A16_6' => 'dependent_2.full_name',
            'A16_7' => 'dependent_2.dob',
            'SPONSORED?' => 'agent.sponsored',

            // ── Part A: address & contact (page 4) ───────────────────────
            'A17_1' => 'main_applicant.current_address.street',
            'A18_1' => 'main_applicant.permanent_address.street',
            'A19' => 'main_applicant.phone_home',
            'A20' => 'main_applicant.phone_mobile',
            'A21' => 'main_applicant.email',
            'A22' => 'main_applicant.current_address.city',
            'A23' => 'main_applicant.current_address.state',
            'A24' => 'main_applicant.current_address.country',
            'A25' => 'main_applicant.current_address.postal_code',
            'A26' => 'main_applicant.eye_colour',
            'A27' => 'main_applicant.military_served',
            'A28' => 'main_applicant.permanent_address.city',
            'A29_1' => 'main_applicant.permanent_address.state',
            'A30_1' => 'main_applicant.permanent_address.country',
            'A31' => 'main_applicant.permanent_address.postal_code',
            'A32' => 'main_applicant.height_cm',
            'A33' => 'main_applicant.hair_colour',
            // A34 = military details
            'A34' => 'main_applicant.military_arrested',
            'A34_2' => 'main_applicant.military_branch',
            'A34_3' => 'main_applicant.military_rank_at_separation',
            'A34_4' => 'main_applicant.military_type_of_discharge',
            'A34_5' => 'main_applicant.military_serial_number',

            // ── Part B: employment & financial (pages 5–6) ───────────────
            'B36' => 'main_applicant.occupation',
            'B37' => 'main_applicant.occupation_by_training',
            'B38' => 'main_applicant.self_employed',
            'B39' => 'main_applicant.employer_name',
            'B40' => 'main_applicant.employer_nature',
            'B41' => 'main_applicant.employer_address',
            'B42' => 'main_applicant.employer_phone',
            'B43' => 'main_applicant.employer_incorporation_country',
            'B44' => 'main_applicant.employer_website',
            'B46' => 'main_applicant.disciplinary_action',
            'B46_2' => 'main_applicant.disciplinary_action_details',
            'B47' => 'main_applicant.directorships',
            'B48' => 'main_applicant.annual_income_usd',
            'B49' => 'main_applicant.net_worth_usd',
            'B50' => 'main_applicant.income_sources',
            'B51' => 'main_applicant.business_geographies',
            'B52' => 'main_applicant.key_business_counterparties',
            // B55 = bank account details
            'B55_1' => 'main_applicant.bank_account_holder',
            'B55_2' => 'main_applicant.bank_account_number',
            'B55_3' => 'main_applicant.bank_iban_bic',
            'B55_4' => 'main_applicant.bank_name_address',

            // ── Part C: family members (pages 7–9) ───────────────────────
            // C58 = marital status
            'C58' => 'main_applicant.marital_status',
            // C59 = marriage date/place, C60–C68 = spouse
            'C59_1' => 'spouse.marriage_date',
            'C59_2' => 'spouse.marriage_place',
            'C60' => 'spouse.surname',
            'C61' => 'spouse.given_name',
            'C62' => 'spouse.place_of_birth',
            'C63' => 'spouse.citizenship',
            'C64_1' => 'spouse.passport_number',
            'C64_2' => 'spouse.phone_home',
            'C64_3' => 'spouse.phone_work',
            'C64_4' => 'spouse.phone_mobile',
            'C65' => 'spouse.occupation',
            'C66' => 'spouse.employer',
            'C67_1' => 'spouse.residential_address.street',
            'C67_2' => 'spouse.residential_address.city',
            'C67_3' => 'spouse.residential_address.state',
            'C67_4' => 'spouse.residential_address.country',
            'C67_5' => 'spouse.residential_address.postal_code',
            'C68_1' => 'spouse.employer_address.street',
            'C68_2' => 'spouse.employer_address.city',
            'C68_3' => 'spouse.employer_address.state',
            'C68_4' => 'spouse.employer_address.country',
            'C68_5' => 'spouse.employer_address.postal_code',
            // C69 = father
            'C69' => 'father.included_in_application',
            'C69_A' => 'father.surname',
            'C69_B' => 'father.given_name',
            'C69_C1' => 'father.dob',
            'C69_D' => 'father.place_of_birth',
            'C69_E' => 'father.citizenship',
            'C69_F' => 'father.residential_address',
            'C69_G' => 'father.occupation',
            // C70 = mother
            'C70' => 'mother.included_in_application',
            'C70_A' => 'mother.surname',
            'C70_B' => 'mother.given_name',
            'C70_C1' => 'mother.dob',
            'C70_D' => 'mother.place_of_birth',
            'C70_E' => 'mother.citizenship',
            'C70_F' => 'mother.residential_address',
            'C70_G' => 'mother.occupation',
            // C71 = father-in-law
            'C71' => 'father_in_law.included_in_application',
            'C71_A' => 'father_in_law.surname',
            'C71_B' => 'father_in_law.given_name',
            'C71_C1' => 'father_in_law.dob',
            'C71_D' => 'father_in_law.place_of_birth',
            'C71_E' => 'father_in_law.citizenship',
            'C71_F' => 'father_in_law.residential_address',
            // C72 = siblings (4 rows of 8 fields + gender checkbox)
            'C72_1' => 'sibling_1.surname',
            'C72_2' => 'sibling_1.given_name',
            'C72_3' => 'sibling_1.gender',
            'C72_4' => 'sibling_1.dob',
            'C72_5' => 'sibling_1.place_of_birth',
            'C72_6' => 'sibling_1.citizenship',
            'C72_7' => 'sibling_1.residential_address',
            'C72_8' => 'sibling_1.occupation',
            'C72_9' => 'sibling_2.surname',
            'C72_10' => 'sibling_2.given_name',
            'C72_11' => 'sibling_2.gender',
            'C72_12' => 'sibling_2.dob',
            'C72_13' => 'sibling_2.place_of_birth',
            'C72_14' => 'sibling_2.citizenship',
            'C72_15' => 'sibling_2.residential_address',
            'C72_16' => 'sibling_2.occupation',
            'C72_17' => 'sibling_3.surname',
            'C72_18' => 'sibling_3.given_name',
            'C72_19' => 'sibling_3.gender',
            'C72_20' => 'sibling_3.dob',
            'C72_21' => 'sibling_3.place_of_birth',
            'C72_22' => 'sibling_3.citizenship',
            'C72_23' => 'sibling_3.residential_address',
            'C72_24' => 'sibling_3.occupation',
            'C72_25' => 'sibling_4.surname',
            'C72_26' => 'sibling_4.given_name',
            'C72_27' => 'sibling_4.gender',
            'C72_28' => 'sibling_4.dob',
            'C72_29' => 'sibling_4.place_of_birth',
            'C72_30' => 'sibling_4.citizenship',
            'C72_31' => 'sibling_4.residential_address',
            'C72_32' => 'sibling_4.occupation',
            // C73 = mother-in-law
            'C73' => 'mother_in_law.included_in_application',
            'C73_A' => 'mother_in_law.surname',
            'C73_B' => 'mother_in_law.given_name',
            'C73_C1' => 'mother_in_law.dob',
            'C73_D' => 'mother_in_law.place_of_birth',
            'C73_E' => 'mother_in_law.citizenship',
            'C73_F' => 'mother_in_law.residential_address',
            // C74 = children (6 rows of 9 fields + gender/included checkboxes)
            'C74_1' => 'child_1.surname',
            'C74_2' => 'child_1.given_name',
            'C74_3' => 'child_1.gender',
            'C74_4' => 'child_1.dob',
            'C74_5' => 'child_1.place_of_birth',
            'C74_6' => 'child_1.citizenship',
            'C74_7' => 'child_1.residential_address',
            'C74_8' => 'child_1.occupation',
            'C74_11' => 'child_1.included_in_application',
            'C74_12' => 'child_2.surname',
            'C74_13' => 'child_2.given_name',
            'C74_14' => 'child_2.gender',
            'C74_15' => 'child_2.dob',
            'C74_16' => 'child_2.place_of_birth',
            'C74_17' => 'child_2.citizenship',
            'C74_18' => 'child_2.residential_address',
            'C74_19' => 'child_2.occupation',
            'C74_22' => 'child_2.included_in_application',
            'C74_23' => 'child_3.surname',
            'C74_24' => 'child_3.given_name',
            'C74_25' => 'child_3.gender',
            'C74_26' => 'child_3.dob',
            'C74_27' => 'child_3.place_of_birth',
            'C74_28' => 'child_3.citizenship',
            'C74_29' => 'child_3.residential_address',
            'C74_30' => 'child_3.occupation',
            'C74_33' => 'child_3.included_in_application',
            'C74_34' => 'child_4.surname',
            'C74_35' => 'child_4.given_name',
            'C74_36' => 'child_4.gender',
            'C74_37' => 'child_4.dob',
            'C74_38' => 'child_4.place_of_birth',
            'C74_39' => 'child_4.citizenship',
            'C74_40' => 'child_4.residential_address',
            'C74_41' => 'child_4.occupation',
            'C74_44' => 'child_4.included_in_application',
            'C74_45' => 'child_5.surname',
            'C74_46' => 'child_5.given_name',
            'C74_47' => 'child_5.gender',
            'C74_48' => 'child_5.dob',
            'C74_49' => 'child_5.place_of_birth',
            'C74_50' => 'child_5.citizenship',
            'C74_51' => 'child_5.residential_address',
            'C74_52' => 'child_5.occupation',
            'C74_55' => 'child_5.included_in_application',
            'C74_56' => 'child_6.surname',
            'C74_57' => 'child_6.given_name',
            'C74_58' => 'child_6.gender',
            'C74_59' => 'child_6.dob',
            'C74_60' => 'child_6.place_of_birth',
            'C74_61' => 'child_6.citizenship',
            'C74_62' => 'child_6.residential_address',
            'C74_63' => 'child_6.occupation',
            'C74_66' => 'child_6.included_in_application',

            // ── Part D: background declarations (page 10) ────────────────
            'D75' => 'declaration.arrested_or_convicted',
            'D76' => 'declaration.testified_grand_jury',
            'D77' => 'declaration.charges_illegal_activity',
            'D78' => 'declaration.sentenced_detention',
            'D79' => 'declaration.received_pardon',
            'D80' => 'declaration.record_expunged',
            'D81' => 'declaration.subpoenaed',
            'D82' => 'declaration.unindicted_co_party',
            'D83' => 'declaration.party_to_lawsuit',
            'D84' => 'declaration.terrorism_financing',
            'D85' => 'declaration.under_investigation',
            'D86' => 'declaration.bankruptcy_insolvency',
            'D87' => 'declaration.visa_refused_deported',
            'D88' => 'declaration.visa_cancelled',
            'D89' => 'declaration.citizenship_refused',
            'D90' => 'declaration.professional_bar',
            'D91' => 'declaration.pep',
            'D91_1' => 'declaration.yes_details',

            // ── Character references (page 11) ────────────────────────────
            'D92_1' => 'reference_1.full_name',
            'D92_2' => 'reference_1.street_address',
            'D92_3' => 'reference_1.city_state',
            'D92_4' => 'reference_1.country_postal',
            'D92_5' => 'reference_1.phone_home',
            'D92_6' => 'reference_1.phone_work',
            'D92_7' => 'reference_1.phone_mobile',
            'D92_8' => 'reference_1.email',
            'D92_9' => 'reference_1.years_known',
            'D92_10' => 'reference_1.occupation',
            'D92_11' => 'reference_1.employer',
            'D92_12' => 'reference_2.full_name',
            'D92_13' => 'reference_2.street_address',
            'D92_14' => 'reference_2.city_state',
            'D92_15' => 'reference_2.country_postal',
            'D92_16' => 'reference_2.phone_home',
            'D92_17' => 'reference_2.phone_work',
            'D92_18' => 'reference_2.phone_mobile',
            'D92_19' => 'reference_2.email',
            'D92_20' => 'reference_2.years_known',
            'D92_21' => 'reference_2.occupation',
            'D92_22' => 'reference_2.employer',
        ];
    }

    /** @return array<string,string> */
    private static function formD2(): array
    {
        return [
            'Surname' => 'main_applicant.surname',
            'Firstname' => 'main_applicant.given_name',
            'Date of birth' => 'main_applicant.dob',
            'Passport number' => 'main_applicant.passport_1.number',
            'Passport issuing country' => 'main_applicant.passport_1.issuing_country',
            'Place and country of birth' => 'main_applicant.country_of_birth',
            'Address_1' => 'main_applicant.current_address.street',
            'DATE AND PLACE' => 'application.sign_date',
            'Officers full name' => 'medical.examiner_full_name',
            'Designation' => 'medical.examiner_designation',
            'Addres_2' => 'medical.examiner_organisation_address',
        ];
    }

    /** @return array<string,string> */
    private static function formD3(): array
    {
        return [
            'Full Name' => 'main_applicant.surname',
            'Residential Address' => 'main_applicant.current_address.street',
            'Country of Residence' => 'main_applicant.current_address.country',
            'Date of Birth' => 'main_applicant.dob',
            'Passport Number / National ID' => 'main_applicant.passport_1.number',
            'Date and place of issue' => 'main_applicant.passport_1.issue_date',
            'Occupation' => 'main_applicant.occupation',
            'Height (cm)' => 'main_applicant.height_cm',
            'Maritial Status' => 'main_applicant.marital_status',
            'Weight (kg)' => 'main_applicant.weight_kg',
            'Email Address' => 'main_applicant.email',
            'Check Box15' => 'medical.health_problems_yn',
            'Check Box16' => 'medical.health_problems_yn',
            'Do you currently have any health problems?' => 'medical.health_problems_details',
            'Check Box18' => 'medical.hospitalised_yn',
            'Check Box20' => 'medical.hospitalised_yn',
            'Have you ever been hospitalised?' => 'medical.hospitalised_details',
            'Check Box21' => 'medical.doctor_visit_3yr_yn',
            'Check Box22' => 'medical.doctor_visit_3yr_yn',
            'Have you visited a doctor in the last three (3) years?' => 'medical.doctor_visit_details',
            'Final Evaluation' => 'medical.final_evaluation',
            'Full Name of Medical Examiner' => 'medical.examiner_full_name',
            'Organisation Address' => 'medical.examiner_organisation_address',
            'Telephone No' => 'medical.examiner_telephone',
            'Fax No' => 'medical.examiner_fax',
            'Email Address_1' => 'medical.examiner_email',
            'Date of Examination' => 'medical.examination_date',
            'Place of Examination' => 'medical.examination_place',
            'Examiners license number' => 'medical.examiner_licence_number',
            'Examiners designation' => 'medical.examiner_designation',
        ];
    }

    /** @return array<string,string> */
    private static function formD4(): array
    {
        return [
            'PART I Details of the Main Applicant' => 'main_applicant.surname',
            'I the undersigned' => 'main_applicant.surname',
            'Country of Residence' => 'main_applicant.current_address.country',
            'Date of Birth' => 'main_applicant.dob',
            'Passport Number' => 'main_applicant.passport_1.number',
            'place of issue' => 'main_applicant.passport_1.issuing_country',
            'Full Name_3' => 'dependent_1.full_name',
            'Date of Birth_10' => 'dependent_1.dob',
            'Relationship_17' => 'dependent_1.relationship',
            'Full Name_4' => 'dependent_2.full_name',
            'Date of Birth_11' => 'dependent_2.dob',
            'Relationship_18' => 'dependent_2.relationship',
            'USD' => 'investment.amount_usd',
            'Place and Date' => 'application.sign_place',
        ];
    }

    /** @return array<string,string> */
    private static function affidavitSd(): array
    {
        return [
            'PART I Details of the Main Applicant' => 'main_applicant.surname',
            'Country of Residence' => 'main_applicant.current_address.country',
            'Date of Birth' => 'main_applicant.dob',
            'Passport Number' => 'main_applicant.passport_1.number',
            'USD' => 'investment.amount_usd',
            'Place and Date' => 'application.sign_place',
        ];
    }

    /** @return array<string,string> */
    private static function ePassportApplication(): array
    {
        return [
            'Surname' => 'main_applicant.surname',
            'Maiden Surname' => 'main_applicant.maiden_surname',
            'Given Names' => 'main_applicant.given_name',
            'Other Title' => 'main_applicant.title',
            'Date of Birth' => 'main_applicant.dob',
            'Original name/Aliases/Nicknames' => 'main_applicant.original_name_aliases',
            'City of Birth' => 'main_applicant.place_of_birth',
            'Country of Birth' => 'main_applicant.country_of_birth',
            'Eye Colour' => 'main_applicant.eye_colour',
            'Hair Colour' => 'main_applicant.hair_colour',
            'Height (feet)' => 'main_applicant.height_feet',
            'Height (inches)' => 'main_applicant.height_inches',
            'Visible identification marks (in detail)' => 'main_applicant.distinguishing_marks',
            'Profession/Occupation/Designation' => 'main_applicant.occupation',
            'Dominica Phone No' => 'main_applicant.phone_dominica',
            'Overseas Phone No' => 'main_applicant.phone_mobile',
            'Email' => 'main_applicant.email',
            'Street/Village' => 'main_applicant.current_address.street',
            'P.O. Box' => 'main_applicant.current_address.street',
            'City' => 'main_applicant.current_address.city',
            'State/Parish/Region' => 'main_applicant.current_address.state',
            'Zip/Postal Code' => 'main_applicant.current_address.postal_code',
            'Country' => 'main_applicant.current_address.country',
            'Document No' => 'passport_app.citizenship_doc_no',
            'Issue Place' => 'passport_app.citizenship_issue_place',
            'Registration Date' => 'passport_app.citizenship_registration_date',
            'Nationality' => 'main_applicant.citizenship',
            'Document Issue Date' => 'main_applicant.passport_1.issue_date',
            'Document Expiry Date' => 'main_applicant.passport_1.expiry_date',
            'Spouses Surname' => 'spouse.surname',
            'Spouses Given Names' => 'spouse.given_name',
            'Marriage Place' => 'spouse.marriage_place',
            'Marriage Date' => 'spouse.marriage_date',
            'Travel Document No' => 'passport_app.travel_doc_no',
            'Recommender Surname' => 'passport_app.recommender_surname',
            'Recommender Given Names' => 'passport_app.recommender_given_names',
            'Address_2' => 'passport_app.recommender_address',
            'Phone No_3' => 'passport_app.recommender_phone',
            'Email_3' => 'passport_app.recommender_email',
            'Profession' => 'passport_app.recommender_profession',
            'Years known' => 'passport_app.recommender_years_known',
            'Supplemental Comments' => 'passport_app.supplemental_comments',
            'Submitter Surname' => 'passport_app.submitter_surname',
            'Submitter Given Names' => 'passport_app.submitter_given_names',
            'ID Type' => 'passport_app.submitter_id_type',
            'ID No' => 'passport_app.submitter_id_number',
        ];
    }
}
