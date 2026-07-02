<?php

use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\FeaturedListingsController;
use App\Http\Controllers\Admin\LeadsController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\FeaturedPropertiesController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\PropertyController;
use App\Http\Controllers\PropertySearchController;
use App\Http\Controllers\ValuationController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Public marketing site (Inertia pages in resources/js/pages).
Route::get('/', [HomeController::class, 'index'])->name('home');
Route::get('/property-search', [PropertySearchController::class, 'index'])->name('property-search');
Route::get('/featured-properties', [FeaturedPropertiesController::class, 'index'])->name('featured-properties');
Route::inertia('/buyers', 'buyers')->name('buyers');
Route::inertia('/sellers', 'sellers')->name('sellers');
Route::inertia('/about', 'about')->name('about');
Route::inertia('/communities-projects', 'communities-projects')->name('communities-projects');
Route::inertia('/neighborhoods', 'neighborhoods')->name('neighborhoods');
Route::inertia('/contact', 'contact')->name('contact');
Route::post('/contact', [ContactController::class, 'store'])->name('contact.store');
Route::post('/valuation', [ValuationController::class, 'store'])->name('valuation.store');

// Public PrimeMLS (Paragon) property search.
Route::get('/api/primemls/search', [PropertySearchController::class, 'search'])->name('primemls.search');
Route::get('/property/{mls}', [PropertyController::class, 'show'])->name('property.show');

Route::middleware(['auth', 'verified'])->group(function () {
    // Admins land on the admin dashboard; regular users get the default one.
    Route::get('dashboard', function () {
        return request()->user()?->is_admin
            ? redirect()->route('admin.dashboard')
            : Inertia::render('dashboard');
    })->name('dashboard');
});

Route::middleware(['auth', 'verified', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [AdminDashboardController::class, 'index'])->name('dashboard');
    Route::get('idx-settings/featured-listings', [FeaturedListingsController::class, 'edit'])->name('idx.featured.edit');
    Route::patch('idx-settings/featured-listings', [FeaturedListingsController::class, 'update'])->name('idx.featured.update');

    Route::get('leads', [LeadsController::class, 'index'])->name('leads.index');
    Route::patch('leads/{lead}/status', [LeadsController::class, 'updateStatus'])->name('leads.status');
    Route::patch('leads/{lead}/notes', [LeadsController::class, 'updateNotes'])->name('leads.notes');
    Route::patch('leads/{lead}/read', [LeadsController::class, 'toggleRead'])->name('leads.read');
    Route::delete('leads/{lead}', [LeadsController::class, 'destroy'])->name('leads.destroy');
});

require __DIR__.'/settings.php';
