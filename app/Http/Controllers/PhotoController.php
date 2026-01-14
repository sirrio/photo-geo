<?php

namespace App\Http\Controllers;

use App\Http\Requests\PhotoLocationUpdateRequest;
use App\Http\Requests\PhotoUploadRequest;
use App\Models\PhotoLocation;
use App\PhotoMetadataExtractor;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;

class PhotoController extends Controller
{
    public function __construct(public PhotoMetadataExtractor $metadataExtractor) {}

    public function index(): Response
    {
        $photo = session('photo');

        if (! is_array($photo)) {
            $photo = null;
        }

        $locations = PhotoLocation::query()
            ->latest()
            ->take(20)
            ->get()
            ->map(fn (PhotoLocation $location) => $location->toArray())
            ->values();

        return Inertia::render('photo/index', [
            'canRegister' => Features::enabled(Features::registration()),
            'photo' => $photo,
            'umapGeoJsonUrl' => route('umap.photos'),
            'locations' => $locations,
        ]);
    }

    public function store(PhotoUploadRequest $request): Response
    {
        $file = $request->file('photo');
        $storedPath = $file->store('uploads', 'public');
        $metadata = $this->metadataExtractor->extract(
            Storage::disk('public')->path($storedPath)
        );

        $latitude = $metadata['latitude'];
        $longitude = $metadata['longitude'];

        $photoData = [
            'url' => url(Storage::disk('public')->url($storedPath)),
            'original_name' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'captured_at' => $metadata['captured_at'],
            'camera_make' => $metadata['camera_make'],
            'camera_model' => $metadata['camera_model'],
            'latitude' => $latitude,
            'longitude' => $longitude,
            'has_location' => $latitude !== null && $longitude !== null,
        ];

        if ($photoData['has_location']) {
            PhotoLocation::create([
                'original_name' => $photoData['original_name'],
                'mime_type' => $photoData['mime_type'],
                'size' => $photoData['size'],
                'url' => $photoData['url'],
                'captured_at' => $photoData['captured_at'],
                'camera_make' => $photoData['camera_make'],
                'camera_model' => $photoData['camera_model'],
                'latitude' => $photoData['latitude'],
                'longitude' => $photoData['longitude'],
            ]);
        }

        return Inertia::render('photo/index', [
            'canRegister' => Features::enabled(Features::registration()),
            'photo' => $photoData,
            'umapGeoJsonUrl' => route('umap.photos'),
            'locations' => PhotoLocation::query()
                ->latest()
                ->take(20)
                ->get()
                ->map(fn (PhotoLocation $location) => $location->toArray())
                ->values(),
        ]);
    }

    public function update(
        PhotoLocationUpdateRequest $request,
        PhotoLocation $photoLocation
    ): Response {
        $photoLocation->update($request->validated());

        return Inertia::render('photo/index', [
            'canRegister' => Features::enabled(Features::registration()),
            'photo' => null,
            'umapGeoJsonUrl' => route('umap.photos'),
            'locations' => PhotoLocation::query()
                ->latest()
                ->take(20)
                ->get()
                ->map(fn (PhotoLocation $location) => $location->toArray())
                ->values(),
        ]);
    }

    public function destroy(PhotoLocation $photoLocation): Response
    {
        $photoLocation->delete();

        return Inertia::render('photo/index', [
            'canRegister' => Features::enabled(Features::registration()),
            'photo' => null,
            'umapGeoJsonUrl' => route('umap.photos'),
            'locations' => PhotoLocation::query()
                ->latest()
                ->take(20)
                ->get()
                ->map(fn (PhotoLocation $location) => $location->toArray())
                ->values(),
        ]);
    }

    public function show(PhotoLocation $photoLocation): Response
    {
        return $this->index();
    }

    public function geojson(): JsonResponse
    {
        $features = PhotoLocation::query()
            ->latest()
            ->get()
            ->map(fn (PhotoLocation $location) => $location->toGeoJsonFeature())
            ->values();

        return response()
            ->json([
                'type' => 'FeatureCollection',
                'features' => $features,
            ])
            ->withHeaders([
                'Access-Control-Allow-Origin' => '*',
            ]);
    }
}
