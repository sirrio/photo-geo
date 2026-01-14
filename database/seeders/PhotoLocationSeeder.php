<?php

namespace Database\Seeders;

use App\Models\PhotoLocation;
use Illuminate\Database\Seeder;

class PhotoLocationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        PhotoLocation::factory()->count(5)->create();
    }
}
