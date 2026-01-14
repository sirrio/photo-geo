<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PhotoLocation>
 */
class PhotoLocationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'original_name' => fake()->words(2, true).'.jpg',
            'mime_type' => 'image/jpeg',
            'size' => fake()->numberBetween(150000, 3500000),
            'url' => fake()->imageUrl(1200, 800),
            'captured_at' => fake()->dateTime()->format('Y:m:d H:i:s'),
            'camera_make' => fake()->randomElement(['Canon', 'Sony', 'Nikon', 'Fujifilm']),
            'camera_model' => fake()->bothify('??##'),
            'latitude' => fake()->latitude(47.0, 54.0),
            'longitude' => fake()->longitude(5.0, 15.0),
        ];
    }
}
