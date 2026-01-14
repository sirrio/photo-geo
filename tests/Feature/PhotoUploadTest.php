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

        $this->post(route('photo.store'), [
            'photo' => UploadedFile::fake()->image('no-gps.jpg', 800, 600),
        ])->assertInertia(fn (Assert $page) => $page
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
}
