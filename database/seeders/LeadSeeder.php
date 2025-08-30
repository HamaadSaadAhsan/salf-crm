<?php

namespace Database\Seeders;

use App\Models\Lead;
use App\Models\Service;
use App\Models\LeadSource;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class LeadSeeder extends Seeder
{
    private array $firstNames = [
        'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
        'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
        'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Nancy', 'Daniel', 'Lisa',
        'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra', 'Donald', 'Donna',
        'Steven', 'Carol', 'Paul', 'Ruth', 'Andrew', 'Sharon', 'Kenneth', 'Michelle',
        'Ahmed', 'Fatima', 'Mohammed', 'Aisha', 'Ali', 'Khadija', 'Omar', 'Zainab',
        'Hassan', 'Maryam', 'Ibrahim', 'Amina', 'Yusuf', 'Layla', 'Abdul', 'Nour',
        'Raj', 'Priya', 'Amit', 'Anita', 'Vikram', 'Sonia', 'Ravi', 'Kavita',
        'Chen', 'Li', 'Wang', 'Zhang', 'Liu', 'Yang', 'Huang', 'Zhao',
        'Vladimir', 'Olga', 'Dmitri', 'Natasha', 'Sergei', 'Elena', 'Igor', 'Irina'
    ];

    private array $lastNames = [
        'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
        'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
        'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
        'Al-Rahman', 'Al-Mahmoud', 'Al-Zahra', 'Al-Hassan', 'Al-Hussein', 'Al-Rashid',
        'Sharma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Agarwal', 'Joshi', 'Mehta',
        'Chen', 'Wang', 'Li', 'Zhang', 'Liu', 'Yang', 'Huang', 'Zhao',
        'Petrov', 'Ivanov', 'Smirnov', 'Kuznetsov', 'Popov', 'Volkov', 'Novikov', 'Fedorov'
    ];

    private array $occupations = [
        'CEO', 'Business Owner', 'Entrepreneur', 'Investment Manager', 'Real Estate Developer',
        'Technology Executive', 'Medical Doctor', 'Lawyer', 'Architect', 'Engineer',
        'Financial Advisor', 'Consultant', 'Director', 'Vice President', 'General Manager',
        'Surgeon', 'Dentist', 'Pharmacist', 'Professor', 'Researcher',
        'Investment Banker', 'Private Equity', 'Hedge Fund Manager', 'Venture Capitalist',
        'IT Director', 'Software Executive', 'Product Manager', 'Chief Technology Officer',
        'Marketing Director', 'Sales Director', 'Operations Manager', 'Project Manager'
    ];

    private array $countries = [
        ['code' => 'US', 'name' => 'United States', 'cities' => ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami']],
        ['code' => 'GB', 'name' => 'United Kingdom', 'cities' => ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Edinburgh']],
        ['code' => 'DE', 'name' => 'Germany', 'cities' => ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne']],
        ['code' => 'FR', 'name' => 'France', 'cities' => ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice']],
        ['code' => 'RU', 'name' => 'Russia', 'cities' => ['Moscow', 'St. Petersburg', 'Novosibirsk', 'Yekaterinburg', 'Kazan']],
        ['code' => 'CN', 'name' => 'China', 'cities' => ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu']],
        ['code' => 'IN', 'name' => 'India', 'cities' => ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata']],
        ['code' => 'AE', 'name' => 'UAE', 'cities' => ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Fujairah']],
        ['code' => 'SA', 'name' => 'Saudi Arabia', 'cities' => ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam']],
        ['code' => 'BR', 'name' => 'Brazil', 'cities' => ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza']],
        ['code' => 'CA', 'name' => 'Canada', 'cities' => ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa']],
        ['code' => 'AU', 'name' => 'Australia', 'cities' => ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide']],
    ];

    private array $emailDomains = [
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
        'company.com', 'business.co.uk', 'enterprise.de', 'corporation.fr', 'group.ae',
        'holdings.com', 'investments.com', 'capital.com', 'ventures.com', 'properties.com'
    ];

    public function run(): void
    {
        // Get available services and lead sources
        $services = Service::whereNotNull('parent_id')->pluck('id')->toArray();
        $leadSources = LeadSource::pluck('id')->toArray();
        $users = User::pluck('id')->toArray();

        if (empty($services) || empty($leadSources)) {
            $this->command->warn('Please run ServiceSeeder and LeadSourceSeeder first');
            return;
        }

        $this->command->info('Creating sample leads...');

        // Track used emails and external IDs to prevent duplicates
        // First, get all existing emails and external IDs from the database
        $usedEmails = Lead::pluck('email')->toArray();
        $usedExternalIds = Lead::whereNotNull('external_id')->pluck('external_id')->toArray();

        $existingLeadsCount = count($usedEmails);
        $this->command->info('There are already ' . $existingLeadsCount . ' leads in the database.');

        $leadCounter = 1;

        // Create leads in batches for better performance
        $batchSize = 50;
        // Default to creating 1000 leads, but this can be adjusted as needed
        $leadsToCreate = 1000;
        $totalLeads = $leadsToCreate;

        $this->command->info("Creating {$totalLeads} new leads...");

        // Calculate number of full batches and the remainder
        $fullBatches = floor($totalLeads / $batchSize);
        $remainder = $totalLeads % $batchSize;

        // Process full batches
        for ($batch = 0; $batch < $fullBatches; $batch++) {
            $leads = [];

            for ($i = 0; $i < $batchSize; $i++) {
                $country = $this->countries[array_rand($this->countries)];
                $city = $country['cities'][array_rand($country['cities'])];
                $firstName = $this->firstNames[array_rand($this->firstNames)];
                $lastName = $this->lastNames[array_rand($this->lastNames)];
                $fullName = $firstName . ' ' . $lastName;

                // Generate unique email
                $emailDomain = $this->emailDomains[array_rand($this->emailDomains)];
                $email = $this->generateUniqueEmail($firstName, $lastName, $emailDomain, $usedEmails, $leadCounter);

                // Generate phone with country-specific format
                $phone = $this->generatePhone($country['code']);

                // Random coordinates near the city (approximate)
                $coordinates = $this->getCityCoordinates($city);

                $occupation = $this->occupations[array_rand($this->occupations)];

                // Generate budget based on service type and occupation
                $budget = $this->generateBudget($occupation);

                // Random inquiry details
                $inquiryDetails = $this->generateInquiryDetail($country['name']);

                // Custom fields relevant to citizenship/investment programs
                $customFields = $this->generateCustomFields();

                // Random status with realistic distribution
                $inquiryStatus = $this->getRandomStatus();
                $priority = $this->getRandomPriority();
                $inquiryType = $this->getRandomInquiryType();

                // Random assignment (70% assigned)
                $assignedTo = (rand(1, 10) <= 7 && !empty($users)) ? $users[array_rand($users)] : null;
                $assignedDate = $assignedTo ? $this->getRandomDate(30) : null;

                // Activity dates
                $createdAt = $this->getRandomDate(90);
                $lastActivityAt = $this->getRandomDateAfter($createdAt, 30);
                $nextFollowUpAt = $this->getNextFollowUpDate($inquiryStatus, $lastActivityAt);

                $leads[] = [
                    'id' => (string) \Illuminate\Support\Str::uuid(),
                    'name' => $fullName,
                    'email' => $email,
                    'phone' => $phone,
                    'occupation' => $occupation,
                    'address' => $this->generateAddress($city, $country['name']),
                    'country' => $country['code'],
                    'city' => $city,
                    'latitude' => $coordinates['lat'],
                    'longitude' => $coordinates['lng'],
                    'service_id' => $services[array_rand($services)],
                    'lead_source_id' => $leadSources[array_rand($leadSources)],
                    'detail' => $inquiryDetails,
                    'budget' => json_encode($budget),
                    'custom_fields' => json_encode($customFields),
                    'inquiry_status' => $inquiryStatus,
                    'priority' => $priority,
                    'inquiry_type' => $inquiryType,
                    'inquiry_country' => $country['code'],
                    'assigned_to' => $assignedTo,
                    'assigned_date' => $assignedDate,
                    'ticket_id' => rand(1, 10) <= 3 ? (string) \Illuminate\Support\Str::uuid() : null,
                    'ticket_date' => rand(1, 10) <= 3 ? $this->getRandomDate(60) : null,
                    'external_id' => $this->generateUniqueExternalId($email, $usedExternalIds, $leadCounter),
                    'lead_score' => $this->calculateLeadScore($occupation, $emailDomain, $phone, $budget),
                    'last_activity_at' => $lastActivityAt,
                    'next_follow_up_at' => $nextFollowUpAt,
                    'pending_activities_count' => rand(0, 5),
                    'created_by' => !empty($users) ? $users[array_rand($users)] : null,
                    'created_at' => $createdAt,
                    'updated_at' => $lastActivityAt,
                ];

                $leadCounter++;
            }

            // Insert batch
            DB::table('leads')->insert($leads);

            $this->command->info('Created batch ' . ($batch + 1) . ' of ' . $fullBatches);
        }

        // Process remainder batch if any
        if ($remainder > 0) {
            $leads = [];

            for ($i = 0; $i < $remainder; $i++) {
                $country = $this->countries[array_rand($this->countries)];
                $city = $country['cities'][array_rand($country['cities'])];
                $firstName = $this->firstNames[array_rand($this->firstNames)];
                $lastName = $this->lastNames[array_rand($this->lastNames)];
                $fullName = $firstName . ' ' . $lastName;

                // Generate unique email
                $emailDomain = $this->emailDomains[array_rand($this->emailDomains)];
                $email = $this->generateUniqueEmail($firstName, $lastName, $emailDomain, $usedEmails, $leadCounter);

                // Generate phone with country-specific format
                $phone = $this->generatePhone($country['code']);

                // Random coordinates near the city (approximate)
                $coordinates = $this->getCityCoordinates($city);

                $occupation = $this->occupations[array_rand($this->occupations)];

                // Generate budget based on service type and occupation
                $budget = $this->generateBudget($occupation);

                // Random inquiry details
                $inquiryDetails = $this->generateInquiryDetail($country['name']);

                // Custom fields relevant to citizenship/investment programs
                $customFields = $this->generateCustomFields();

                // Random status with realistic distribution
                $inquiryStatus = $this->getRandomStatus();
                $priority = $this->getRandomPriority();
                $inquiryType = $this->getRandomInquiryType();

                // Random assignment (70% assigned)
                $assignedTo = (rand(1, 10) <= 7 && !empty($users)) ? $users[array_rand($users)] : null;
                $assignedDate = $assignedTo ? $this->getRandomDate(30) : null;

                // Activity dates
                $createdAt = $this->getRandomDate(90);
                $lastActivityAt = $this->getRandomDateAfter($createdAt, 30);
                $nextFollowUpAt = $this->getNextFollowUpDate($inquiryStatus, $lastActivityAt);

                $leads[] = [
                    'id' => (string) \Illuminate\Support\Str::uuid(),
                    'name' => $fullName,
                    'email' => $email,
                    'phone' => $phone,
                    'occupation' => $occupation,
                    'address' => $this->generateAddress($city, $country['name']),
                    'country' => $country['code'],
                    'city' => $city,
                    'latitude' => $coordinates['lat'],
                    'longitude' => $coordinates['lng'],
                    'service_id' => $services[array_rand($services)],
                    'lead_source_id' => $leadSources[array_rand($leadSources)],
                    'detail' => $inquiryDetails,
                    'budget' => json_encode($budget),
                    'custom_fields' => json_encode($customFields),
                    'inquiry_status' => $inquiryStatus,
                    'priority' => $priority,
                    'inquiry_type' => $inquiryType,
                    'inquiry_country' => $country['code'],
                    'assigned_to' => $assignedTo,
                    'assigned_date' => $assignedDate,
                    'ticket_id' => rand(1, 10) <= 3 ? (string) \Illuminate\Support\Str::uuid() : null,
                    'ticket_date' => rand(1, 10) <= 3 ? $this->getRandomDate(60) : null,
                    'external_id' => $this->generateUniqueExternalId($email, $usedExternalIds, $leadCounter),
                    'lead_score' => $this->calculateLeadScore($occupation, $emailDomain, $phone, $budget),
                    'last_activity_at' => $lastActivityAt,
                    'next_follow_up_at' => $nextFollowUpAt,
                    'pending_activities_count' => rand(0, 5),
                    'created_by' => !empty($users) ? $users[array_rand($users)] : null,
                    'created_at' => $createdAt,
                    'updated_at' => $lastActivityAt,
                ];

                $leadCounter++;
            }

            // Insert remainder batch
            DB::table('leads')->insert($leads);
            $this->command->info('Created remainder batch with ' . $remainder . ' leads');
        }

        $this->command->info('Successfully created ' . $totalLeads . ' new leads! You can now create more leads by running this seeder again.');
    }

    private function generatePhone(string $countryCode): string
    {
        $formats = [
            'US' => '+1-' . rand(200, 999) . '-' . rand(100, 999) . '-' . rand(1000, 9999),
            'GB' => '+44-' . rand(20, 79) . rand(10000000, 99999999),
            'DE' => '+49-' . rand(30, 89) . '-' . rand(10000000, 99999999),
            'FR' => '+33-' . rand(1, 9) . '-' . rand(10, 99) . '-' . rand(10, 99) . '-' . rand(10, 99) . '-' . rand(10, 99),
            'AE' => '+971-' . rand(50, 59) . '-' . rand(100, 999) . '-' . rand(1000, 9999),
            'default' => '+' . rand(1, 999) . '-' . rand(100000000, 999999999)
        ];

        return $formats[$countryCode] ?? $formats['default'];
    }

    private function getCityCoordinates(string $city): array
    {
        $coordinates = [
            // North America
            'New York' => ['lat' => 40.7128, 'lng' => -74.0060],
            'Los Angeles' => ['lat' => 34.0522, 'lng' => -118.2437],
            'Chicago' => ['lat' => 41.8781, 'lng' => -87.6298],
            'Houston' => ['lat' => 29.7604, 'lng' => -95.3698],
            'Miami' => ['lat' => 25.7617, 'lng' => -80.1918],
            'Toronto' => ['lat' => 43.6532, 'lng' => -79.3832],
            'Vancouver' => ['lat' => 49.2827, 'lng' => -123.1207],
            'Montreal' => ['lat' => 45.5017, 'lng' => -73.5673],
            'Calgary' => ['lat' => 51.0447, 'lng' => -114.0719],
            'Ottawa' => ['lat' => 45.4215, 'lng' => -75.6972],

            // Europe
            'London' => ['lat' => 51.5074, 'lng' => -0.1278],
            'Manchester' => ['lat' => 53.4808, 'lng' => -2.2426],
            'Birmingham' => ['lat' => 52.4862, 'lng' => -1.8904],
            'Liverpool' => ['lat' => 53.4084, 'lng' => -2.9916],
            'Edinburgh' => ['lat' => 55.9533, 'lng' => -3.1883],
            'Berlin' => ['lat' => 52.5200, 'lng' => 13.4050],
            'Munich' => ['lat' => 48.1351, 'lng' => 11.5820],
            'Hamburg' => ['lat' => 53.5511, 'lng' => 9.9937],
            'Frankfurt' => ['lat' => 50.1109, 'lng' => 8.6821],
            'Cologne' => ['lat' => 50.9375, 'lng' => 6.9603],
            'Paris' => ['lat' => 48.8566, 'lng' => 2.3522],
            'Lyon' => ['lat' => 45.7640, 'lng' => 4.8357],
            'Marseille' => ['lat' => 43.2965, 'lng' => 5.3698],
            'Toulouse' => ['lat' => 43.6047, 'lng' => 1.4442],
            'Nice' => ['lat' => 43.7102, 'lng' => 7.2620],

            // Asia
            'Dubai' => ['lat' => 25.2048, 'lng' => 55.2708],
            'Abu Dhabi' => ['lat' => 24.2539, 'lng' => 54.3773],
            'Sharjah' => ['lat' => 25.3463, 'lng' => 55.4209],
            'Ajman' => ['lat' => 25.4052, 'lng' => 55.5136],
            'Fujairah' => ['lat' => 25.1164, 'lng' => 56.3256],
            'Mumbai' => ['lat' => 19.0760, 'lng' => 72.8777],
            'Delhi' => ['lat' => 28.7041, 'lng' => 77.1025],
            'Bangalore' => ['lat' => 12.9716, 'lng' => 77.5946],
            'Chennai' => ['lat' => 13.0827, 'lng' => 80.2707],
            'Kolkata' => ['lat' => 22.5726, 'lng' => 88.3639],
            'Beijing' => ['lat' => 39.9042, 'lng' => 116.4074],
            'Shanghai' => ['lat' => 31.2304, 'lng' => 121.4737],
            'Guangzhou' => ['lat' => 23.1291, 'lng' => 113.2644],
            'Shenzhen' => ['lat' => 22.5431, 'lng' => 114.0579],
            'Chengdu' => ['lat' => 30.5728, 'lng' => 104.0668],

            // Russia
            'Moscow' => ['lat' => 55.7558, 'lng' => 37.6176],
            'St. Petersburg' => ['lat' => 59.9311, 'lng' => 30.3609],
            'Novosibirsk' => ['lat' => 55.0084, 'lng' => 82.9357],
            'Yekaterinburg' => ['lat' => 56.8431, 'lng' => 60.6454],
            'Kazan' => ['lat' => 55.8304, 'lng' => 49.0661],

            // Middle East
            'Riyadh' => ['lat' => 24.7136, 'lng' => 46.6753],
            'Jeddah' => ['lat' => 21.4858, 'lng' => 39.1925],
            'Mecca' => ['lat' => 21.3891, 'lng' => 39.8579],
            'Medina' => ['lat' => 24.5247, 'lng' => 39.5692],
            'Dammam' => ['lat' => 26.4207, 'lng' => 50.0888],

            // South America
            'São Paulo' => ['lat' => -23.5505, 'lng' => -46.6333],
            'Rio de Janeiro' => ['lat' => -22.9068, 'lng' => -43.1729],
            'Brasília' => ['lat' => -15.8267, 'lng' => -47.9218],
            'Salvador' => ['lat' => -12.9714, 'lng' => -38.5014],
            'Fortaleza' => ['lat' => -3.7319, 'lng' => -38.5267],

            // Australia
            'Sydney' => ['lat' => -33.8688, 'lng' => 151.2093],
            'Melbourne' => ['lat' => -37.8136, 'lng' => 144.9631],
            'Brisbane' => ['lat' => -27.4698, 'lng' => 153.0251],
            'Perth' => ['lat' => -31.9505, 'lng' => 115.8605],
            'Adelaide' => ['lat' => -34.9285, 'lng' => 138.6007],
        ];

        if (isset($coordinates[$city])) {
            // Add small random variation (±0.1 degrees) to exact coordinates
            return [
                'lat' => round($coordinates[$city]['lat'] + (rand(-1000, 1000) / 10000), 8),
                'lng' => round($coordinates[$city]['lng'] + (rand(-1000, 1000) / 10000), 8)
            ];
        }

        // Generate random coordinates within valid bounds
        return [
            'lat' => round(rand(-8900, 8900) / 100, 8), // -89 to 89 degrees
            'lng' => round(rand(-17900, 17900) / 100, 8) // -179 to 179 degrees
        ];
    }

    private function generateBudget(string $occupation): array
    {
        $budgetRanges = [
            'CEO' => [500000, 2000000],
            'Business Owner' => [300000, 1500000],
            'Investment Manager' => [400000, 1200000],
            'Medical Doctor' => [250000, 800000],
            'default' => [100000, 500000]
        ];

        $range = $budgetRanges[$occupation] ?? $budgetRanges['default'];
        $amount = rand($range[0], $range[1]);

        return [
            'currency' => 'USD',
            'amount' => $amount,
            'type' => rand(1, 10) <= 7 ? 'exact' : 'range',
            'timeframe' => ['immediate', '3_months', '6_months', '1_year'][rand(0, 3)]
        ];
    }

    private function generateInquiryDetail(string $country): string
    {
        $templates = [
            "I am interested in obtaining a second citizenship for myself and my family. I am currently residing in {$country} and looking for investment opportunities.",
            "Looking for citizenship by investment options. I have a successful business and am interested in expanding internationally.",
            "I would like to explore residency programs that lead to citizenship. My budget is flexible for the right opportunity.",
            "Seeking information about {$country} golden visa programs. I am interested in real estate investment options.",
            "I am a business owner looking for citizenship options that provide visa-free travel benefits.",
            "Interested in fast-track citizenship programs. I have liquid capital available for investment.",
            "Looking for family-friendly citizenship programs that include spouse and children.",
            "I would like to diversify my citizenship portfolio and am interested in Caribbean programs."
        ];

        return $templates[array_rand($templates)];
    }

    private function generateCustomFields(): array
    {
        return [
            'family_size' => rand(1, 6),
            'children_ages' => array_map(fn() => rand(0, 25), range(1, rand(0, 3))),
            'current_citizenships' => [['US', 'GB', 'DE', 'CA', 'AU'][rand(0, 4)]],
            'investment_experience' => ['none', 'basic', 'experienced', 'expert'][rand(0, 3)],
            'urgency' => ['low', 'medium', 'high'][rand(0, 2)],
            'preferred_regions' => [['Caribbean', 'Europe', 'North America'][rand(0, 2)]],
            'language_spoken' => ['English', 'Spanish', 'French', 'German', 'Arabic', 'Chinese'][rand(0, 5)],
            'travel_frequency' => ['rarely', 'occasionally', 'frequently', 'constantly'][rand(0, 3)]
        ];
    }

    private function generateAddress(string $city, string $country): string
    {
        $streetNumbers = [rand(1, 9999), rand(1, 999), rand(10, 999)];
        $streetNames = ['Main St', 'High St', 'Park Ave', 'First Ave', 'Broadway', 'Oak St', 'Elm St'];

        return $streetNumbers[array_rand($streetNumbers)] . ' ' .
            $streetNames[array_rand($streetNames)] . ', ' .
            $city . ', ' . $country;
    }

    private function getRandomStatus(): string
    {
        $statuses = [
            'new' => 30,
            'contacted' => 25,
            'qualified' => 20,
            'proposal' => 10,
            'won' => 8,
            'lost' => 5,
            'nurturing' => 2
        ];

        return $this->getWeightedRandom($statuses);
    }

    private function getRandomPriority(): string
    {
        $priorities = [
            'low' => 20,
            'medium' => 50,
            'high' => 25,
            'urgent' => 5
        ];

        return $this->getWeightedRandom($priorities);
    }

    private function getRandomInquiryType(): string
    {
        $types = [
            'web' => 40,
            'email' => 20,
            'phone' => 15,
            'referral' => 10,
            'social' => 10,
            'advertisement' => 5
        ];

        return $this->getWeightedRandom($types);
    }

    private function getWeightedRandom(array $weights): string
    {
        $totalWeight = array_sum($weights);
        $random = rand(1, $totalWeight);

        foreach ($weights as $item => $weight) {
            $random -= $weight;
            if ($random <= 0) {
                return $item;
            }
        }

        return array_key_first($weights);
    }

    private function getRandomDate(int $maxDaysAgo): string
    {
        return Carbon::now()->subDays(rand(0, $maxDaysAgo))->format('Y-m-d H:i:s');
    }

    private function getRandomDateAfter(string $afterDate, int $maxDaysLater): string
    {
        $date = Carbon::parse($afterDate);
        return $date->addDays(rand(0, $maxDaysLater))->format('Y-m-d H:i:s');
    }

    private function getNextFollowUpDate(string $status, string $lastActivity): ?string
    {
        if (in_array($status, ['won', 'lost'])) {
            return null;
        }

        $lastActivityDate = Carbon::parse($lastActivity);
        $daysToAdd = match($status) {
            'new' => rand(1, 3),
            'contacted' => rand(3, 7),
            'qualified' => rand(5, 14),
            'proposal' => rand(2, 5),
            'nurturing' => rand(14, 30),
            default => rand(7, 14)
        };

        return $lastActivityDate->addDays($daysToAdd)->format('Y-m-d H:i:s');
    }

    private function calculateLeadScore(string $occupation, string $emailDomain, ?string $phone, array $budget): int
    {
        $score = 50; // Base score

        // Occupation scoring
        $highValueOccupations = ['CEO', 'Business Owner', 'Investment Manager', 'Entrepreneur'];
        if (in_array($occupation, $highValueOccupations)) {
            $score += 20;
        }

        // Email domain scoring
        if (!in_array($emailDomain, ['gmail.com', 'yahoo.com', 'hotmail.com'])) {
            $score += 10; // Business email
        }

        // Phone presence
        if ($phone) {
            $score += 15;
        }

        // Budget scoring
        if ($budget['amount'] >= 500000) {
            $score += 15;
        } elseif ($budget['amount'] >= 250000) {
            $score += 10;
        }

        return min(100, $score);
    }

    private function generateUniqueEmail(string $firstName, string $lastName, string $emailDomain, array &$usedEmails, int $counter): string
    {
        $maxAttempts = 10;
        $attempt = 0;

        do {
            $baseEmail = strtolower($firstName . '.' . $lastName);

            // Add suffix if needed for uniqueness
            if ($attempt > 0) {
                $baseEmail .= ($attempt === 1) ? $counter : ($counter . $attempt);
            }

            $email = $baseEmail . '@' . $emailDomain;
            $attempt++;

            if (!in_array($email, $usedEmails)) {
                $usedEmails[] = $email;
                return $email;
            }

        } while ($attempt < $maxAttempts);

        // Fallback with timestamp to ensure uniqueness
        $fallbackEmail = strtolower($firstName . '.' . $lastName . '.' . time() . $counter . '@' . $emailDomain);
        $usedEmails[] = $fallbackEmail;
        return $fallbackEmail;
    }

    private function generateUniqueExternalId(string $email, array &$usedExternalIds, int $counter): string
    {
        $maxAttempts = 10;
        $attempt = 0;

        do {
            $baseId = 'EXT-' . strtoupper(substr(md5($email . $counter . $attempt), 0, 8));
            $attempt++;

            if (!in_array($baseId, $usedExternalIds)) {
                $usedExternalIds[] = $baseId;
                return $baseId;
            }

        } while ($attempt < $maxAttempts);

        // Fallback with timestamp to ensure uniqueness
        $fallbackId = 'EXT-' . strtoupper(substr(md5($email . time() . $counter), 0, 8));
        $usedExternalIds[] = $fallbackId;
        return $fallbackId;
    }
}
