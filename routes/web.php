<?php

use App\Http\Controllers\Admin\FeaturedListingsController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\FeaturedPropertiesController;
use App\Http\Controllers\PropertySearchController;
use Illuminate\Support\Facades\Route;

// Public marketing site (Inertia pages in resources/js/pages).
Route::inertia('/', 'home')->name('home');
Route::inertia('/property-search', 'property-search')->name('property-search');
Route::get('/featured-properties', [FeaturedPropertiesController::class, 'index'])->name('featured-properties');
Route::inertia('/buyers', 'buyers')->name('buyers');
Route::inertia('/sellers', 'sellers')->name('sellers');
Route::inertia('/about', 'about')->name('about');
Route::inertia('/communities-projects', 'communities-projects')->name('communities-projects');
Route::inertia('/neighborhoods', 'neighborhoods')->name('neighborhoods');
Route::inertia('/contact', 'contact')->name('contact');
Route::post('/contact', [ContactController::class, 'store'])->name('contact.store');

// Public PrimeMLS (Paragon) property search.
Route::get('/api/primemls/search', [PropertySearchController::class, 'search'])->name('primemls.search');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

Route::middleware(['auth', 'verified', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('idx-settings/featured-listings', [FeaturedListingsController::class, 'edit'])->name('idx.featured.edit');
    Route::patch('idx-settings/featured-listings', [FeaturedListingsController::class, 'update'])->name('idx.featured.update');
});

require __DIR__.'/settings.php';
