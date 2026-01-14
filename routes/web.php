<?php

use App\Http\Controllers\PhotoController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', [PhotoController::class, 'index'])->name('home');

Route::post('photos', [PhotoController::class, 'store'])->name('photo.store');
Route::get('umap/photos.geojson', [PhotoController::class, 'geojson'])
    ->name('umap.photos');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});

require __DIR__.'/settings.php';
