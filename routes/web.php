<?php

use App\Http\Controllers\PhotoController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', [PhotoController::class, 'index'])->name('home');

Route::get('photos', [PhotoController::class, 'index'])->name('photo.index');
Route::post('photos', [PhotoController::class, 'store'])->name('photo.store');
Route::get('photos/{photoLocation}', [PhotoController::class, 'show'])
    ->name('photo.show')
    ->missing(fn () => redirect()->route('home'));
Route::patch('photos/{photoLocation}', [PhotoController::class, 'update'])
    ->name('photo.update');
Route::delete('photos/{photoLocation}', [PhotoController::class, 'destroy'])
    ->name('photo.destroy');
Route::get('umap/photos.geojson', [PhotoController::class, 'geojson'])
    ->name('umap.photos');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});

require __DIR__.'/settings.php';
