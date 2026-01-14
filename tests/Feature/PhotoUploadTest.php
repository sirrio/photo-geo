<?php

namespace Tests\Feature;

use App\Models\PhotoLocation;
use App\PhotoMetadataExtractor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PhotoUploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_photo_upload_page_can_be_rendered()
    {
        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('photo/index')
                ->where('photo', null)
                ->has('umapGeoJsonUrl')
                ->has('locations')
            );
    }

    public function test_photo_upload_requires_a_file()
    {
        $this->post(route('photo.store'))
            ->assertSessionHasErrors('photo');
    }

    public function test_photo_upload_returns_metadata_and_location_when_available()
    {
        Storage::fake('public');

        $this->app->instance(PhotoMetadataExtractor::class, new class extends PhotoMetadataExtractor
        {
            public function extract(string $path): array
            {
                return [
                    'latitude' => 37.7749,
                    'longitude' => -122.4194,
                    'captured_at' => '2024:01:14 12:34:56',
                    'camera_make' => 'Canon',
                    'camera_model' => 'EOS',
                ];
            }
        });

        $response = $this->post(route('photo.store'), [
            'photo' => UploadedFile::fake()->image('geo.jpg', 800, 600),
        ]);

        $files = Storage::disk('public')->allFiles('uploads');

        $this->assertCount(1, $files);
        Storage::disk('public')->assertExists($files[0]);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('photo/index')
            ->where('photo.original_name', 'geo.jpg')
            ->where('photo.has_location', true)
            ->where('photo.latitude', 37.7749)
            ->where('photo.longitude', -122.4194)
        );

        $this->assertDatabaseCount('photo_locations', 1);
    }

    public function test_photo_upload_handles_missing_location_data()
    {
        Storage::fake('public');

        $this->app->instance(PhotoMetadataExtractor::class, new class extends PhotoMetadataExtractor
        {
            public function extract(string $path): array
            {
                return [
                    'latitude' => null,
                    'longitude' => null,
                    'captured_at' => null,
                    'camera_make' => null,
                    'camera_model' => null,
                ];
            }
        });

        $response = $this->post(route('photo.store'), [
            'photo' => UploadedFile::fake()->image('no-gps.jpg', 800, 600),
        ]);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('photo/index')
            ->where('photo.has_location', false)
        );

        $this->assertDatabaseCount('photo_locations', 0);
    }

    public function test_geojson_endpoint_returns_photo_locations()
    {
        PhotoLocation::factory()->create([
            'latitude' => 52.52,
            'longitude' => 13.405,
            'original_name' => 'berlin.jpg',
        ]);

        $this->get(route('umap.photos'))
            ->assertOk()
            ->assertJsonFragment([
                'type' => 'FeatureCollection',
            ])
            ->assertJsonFragment([
                'name' => 'berlin.jpg',
            ])
            ->assertJsonFragment([
                'coordinates' => [13.405, 52.52],
            ]);
    }

    public function test_photo_location_can_be_updated()
    {
        $location = PhotoLocation::factory()->create([
            'original_name' => 'old.jpg',
            'latitude' => 51.0,
            'longitude' => 8.0,
        ]);

        $response = $this->patch(route('photo.update', $location), [
            'original_name' => 'new.jpg',
            'captured_at' => '2025:01:01 10:00:00',
            'camera_make' => 'Leica',
            'camera_model' => 'Q2',
            'latitude' => 52.123456,
            'longitude' => 13.654321,
        ]);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('photo/index')
            ->where('locations.0.original_name', 'new.jpg')
        );

        $this->assertDatabaseHas('photo_locations', [
            'id' => $location->id,
            'original_name' => 'new.jpg',
            'camera_make' => 'Leica',
        ]);
    }

    public function test_photo_location_can_be_deleted()
    {
        $location = PhotoLocation::factory()->create();

        $this->delete(route('photo.destroy', $location))
            ->assertInertia(fn (Assert $page) => $page
                ->component('photo/index')
            );

        $this->assertDatabaseMissing('photo_locations', [
            'id' => $location->id,
        ]);
    }
}
