<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\Country;
use App\Models\Province;
use Illuminate\Database\Seeder;

class CitySeeder extends Seeder
{
    public function run(): void
    {
        $citiesByProvince = $this->getCitiesByProvince();

        foreach ($citiesByProvince as $countryCode => $provinces) {
            $country = Country::where('code', $countryCode)->first();
            if (! $country) {
                continue;
            }

            foreach ($provinces as $provinceName => $cities) {
                $province = Province::where('country_id', $country->id)
                    ->where('name', $provinceName)
                    ->first();

                if (! $province) {
                    continue;
                }

                foreach ($cities as $cityData) {
                    City::updateOrCreate(
                        [
                            'province_id' => $province->id,
                            'name' => $cityData['name'],
                        ],
                        [
                            'code' => $cityData['code'] ?? null,
                            'latitude' => $cityData['latitude'] ?? null,
                            'longitude' => $cityData['longitude'] ?? null,
                            'is_active' => true,
                        ],
                    );
                }
            }
        }
    }

    /** @return array<string, array<string, list<array{name: string, code?: string, latitude?: float, longitude?: float}>>> */
    private function getCitiesByProvince(): array
    {
        return [
            // United States
            'USA' => [
                'California' => [
                    ['name' => 'Los Angeles', 'code' => 'LA', 'latitude' => 34.0522, 'longitude' => -118.2437],
                    ['name' => 'San Francisco', 'code' => 'SF', 'latitude' => 37.7749, 'longitude' => -122.4194],
                    ['name' => 'San Diego', 'code' => 'SD', 'latitude' => 32.7157, 'longitude' => -117.1611],
                    ['name' => 'San Jose', 'code' => 'SJ', 'latitude' => 37.3382, 'longitude' => -121.8863],
                ],
                'Texas' => [
                    ['name' => 'Houston', 'code' => 'HOU', 'latitude' => 29.7604, 'longitude' => -95.3698],
                    ['name' => 'Dallas', 'code' => 'DAL', 'latitude' => 32.7767, 'longitude' => -96.7970],
                    ['name' => 'Austin', 'code' => 'AUS', 'latitude' => 30.2672, 'longitude' => -97.7431],
                    ['name' => 'San Antonio', 'code' => 'SAT', 'latitude' => 29.4241, 'longitude' => -98.4936],
                ],
                'Florida' => [
                    ['name' => 'Miami', 'code' => 'MIA', 'latitude' => 25.7617, 'longitude' => -80.1918],
                    ['name' => 'Orlando', 'code' => 'ORL', 'latitude' => 28.5383, 'longitude' => -81.3792],
                    ['name' => 'Tampa', 'code' => 'TPA', 'latitude' => 27.9506, 'longitude' => -82.4572],
                    ['name' => 'Jacksonville', 'code' => 'JAX', 'latitude' => 30.3322, 'longitude' => -81.6557],
                ],
                'New York' => [
                    ['name' => 'New York City', 'code' => 'NYC', 'latitude' => 40.7128, 'longitude' => -74.0060],
                    ['name' => 'Buffalo', 'code' => 'BUF', 'latitude' => 42.8864, 'longitude' => -78.8784],
                    ['name' => 'Rochester', 'code' => 'ROC', 'latitude' => 43.1566, 'longitude' => -77.6088],
                ],
            ],

            // Canada
            'CAN' => [
                'Ontario' => [
                    ['name' => 'Toronto', 'code' => 'TOR', 'latitude' => 43.6532, 'longitude' => -79.3832],
                    ['name' => 'Ottawa', 'code' => 'OTT', 'latitude' => 45.4215, 'longitude' => -75.6972],
                    ['name' => 'Mississauga', 'code' => 'MIS', 'latitude' => 43.5890, 'longitude' => -79.6441],
                ],
                'Quebec' => [
                    ['name' => 'Montreal', 'code' => 'MTL', 'latitude' => 45.5017, 'longitude' => -73.5673],
                    ['name' => 'Quebec City', 'code' => 'QBC', 'latitude' => 46.8139, 'longitude' => -71.2080],
                ],
            ],

            // UAE
            'ARE' => [
                'Abu Dhabi' => [
                    ['name' => 'Abu Dhabi', 'code' => 'AUH'],
                ],
                'Dubai' => [
                    ['name' => 'Dubai', 'code' => 'DXB'],
                ],
                'General' => [
                    ['name' => 'Dubai'],
                ],
            ],

            // Portugal
            'PRT' => [
                'ALL' => [
                    ['name' => 'Lisbon'],
                ],
            ],

            // International
            'INT' => [
                'ALL' => [
                    ['name' => 'Dubai'],
                ],
            ],

            // Pakistan
            'PAK' => [
                'Punjab' => [
                    ['name' => 'Lahore', 'code' => 'LHE'],
                    ['name' => 'Faisalabad', 'code' => 'FSD'],
                    ['name' => 'Rawalpindi', 'code' => 'RWP'],
                    ['name' => 'Multan', 'code' => 'MUX'],
                    ['name' => 'Gujranwala', 'code' => 'GUJ'],
                    ['name' => 'Sialkot', 'code' => 'SKT'],
                    ['name' => 'Sargodha', 'code' => 'SGD'],
                    ['name' => 'Bahawalpur', 'code' => 'BHV'],
                    ['name' => 'Abbaspur'],
                    ['name' => 'Abdul Hakim'],
                    ['name' => 'Adda Jahan Khan'],
                    ['name' => 'Ahmadpur East'],
                    ['name' => 'Ahmed pur Sial'],
                    ['name' => 'Ali Chak'],
                    ['name' => 'Alipur'],
                    ['name' => 'Allahabad'],
                    ['name' => 'Attock'],
                    ['name' => 'Bahawalnagar'],
                    ['name' => 'Bhakkar'],
                    ['name' => 'Bhalwal'],
                    ['name' => 'Burewala'],
                    ['name' => 'Chakwal'],
                    ['name' => 'Chiniot'],
                    ['name' => 'Chishtian'],
                    ['name' => 'Daska'],
                    ['name' => 'Dera Ghazi Khan'],
                    ['name' => 'Eminabad'],
                    ['name' => 'Gojra'],
                    ['name' => 'Gujrat'],
                    ['name' => 'Hafizabad'],
                    ['name' => 'Haroonabad'],
                    ['name' => 'Hasilpur'],
                    ['name' => 'Jaranwala'],
                    ['name' => 'Jhang'],
                    ['name' => 'Jhelum'],
                    ['name' => 'Kamalia'],
                    ['name' => 'Kamalia Musa'],
                    ['name' => 'Kamokey'],
                    ['name' => 'Kasur'],
                    ['name' => 'Khanewal'],
                    ['name' => 'Khanpur'],
                    ['name' => 'Khushab'],
                    ['name' => 'Kot Addu'],
                    ['name' => 'Layyah'],
                    ['name' => 'Lodhran'],
                    ['name' => 'Mandi Bahauddin'],
                    ['name' => 'Mian Walli'],
                    ['name' => 'Miran Shah'],
                    ['name' => 'Muridkay'],
                    ['name' => 'Muzaffargarh'],
                    ['name' => 'Narowal'],
                    ['name' => 'Okara'],
                    ['name' => 'Pak Pattan Sharif'],
                    ['name' => 'Pasroor'],
                    ['name' => 'Patoki'],
                    ['name' => 'Phagwar'],
                    ['name' => 'Phalia'],
                    ['name' => 'Phool nagar'],
                    ['name' => 'Phoolnagar (Bhai Pheru)'],
                    ['name' => 'Pindi Bhattian'],
                    ['name' => 'Pindi bhohri'],
                    ['name' => 'Pindi gheb'],
                    ['name' => 'Piplan'],
                    ['name' => 'Pir Mahal'],
                    ['name' => 'Qasba Gujrat'],
                    ['name' => 'Quaidabad'],
                    ['name' => 'Rabwah'],
                    ['name' => 'Rahimyar Khan'],
                    ['name' => 'Rahwali'],
                    ['name' => 'Raiwind'],
                    ['name' => 'Rajana'],
                    ['name' => 'Rajanpur'],
                    ['name' => 'Renala Khurd'],
                    ['name' => 'Sadiqabad'],
                    ['name' => 'Sahiwal'],
                    ['name' => 'Sambrial'],
                    ['name' => 'Samma Satta'],
                    ['name' => 'Samundri'],
                    ['name' => 'Sanghi'],
                    ['name' => 'Sangla Hill'],
                    ['name' => 'Sanjwal'],
                    ['name' => 'Sarai Alamgir'],
                    ['name' => 'Satyana Bangla'],
                    ['name' => 'Shadiwal'],
                    ['name' => 'Shahkot'],
                    ['name' => 'Shakargarh'],
                    ['name' => 'Shamir'],
                    ['name' => 'Shamsabad'],
                    ['name' => 'Shedani sharif'],
                    ['name' => 'Sheikhupura'],
                    ['name' => 'Shorkot'],
                    ['name' => 'Shujabad'],
                    ['name' => 'Silanwala'],
                    ['name' => 'Sohawa District Daska'],
                    ['name' => 'Talagang'],
                    ['name' => 'Talamba'],
                    ['name' => 'Tarmatan'],
                    ['name' => 'Taunsa sharif'],
                    ['name' => 'Taxila'],
                    ['name' => 'Theing Jattan More'],
                    ['name' => 'Tibba Sultanpur'],
                    ['name' => 'Tobatek Singh'],
                    ['name' => 'Trinda Mohd Pannah'],
                    ['name' => 'Ugoki'],
                    ['name' => 'Upper Deval'],
                    ['name' => 'Vehari'],
                    ['name' => 'Village Sunder'],
                    ['name' => 'Wah Cantt'],
                    ['name' => 'Wahi hassain'],
                    ['name' => 'Wan Radha Ram'],
                    ['name' => 'Warburton'],
                    ['name' => 'Wazirabad'],
                    ['name' => 'Yazman Mandi'],
                    ['name' => 'Zahir Pir'],
                ],
                'Sindh' => [
                    ['name' => 'Karachi', 'code' => 'KHI'],
                    ['name' => 'Hyderabad', 'code' => 'HDD'],
                    ['name' => 'Sukkur', 'code' => 'SKR'],
                    ['name' => 'Larkana', 'code' => 'LRK'],
                    ['name' => 'Badin'],
                    ['name' => 'Dādu'],
                    ['name' => 'Gambet'],
                    ['name' => 'Ghotki'],
                    ['name' => 'Gwadar'],
                    ['name' => 'Hala'],
                    ['name' => 'Jacobabad'],
                    ['name' => 'Kashmore'],
                    ['name' => 'Khair Pur'],
                    ['name' => 'Khair Pur Mir'],
                    ['name' => 'Khairpur Nathan Shah'],
                    ['name' => 'Kotli'],
                    ['name' => 'Mirpur Khas'],
                    ['name' => 'Mirpur Mathelo'],
                    ['name' => 'Mithi'],
                    ['name' => 'Moro'],
                    ['name' => 'Nawab Shah'],
                    ['name' => 'Padidan'],
                    ['name' => 'Pannu Aqil'],
                    ['name' => 'Piaro Goth'],
                    ['name' => 'Qambar'],
                    ['name' => 'Qambar Shahdatkot'],
                    ['name' => 'Qazi Ahmed'],
                    ['name' => 'Ranipur'],
                    ['name' => 'Rashidabad'],
                    ['name' => 'Ratto Dero'],
                    ['name' => 'Rohri'],
                    ['name' => 'Sajawal'],
                    ['name' => 'Sakrand'],
                    ['name' => 'Sanghar'],
                    ['name' => 'Sehwan'],
                    ['name' => 'Shahdad Kot'],
                    ['name' => 'Shahdad Pur'],
                    ['name' => 'Shaheed Benazirabad'],
                    ['name' => 'Shahpur Chakar'],
                    ['name' => 'Shikarpur'],
                    ['name' => 'Sita Road'],
                    ['name' => 'Talhar'],
                    ['name' => 'Tando Adam'],
                    ['name' => 'Tando Allahyar'],
                    ['name' => 'Tando Jam'],
                    ['name' => 'Tando Mohd Khan'],
                    ['name' => 'Thana Bula Khan'],
                    ['name' => 'Thari Mirwah'],
                    ['name' => 'Tharo Shah'],
                    ['name' => 'Tharparkar'],
                    ['name' => 'Thatta'],
                    ['name' => 'Thul'],
                    ['name' => 'Ubaro'],
                    ['name' => 'Umer Kot'],
                    ['name' => 'Warah'],
                ],
                'Khyber Pakhtunkhwa' => [
                    ['name' => 'Peshawar', 'code' => 'PEW'],
                    ['name' => 'Mardan', 'code' => 'MRD'],
                    ['name' => 'Abbottabad', 'code' => 'ABT'],
                    ['name' => 'Swat', 'code' => 'SWT'],
                    ['name' => 'Akhora Khattak'],
                    ['name' => 'Amangarh'],
                    ['name' => 'Bannu'],
                    ['name' => 'Bat Khela'],
                    ['name' => 'Charsada'],
                    ['name' => 'Chitral'],
                    ['name' => 'Dera Ismail Khan'],
                    ['name' => 'FR Bannu'],
                    ['name' => 'FR Bannu / Lakki'],
                    ['name' => 'FR Kohat'],
                    ['name' => 'FR Peshawar'],
                    ['name' => 'FR Peshawar / Kohat'],
                    ['name' => 'Hangu'],
                    ['name' => 'Hari Pur'],
                    ['name' => 'Havelian'],
                    ['name' => 'Jehangira'],
                    ['name' => 'Kabir Wala'],
                    ['name' => 'Karak'],
                    ['name' => 'Khyber Agency'],
                    ['name' => 'Kohat'],
                    ['name' => 'Mansehra'],
                    ['name' => 'Mingora'],
                    ['name' => 'Nowshera'],
                    ['name' => 'Nowshera Cantt'],
                    ['name' => 'Parachinar'],
                    ['name' => 'Pirpai'],
                    ['name' => 'Qalandarabad'],
                    ['name' => 'Risalpur'],
                    ['name' => 'Saidu Sharif'],
                    ['name' => 'Sara e Naurang'],
                    ['name' => 'Shangla'],
                    ['name' => 'Shankiari'],
                    ['name' => 'Shogram'],
                    ['name' => 'South Wazirstan'],
                    ['name' => 'Swabi'],
                    ['name' => 'Swatmingora'],
                    ['name' => 'Takhtbai'],
                    ['name' => 'Tall'],
                    ['name' => 'Tank'],
                    ['name' => 'Tarbela'],
                    ['name' => 'Timergara'],
                    ['name' => 'Topi'],
                    ['name' => 'Toru'],
                    ['name' => 'Upper Dir'],
                    ['name' => 'Utror'],
                    ['name' => 'Wana'],
                ],
                'Balochistan' => [
                    ['name' => 'Quetta', 'code' => 'UET'],
                    ['name' => 'Gwadar', 'code' => 'GWD'],
                    ['name' => 'Turbat', 'code' => 'TUK'],
                    ['name' => 'Chaghi'],
                    ['name' => 'Chaman'],
                    ['name' => 'Dera Murad Jamali'],
                    ['name' => 'Ghuzdar'],
                    ['name' => 'Hub Chowki'],
                    ['name' => 'Kharan'],
                    ['name' => 'Machh'],
                    ['name' => 'Mastung'],
                    ['name' => 'Panjgur'],
                    ['name' => 'Pasni'],
                    ['name' => 'Pishin'],
                    ['name' => 'Sherani'],
                    ['name' => 'Sibi'],
                    ['name' => 'Sohbatpur'],
                    ['name' => 'Usta Mohammad'],
                    ['name' => 'Washuk'],
                    ['name' => 'Zhob'],
                    ['name' => 'Ziarat'],
                ],
                'Gilgit-Baltistan' => [
                    ['name' => 'Gilgit', 'code' => 'GIL'],
                    ['name' => 'Skardu', 'code' => 'SKD'],
                ],
                'Azad Jammu and Kashmir' => [
                    ['name' => 'Muzaffarabad', 'code' => 'MFB'],
                ],
                'Islamabad' => [
                    ['name' => 'Islamabad', 'code' => 'ISB'],
                    ['name' => 'Adda Shaiwala'],
                    ['name' => 'Kashmir'],
                    ['name' => 'Kharian'],
                    ['name' => 'Khewra'],
                    ['name' => 'Mirpur (AJK)'],
                    ['name' => 'Panjan Kisan'],
                    ['name' => 'Patika'],
                    ['name' => 'Pind Dadan Khan'],
                    ['name' => 'Poonch'],
                    ['name' => 'Punch'],
                    ['name' => 'Rawala Kot'],
                    ['name' => 'Rawat'],
                    ['name' => 'Sagri'],
                    ['name' => 'Sangote'],
                    ['name' => 'Sehar Baqlas'],
                    ['name' => 'Sidhnoti'],
                    ['name' => 'Sihala'],
                    ['name' => 'Sikandarabad'],
                    ['name' => 'Skardu'],
                    ['name' => 'Sohawa District Jehlum'],
                    ['name' => 'Sudhnoti'],
                    ['name' => 'Tarnol'],
                ],
            ],
        ];
    }
}
