<?php

use App\Http\Controllers\Admin\AreaCodePriceController as AdminAreaCodePriceController;
use App\Http\Controllers\Admin\CondoBuildingController as AdminCondoBuildingController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\EmailLogController as AdminEmailLogController;
use App\Http\Controllers\Admin\MlsProviderController as AdminMlsProviderController;
use App\Http\Controllers\Admin\MlsRequestController as AdminMlsRequestController;
use App\Http\Controllers\Admin\NewDevelopmentController as AdminNewDevelopmentController;
use App\Http\Controllers\Admin\PlanController as AdminPlanController;
use App\Http\Controllers\Admin\SettingsController as AdminSettingsController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\Admin\WebsiteController as AdminWebsiteController;
use App\Http\Controllers\ContactEmailUnsubscribeController;
use App\Http\Controllers\Crm\AccountContextController;
use App\Http\Controllers\Crm\ActionPlanController;
use App\Http\Controllers\Crm\ActionPlanEnrollmentController;
use App\Http\Controllers\Crm\ActionPlanStepController;
use App\Http\Controllers\Crm\ActivityController;
use App\Http\Controllers\Crm\AgentWebsiteController;
use App\Http\Controllers\Crm\AiContactController;
use App\Http\Controllers\Crm\AiDealQueryController;
use App\Http\Controllers\Crm\AiQueryController;
use App\Http\Controllers\Crm\AiWebsiteController;
use App\Http\Controllers\Crm\BulkEmailController;
use App\Http\Controllers\Crm\CalendarFeedController;
use App\Http\Controllers\Crm\CallingScriptController;
use App\Http\Controllers\Crm\CallLogController;
use App\Http\Controllers\Crm\CompanyController;
use App\Http\Controllers\Crm\ConnectedAccountsController;
use App\Http\Controllers\Crm\ContactController;
use App\Http\Controllers\Crm\ContactRelationshipController;
use App\Http\Controllers\Crm\CreditPackageController;
use App\Http\Controllers\Crm\DashboardController;
use App\Http\Controllers\Crm\DealController;
use App\Http\Controllers\Crm\DialerSessionController;
use App\Http\Controllers\Crm\EmailAccountController;
use App\Http\Controllers\Crm\EmailInboxController;
use App\Http\Controllers\Crm\EmailLogController;
use App\Http\Controllers\Crm\GlobalSearchController;
use App\Http\Controllers\Crm\IdxConnectionController;
use App\Http\Controllers\Crm\IdxController;
use App\Http\Controllers\Crm\IdxLicenseController;
use App\Http\Controllers\Crm\IdxSearchController;
use App\Http\Controllers\Crm\IdxWidgetController;
use App\Http\Controllers\Crm\InboxController;
use App\Http\Controllers\Crm\LandingPageController;
use App\Http\Controllers\Crm\LeadImportController;
use App\Http\Controllers\Crm\ListingController;
use App\Http\Controllers\Crm\ListingPageController;
use App\Http\Controllers\Crm\MeetingController;
use App\Http\Controllers\Crm\MlsConnectionRequestController;
use App\Http\Controllers\Crm\NoteController;
use App\Http\Controllers\Crm\NotificationController;
use App\Http\Controllers\Crm\OnboardingController;
use App\Http\Controllers\Crm\PhoneNumberController;
use App\Http\Controllers\Crm\PipelineController;
use App\Http\Controllers\Crm\ReportsController;
use App\Http\Controllers\Crm\SecurityController;
use App\Http\Controllers\Crm\SettingsController;
use App\Http\Controllers\Crm\SmsController;
use App\Http\Controllers\Crm\SmsLogController;
use App\Http\Controllers\Crm\SubscriptionController;
use App\Http\Controllers\Crm\SupportController;
use App\Http\Controllers\Crm\TagController;
use App\Http\Controllers\Crm\TaskController;
use App\Http\Controllers\Crm\TeamChatController;
use App\Http\Controllers\Crm\TeamController;
use App\Http\Controllers\Crm\TeamInvitationController;
use App\Http\Controllers\Crm\TeamMemberController;
use App\Http\Controllers\Crm\TeamSeatController;
use App\Http\Controllers\Crm\TenDlcController;
use App\Http\Controllers\Crm\VoiceController;
use App\Http\Controllers\Crm\VoicemailController;
use App\Http\Controllers\Crm\VoicemailDropController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PropertyAlertUnsubscribeController;
use App\Http\Controllers\PublicLandingPageController;
use App\Http\Controllers\PublicWebsiteController;
use App\Http\Controllers\SiteVisitorAccountController;
use App\Http\Controllers\SiteVisitorAuthController;
use App\Http\Controllers\SiteVisitorGoogleController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/privacy', function () {
    return Inertia::render('Legal/Privacy');
})->name('privacy');

Route::get('/terms', function () {
    return Inertia::render('Legal/Terms');
})->name('terms');

Route::get('/pricing', function () {
    return Inertia::render('Pricing');
})->name('pricing');

Route::get('/', function () {
    return redirect()->route(auth()->check() ? 'crm.dashboard' : 'login');
});

Route::middleware(['auth', 'verified'])->group(function () {
    // CRM
    Route::prefix('crm')->name('crm.')->group(function () {
        Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('search', GlobalSearchController::class)->name('search');
        Route::get('reports', [ReportsController::class, 'index'])->name('reports.index');
        // Contacts
        Route::get('contacts/export', [ContactController::class, 'export'])->name('contacts.export');
        Route::post('contacts/lead-types', [ContactController::class, 'storeLeadType'])->name('contacts.lead-types.store');
        Route::post('contacts/statuses', [ContactController::class, 'storeContactStatus'])->name('contacts.statuses.store');
        Route::post('contacts/custom-fields', [ContactController::class, 'storeCustomField'])->name('contacts.custom-fields.store');
        Route::patch('contacts/custom-fields/{key}', [ContactController::class, 'updateCustomField'])->name('contacts.custom-fields.update');
        Route::delete('contacts/custom-fields/{key}', [ContactController::class, 'destroyCustomField'])->name('contacts.custom-fields.destroy');
        Route::post('contacts/bulk-delete', [ContactController::class, 'bulkDelete'])->name('contacts.bulk-delete');
        Route::post('contacts/bulk-tag', [ContactController::class, 'bulkTag'])->name('contacts.bulk-tag');
        Route::post('contacts/bulk-type', [ContactController::class, 'bulkUpdateType'])->name('contacts.bulk-type');
        Route::post('contacts/bulk-email', [BulkEmailController::class, 'store'])->name('contacts.bulk-email');
        Route::get('contacts/bulk-email/{campaign}/status', [BulkEmailController::class, 'status'])->name('contacts.bulk-email.status');
        Route::post('contacts/bulk-email/{campaign}/pause', [BulkEmailController::class, 'pause'])->name('contacts.bulk-email.pause');
        Route::post('contacts/bulk-email/{campaign}/resume', [BulkEmailController::class, 'resume'])->name('contacts.bulk-email.resume');
        Route::post('contacts/bulk-email/{campaign}/cancel', [BulkEmailController::class, 'cancel'])->name('contacts.bulk-email.cancel');
        Route::post('contacts/smart-lists', [ContactController::class, 'storeSmartList'])->name('contacts.smart-lists.store');
        Route::patch('contacts/smart-lists/{savedContactView}', [ContactController::class, 'updateSmartList'])->name('contacts.smart-lists.update');
        Route::delete('contacts/smart-lists/{savedContactView}', [ContactController::class, 'destroySmartList'])->name('contacts.smart-lists.destroy');
        Route::post('contacts/smart-lists/{savedContactView}/default', [ContactController::class, 'setDefaultSmartList'])->name('contacts.smart-lists.default');

        // Contact relationships (family members)
        Route::get('contacts/{contact}/relationships/search', [ContactRelationshipController::class, 'search'])->name('contacts.relationships.search');
        Route::post('contacts/{contact}/relationships', [ContactRelationshipController::class, 'store'])->name('contacts.relationships.store');
        Route::delete('contacts/{contact}/relationships/{relationship}', [ContactRelationshipController::class, 'destroy'])->name('contacts.relationships.destroy');

        Route::get('contacts/{contact}/{tab}', [ContactController::class, 'show'])
            ->whereIn('tab', ['properties', 'deals', 'searches', 'offers', 'inquiries', 'action-plans', 'files', 'tasks-appts'])
            ->name('contacts.tab');
        Route::post('contacts/{contact}/listings', [ContactController::class, 'attachListing'])->name('contacts.listings.attach');
        Route::post('contacts/{contact}/listings/link', [ContactController::class, 'linkListing'])->name('contacts.listings.link');
        Route::delete('contacts/{contact}/listings/{listing}', [ContactController::class, 'detachListing'])->name('contacts.listings.detach');
        Route::post('contacts/{contact}/files', [ContactController::class, 'uploadFile'])->name('contacts.files.upload');
        Route::delete('contacts/{contact}/files/{file}', [ContactController::class, 'destroyFile'])->name('contacts.files.destroy');
        Route::patch('contacts/column-preferences', [ContactController::class, 'updateColumnPreferences'])->name('contacts.column-preferences.update');
        Route::post('contacts/{contact}/searches', [ContactController::class, 'storeSearch'])->name('contacts.searches.store');
        Route::patch('contacts/{contact}/searches/{search}', [ContactController::class, 'updateSearch'])->name('contacts.searches.update');
        Route::delete('contacts/{contact}/searches/{search}', [ContactController::class, 'destroySearch'])->name('contacts.searches.destroy');
        Route::post('contacts/{contact}/offers', [ContactController::class, 'storeOffer'])->name('contacts.offers.store');
        Route::post('contacts/{contact}/offers/{offer}/reply', [ContactController::class, 'replyOffer'])->name('contacts.offers.reply');
        Route::patch('contacts/{contact}/offers/{offer}', [ContactController::class, 'updateOffer'])->name('contacts.offers.update');
        Route::delete('contacts/{contact}/offers/{offer}', [ContactController::class, 'destroyOffer'])->name('contacts.offers.destroy');
        Route::post('contacts/{contact}/inquiries', [ContactController::class, 'storeInquiry'])->name('contacts.inquiries.store');
        Route::post('contacts/{contact}/inquiries/{inquiry}/reply', [ContactController::class, 'replyInquiry'])->name('contacts.inquiries.reply');
        Route::patch('contacts/{contact}/inquiries/{inquiry}', [ContactController::class, 'updateInquiry'])->name('contacts.inquiries.update');
        Route::delete('contacts/{contact}/inquiries/{inquiry}', [ContactController::class, 'destroyInquiry'])->name('contacts.inquiries.destroy');
        Route::resource('contacts', ContactController::class);

        // Contact AI
        Route::post('contacts/{contact}/ai/score', [AiContactController::class, 'score'])->name('contacts.ai.score');
        Route::post('contacts/{contact}/ai/summary', [AiContactController::class, 'summary'])->name('contacts.ai.summary');
        Route::get('contacts/{contact}/ai/suggestions', [AiContactController::class, 'suggestions'])->name('contacts.ai.suggestions');
        Route::post('contacts/{contact}/ai/follow-up', [AiContactController::class, 'followUp'])->name('contacts.ai.follow-up');
        Route::post('contacts/{contact}/ai/generate-tasks', [AiContactController::class, 'generateTasks'])->name('contacts.ai.generate-tasks');
        Route::post('contacts/{contact}/ai/create-tasks', [AiContactController::class, 'createTasks'])->name('contacts.ai.create-tasks');
        Route::post('contacts/{contact}/ai/draft-email', [AiContactController::class, 'draftEmail'])->name('contacts.ai.draft-email');
        Route::post('contacts/{contact}/ai/draft-sms', [AiContactController::class, 'draftSms'])->name('contacts.ai.draft-sms');
        Route::post('contacts/{contact}/ai/draft-note', [AiContactController::class, 'draftNote'])->name('contacts.ai.draft-note');
        Route::post('contacts/{contact}/ai/draft-call-notes', [AiContactController::class, 'draftCallNotes'])->name('contacts.ai.draft-call-notes');
        Route::post('contacts/{contact}/ai/chat', [AiContactController::class, 'chat'])->name('contacts.ai.chat');
        Route::post('contacts/{contact}/ai/create-meeting', [AiContactController::class, 'createMeeting'])->name('contacts.ai.create-meeting');
        Route::get('contacts/{contact}/ai/suggested-listings', [AiContactController::class, 'suggestedListings'])->name('contacts.ai.suggested-listings');
        Route::post('ai/contacts-query', [AiQueryController::class, 'query'])->name('ai.contacts-query');
        Route::post('ai/deals-query', [AiDealQueryController::class, 'query'])->name('ai.deals-query');

        // Properties (Listings)
        Route::post('properties/saved-views', [ListingController::class, 'storeSavedView'])->name('listings.saved-views.store');
        Route::delete('properties/saved-views/{savedListingView}', [ListingController::class, 'destroySavedView'])->name('listings.saved-views.destroy');
        Route::post('properties/listing-types', [ListingController::class, 'storeListingType'])->name('listings.listing-types.store');
        Route::delete('properties/listing-types/{type}', [ListingController::class, 'destroyListingType'])->name('listings.listing-types.destroy');
        Route::post('properties/listing-statuses', [ListingController::class, 'storeListingStatus'])->name('listings.listing-statuses.store');
        Route::delete('properties/listing-statuses/{status}', [ListingController::class, 'destroyListingStatus'])->name('listings.listing-statuses.destroy');
        Route::post('properties/custom-fields', [ListingController::class, 'storeCustomField'])->name('listings.custom-fields.store');
        Route::patch('properties/custom-fields/{key}', [ListingController::class, 'updateCustomField'])->name('listings.custom-fields.update');
        Route::delete('properties/custom-fields/{key}', [ListingController::class, 'destroyCustomField'])->name('listings.custom-fields.destroy');
        Route::post('properties/search-mls', [ListingController::class, 'searchMls'])->middleware('feature:idx')->name('listings.search-mls');
        Route::patch('properties/office-id', [ListingController::class, 'updateOfficeId'])->name('listings.office-id.update');
        Route::post('properties/hotsheets', [ListingController::class, 'storeHotsheet'])->name('listings.hotsheets.store');
        Route::patch('properties/hotsheets/{hotsheet}', [ListingController::class, 'updateHotsheet'])->name('listings.hotsheets.update');
        Route::delete('properties/hotsheets/{hotsheet}', [ListingController::class, 'destroyHotsheet'])->name('listings.hotsheets.destroy');
        // New listing UI is now a modal on the index page; the /create route
        // still exists as a named alias so route('crm.listings.create') resolves,
        // but it just lands on the index.
        Route::get('properties/create', fn () => redirect()->route('crm.listings.index'))->name('listings.create');
        // Pretty tab URLs — /properties/office, /properties/mine, /properties/all.
        // Declared before the resource route so the {tab} word-segments win over
        // the numeric {listing} resource binding.
        Route::get('properties/{tab}', [ListingController::class, 'index'])
            ->whereIn('tab', ['mine', 'office', 'all'])
            ->name('listings.tab');
        Route::resource('properties', ListingController::class)->parameters(['properties' => 'listing'])->except(['create'])->names([
            'index' => 'listings.index',
            'store' => 'listings.store',
            'show' => 'listings.show',
            'edit' => 'listings.edit',
            'update' => 'listings.update',
            'destroy' => 'listings.destroy',
        ]);

        // Companies
        Route::resource('companies', CompanyController::class);

        // Pipeline management (settings)
        Route::post('pipeline-settings', [PipelineController::class, 'store'])->name('pipelines.store');
        Route::patch('pipeline-settings/{pipeline}', [PipelineController::class, 'update'])->name('pipelines.update');
        Route::delete('pipeline-settings/{pipeline}', [PipelineController::class, 'destroy'])->name('pipelines.destroy');
        Route::post('pipeline-settings/{pipeline}/stages', [PipelineController::class, 'storeStage'])->name('pipelines.stages.store');
        Route::patch('pipeline-settings/{pipeline}/stages/{stage}', [PipelineController::class, 'updateStage'])->name('pipelines.stages.update');
        Route::delete('pipeline-settings/{pipeline}/stages/{stage}', [PipelineController::class, 'destroyStage'])->name('pipelines.stages.destroy');
        Route::post('pipeline-settings/{pipeline}/stages/reorder', [PipelineController::class, 'reorderStages'])->name('pipelines.stages.reorder');

        // Deal Board
        Route::post('deals/deal-types', [DealController::class, 'storeDealType'])->name('deals.deal-types.store');
        Route::post('deals/custom-fields', [DealController::class, 'storeCustomField'])->name('deals.custom-fields.store');
        Route::patch('deals/custom-fields/{key}', [DealController::class, 'updateCustomField'])->name('deals.custom-fields.update');
        Route::delete('deals/custom-fields/{key}', [DealController::class, 'destroyCustomField'])->name('deals.custom-fields.destroy');
        Route::resource('deals', DealController::class, ['parameters' => ['deals' => 'deal']])->except(['create'])->names([
            'index' => 'deals.index',
            'store' => 'deals.store',
            'show' => 'deals.show',
            'edit' => 'deals.edit',
            'update' => 'deals.update',
            'destroy' => 'deals.destroy',
        ]);
        Route::patch('deals/{deal}/stage', [DealController::class, 'updateStage'])->name('deals.stage');

        // Notes (polymorphic)
        Route::post('notes', [NoteController::class, 'store'])->name('notes.store');
        Route::patch('notes/{note}', [NoteController::class, 'update'])->name('notes.update');
        Route::delete('notes/{note}', [NoteController::class, 'destroy'])->name('notes.destroy');
        Route::patch('notes/{note}/pin', [NoteController::class, 'togglePin'])->name('notes.pin');

        // Tasks
        Route::get('tasks', [TaskController::class, 'index'])->name('tasks.index');
        Route::post('tasks', [TaskController::class, 'store'])->name('tasks.store');
        Route::patch('tasks/{task}', [TaskController::class, 'update'])->name('tasks.update');
        Route::delete('tasks/{task}', [TaskController::class, 'destroy'])->name('tasks.destroy');
        Route::patch('tasks/{task}/complete', [TaskController::class, 'toggleComplete'])->name('tasks.complete');

        // Action Plans (automation sequences)
        Route::get('action-plans', [ActionPlanController::class, 'index'])->name('action-plans.index');
        Route::post('action-plans', [ActionPlanController::class, 'store'])->name('action-plans.store');
        Route::get('action-plans/{actionPlan}/edit', [ActionPlanController::class, 'edit'])->name('action-plans.edit');
        Route::patch('action-plans/{actionPlan}', [ActionPlanController::class, 'update'])->name('action-plans.update');
        Route::patch('action-plans/{actionPlan}/active', [ActionPlanController::class, 'toggleActive'])->name('action-plans.active');
        Route::delete('action-plans/{actionPlan}', [ActionPlanController::class, 'destroy'])->name('action-plans.destroy');
        // Steps
        Route::post('action-plans/{actionPlan}/steps', [ActionPlanStepController::class, 'store'])->name('action-plans.steps.store');
        Route::post('action-plans/{actionPlan}/steps/reorder', [ActionPlanStepController::class, 'reorder'])->name('action-plans.steps.reorder');
        Route::patch('action-plans/{actionPlan}/steps/{step}', [ActionPlanStepController::class, 'update'])->name('action-plans.steps.update');
        Route::delete('action-plans/{actionPlan}/steps/{step}', [ActionPlanStepController::class, 'destroy'])->name('action-plans.steps.destroy');
        // Enrollments
        Route::post('action-plan-enrollments', [ActionPlanEnrollmentController::class, 'store'])->name('action-plan-enrollments.store');
        Route::post('action-plan-enrollments/bulk', [ActionPlanEnrollmentController::class, 'bulkStore'])->name('action-plan-enrollments.bulk');
        Route::patch('action-plan-enrollments/{enrollment}/stop', [ActionPlanEnrollmentController::class, 'stop'])->name('action-plan-enrollments.stop');

        // Call Logs
        Route::post('call-logs', [CallLogController::class, 'store'])->name('call-logs.store');
        Route::patch('call-logs/{callLog}', [CallLogController::class, 'update'])->name('call-logs.update');
        Route::delete('call-logs/{callLog}', [CallLogController::class, 'destroy'])->name('call-logs.destroy');

        // Email Logs
        Route::post('email-logs', [EmailLogController::class, 'store'])->name('email-logs.store');
        Route::patch('email-logs/{emailLog}', [EmailLogController::class, 'update'])->name('email-logs.update');
        Route::delete('email-logs/{emailLog}', [EmailLogController::class, 'destroy'])->name('email-logs.destroy');

        // SMS Logs
        Route::post('sms-logs', [SmsLogController::class, 'store'])->name('sms-logs.store');
        Route::patch('sms-logs/{smsLog}', [SmsLogController::class, 'update'])->name('sms-logs.update');
        Route::delete('sms-logs/{smsLog}', [SmsLogController::class, 'destroy'])->name('sms-logs.destroy');

        // Activities (timeline pin/delete)
        Route::patch('activities/{activity}/pin', [ActivityController::class, 'togglePin'])->name('activities.pin');
        Route::patch('activities/{activity}', [ActivityController::class, 'update'])->name('activities.update');
        Route::delete('activities/{activity}', [ActivityController::class, 'destroy'])->name('activities.destroy');

        // Calendar Feeds (iCal import)
        Route::get('calendar-feeds', [CalendarFeedController::class, 'index'])->name('calendar-feeds.index');
        Route::post('calendar-feeds', [CalendarFeedController::class, 'store'])->name('calendar-feeds.store');
        Route::delete('calendar-feeds/{calendarFeed}', [CalendarFeedController::class, 'destroy'])->name('calendar-feeds.destroy');
        Route::post('calendar-feeds/{calendarFeed}/sync', [CalendarFeedController::class, 'sync'])->name('calendar-feeds.sync');
        Route::get('calendar/oauth/google/redirect', [CalendarFeedController::class, 'redirectToGoogle'])->name('calendar.oauth.google.redirect');
        Route::get('calendar/oauth/google/callback', [CalendarFeedController::class, 'handleGoogleCallback'])->name('calendar.oauth.google.callback');
        Route::delete('calendar-accounts/{account}', [CalendarFeedController::class, 'disconnectAccount'])->name('calendar-accounts.disconnect');

        // Calendar (meetings/events)
        Route::get('calendar', [MeetingController::class, 'index'])->name('calendar.index');
        Route::get('calendar/export-ical', [MeetingController::class, 'exportIcal'])->name('calendar.export-ical');
        Route::post('calendar', [MeetingController::class, 'store'])->name('calendar.store');
        Route::patch('calendar/{meeting}', [MeetingController::class, 'update'])->name('calendar.update');
        Route::delete('calendar/{meeting}', [MeetingController::class, 'destroy'])->name('calendar.destroy');
        Route::patch('calendar/{meeting}/complete', [MeetingController::class, 'toggleComplete'])->name('calendar.complete');

        // IDX
        Route::get('idx', [IdxController::class, 'index'])->name('idx.index');
        // Per-tab routes so each section is linkable / bookmarkable.
        // "library" is the public URL for the internal "searches" tab.
        Route::get('idx/{tab}', [IdxController::class, 'index'])
            ->whereIn('tab', ['connections', 'licenses', 'widgets', 'library', 'wordpress'])
            ->name('idx.tab');
        // No user-facing connection create route — connections are provisioned by an
        // admin from an MlsConnectionRequest. Users only adjust constraints/activation.
        Route::patch('idx/connections/{idxConnection}', [IdxConnectionController::class, 'update'])->name('idx.connections.update');
        Route::delete('idx/connections/{idxConnection}', [IdxConnectionController::class, 'destroy'])->name('idx.connections.destroy');
        Route::post('idx/connections/{idxConnection}/test', [IdxConnectionController::class, 'test'])->name('idx.connections.test');
        // feature:idx gate is enforced at the controller level (MlsConnectionRequestController).
        Route::post('idx/connection-requests', [MlsConnectionRequestController::class, 'store'])->name('idx.connection-requests.store');
        Route::delete('idx/connection-requests/{mlsConnectionRequest}', [MlsConnectionRequestController::class, 'destroy'])->name('idx.connection-requests.destroy');
        Route::post('idx/searches', [IdxSearchController::class, 'store'])->name('idx.searches.store');
        Route::patch('idx/searches/{idxSearch}', [IdxSearchController::class, 'update'])->name('idx.searches.update');
        Route::delete('idx/searches/{idxSearch}', [IdxSearchController::class, 'destroy'])->name('idx.searches.destroy');
        Route::post('idx/widgets', [IdxWidgetController::class, 'store'])->name('idx.widgets.store');
        Route::patch('idx/widgets/{idxWidget}', [IdxWidgetController::class, 'update'])->name('idx.widgets.update');
        Route::delete('idx/widgets/{idxWidget}', [IdxWidgetController::class, 'destroy'])->name('idx.widgets.destroy');
        Route::post('idx/widgets/defaults', [IdxWidgetController::class, 'saveDefaults'])->name('idx.widgets.defaults');
        Route::get('idx/widgets/preview', [IdxWidgetController::class, 'preview'])->name('idx.widgets.preview');
        Route::get('idx/widget/create', [IdxWidgetController::class, 'create'])->name('idx.widget.create');
        Route::get('idx/widget/{idxWidget}', [IdxWidgetController::class, 'edit'])->name('idx.widget.edit');
        Route::post('idx/licenses/purchase', [IdxLicenseController::class, 'purchase'])->name('idx.licenses.purchase');
        Route::post('idx/licenses/{license}/activate', [IdxLicenseController::class, 'activate'])->name('idx.licenses.activate');
        Route::post('idx/licenses/{license}/deactivate', [IdxLicenseController::class, 'deactivate'])->name('idx.licenses.deactivate');

        // Support
        Route::get('support/consultation', [SupportController::class, 'consultation'])->name('support.consultation');
        Route::post('support/consultation', [SupportController::class, 'store'])->name('support.consultation.store');

        // Notifications
        Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
        Route::post('notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');
        Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');

        // Settings — each tab gets its own route so it's linkable/bookmarkable.
        Route::get('settings', [SettingsController::class, 'index'])->name('settings');
        Route::get('settings/{tab}', [SettingsController::class, 'index'])
            ->whereIn('tab', ['profile', 'subscription', 'phone', 'email', '10dlc', 'mls', 'lead-imports', 'calling-scripts', 'voicemails', 'modules'])
            ->name('settings.tab');
        Route::get('settings/modules/{module}', [SettingsController::class, 'modules'])
            ->whereIn('module', ['contact', 'deal', 'listing'])
            ->name('settings.modules');
        Route::patch('settings/profile', [SettingsController::class, 'updateProfile'])->name('settings.profile');
        Route::post('settings/avatar', [SettingsController::class, 'uploadAvatar'])->name('settings.avatar.upload');
        Route::delete('settings/avatar', [SettingsController::class, 'removeAvatar'])->name('settings.avatar.remove');
        Route::patch('settings/notifications', [SettingsController::class, 'updateNotificationPreferences'])->name('settings.notifications');
        Route::patch('settings/email', [SettingsController::class, 'updateEmailSettings'])->name('settings.email');

        // Branded email (user-owned Resend API key)
        Route::patch('settings/resend', [SettingsController::class, 'updateResendKey'])->name('settings.resend.update');
        Route::post('settings/resend/test', [SettingsController::class, 'testResend'])->name('settings.resend.test');
        Route::delete('settings/resend', [SettingsController::class, 'removeResendKey'])->name('settings.resend.remove');
        // Per-user platform sending alias ({alias}.updates@domain) + display name
        Route::patch('settings/sender-alias', [SettingsController::class, 'updateSenderAlias'])->name('settings.sender-alias.update');

        // Security: active sessions, access history, 2FA
        Route::get('security/sessions', [SecurityController::class, 'sessions'])->name('security.sessions');
        Route::delete('security/sessions/{sessionId}', [SecurityController::class, 'revokeSession'])->name('security.sessions.revoke');
        Route::get('security/access-history', [SecurityController::class, 'accessHistory'])->name('security.access-history');
        Route::get('security/2fa/status', [SecurityController::class, 'twoFactorStatus'])->name('security.2fa.status');
        Route::post('security/2fa/generate', [SecurityController::class, 'twoFactorGenerate'])->name('security.2fa.generate');
        Route::post('security/2fa/confirm', [SecurityController::class, 'twoFactorConfirm'])->name('security.2fa.confirm');
        Route::delete('security/2fa', [SecurityController::class, 'twoFactorDisable'])->name('security.2fa.disable');
        Route::get('security/2fa/recovery-codes', [SecurityController::class, 'twoFactorRecoveryCodes'])->name('security.2fa.recovery-codes');
        Route::post('security/2fa/recovery-codes', [SecurityController::class, 'twoFactorRegenerateRecoveryCodes'])->name('security.2fa.recovery-codes.regenerate');

        // Connected accounts (SSO + linked external services)
        Route::get('accounts/connections', [ConnectedAccountsController::class, 'index'])->name('accounts.connections');
        Route::get('accounts/google/link/redirect', [ConnectedAccountsController::class, 'linkGoogleRedirect'])->name('accounts.google.link.redirect');
        Route::get('accounts/google/link/callback', [ConnectedAccountsController::class, 'linkGoogleCallback'])->name('accounts.google.link.callback');
        Route::delete('accounts/google', [ConnectedAccountsController::class, 'disconnectGoogle'])->name('accounts.google.disconnect');
        Route::get('accounts/oauth-config/{provider}', [ConnectedAccountsController::class, 'oauthConfig'])
            ->whereIn('provider', ['google', 'microsoft'])
            ->name('accounts.oauth-config');
        Route::patch('accounts/oauth-config/{provider}', [ConnectedAccountsController::class, 'updateOauthConfig'])
            ->whereIn('provider', ['google', 'microsoft'])
            ->name('accounts.oauth-config.update');

        // Lead Imports
        Route::post('lead-imports', [LeadImportController::class, 'upload'])->name('lead-imports.upload');
        Route::get('lead-imports/sample', [LeadImportController::class, 'sample'])->name('lead-imports.sample');
        Route::get('lead-imports/{leadImport}', [LeadImportController::class, 'show'])->name('lead-imports.show');
        Route::post('lead-imports/{leadImport}/process', [LeadImportController::class, 'process'])->name('lead-imports.process');
        Route::delete('lead-imports/{leadImport}', [LeadImportController::class, 'destroy'])->name('lead-imports.destroy');

        // Subscription
        Route::post('subscription/checkout', [SubscriptionController::class, 'checkout'])->name('subscription.checkout');
        Route::get('subscription/checkout/success', [SubscriptionController::class, 'checkoutSuccess'])->name('subscription.checkout-success');
        Route::post('subscription/portal', [SubscriptionController::class, 'portal'])->name('subscription.portal');
        Route::post('subscription/start-trial', [SubscriptionController::class, 'startTrial'])->name('subscription.start-trial');

        // Phone-credit top-ups
        Route::post('credits/checkout', [CreditPackageController::class, 'checkout'])->name('credits.checkout');
        Route::get('credits/checkout/success', [CreditPackageController::class, 'checkoutSuccess'])->name('credits.checkout-success');

        // Team seats (per-seat billing)
        Route::post('team/seats', [TeamSeatController::class, 'update'])->name('team.seats.update');

        // Tags
        Route::post('tags', [TagController::class, 'store'])->name('tags.store');
        Route::delete('tags/{tag}', [TagController::class, 'destroy'])->name('tags.destroy');

        // Agent Websites
        Route::get('tools', fn () => Inertia::render('Crm/Tools/Index'))->name('tools.index');

        // Guided first-run wizard — full-screen create flow (domain → features → MLS → …).
        // feature:websites gate is enforced at the controller level (OnboardingController).
        Route::get('onboarding', [OnboardingController::class, 'show'])->name('onboarding');
        Route::get('onboarding/communities', [OnboardingController::class, 'communities'])->name('onboarding.communities');
        Route::post('onboarding', [OnboardingController::class, 'store'])->name('onboarding.store');

        // feature:websites gate is enforced at the controller level (AgentWebsiteController, except index).
        Route::get('websites', [AgentWebsiteController::class, 'index'])->name('websites.index');
        Route::post('websites', [AgentWebsiteController::class, 'store'])->name('websites.store');
        // Editor — a dedicated UUID route per tab: /crm/websites/{uuid}/{section}
        Route::get('websites/{agentWebsite:uuid}/{section?}', [AgentWebsiteController::class, 'edit'])
            ->whereUuid('agentWebsite')
            ->where('section', 'general|branding|social|contacts|domain|delete|pages|menus|website-listings|featured-listings|sold-listings|team|condo-directory|new-developments|translations|testimonials|blog|areas|media|seo|idx-settings|idx-restrictions|idx-detail|idx-marketing|idx-leads|idx-css')
            ->name('websites.edit');
        // Page block editor — its own deep link: /crm/websites/{uuid}/pages/{page}
        Route::get('websites/{agentWebsite:uuid}/pages/{page}', [AgentWebsiteController::class, 'editPage'])
            ->whereUuid('agentWebsite')
            ->where('page', '[a-z0-9-]+')
            ->name('websites.edit-page');
        // Blog post editor — its own deep link: /crm/websites/{uuid}/blog/{post}
        Route::get('websites/{agentWebsite:uuid}/blog/{blogPost}', [AgentWebsiteController::class, 'editBlogPost'])
            ->whereUuid('agentWebsite')
            ->whereNumber('blogPost')
            ->name('websites.edit-blog-post');
        Route::patch('websites/{agentWebsite}', [AgentWebsiteController::class, 'update'])->name('websites.update');
        Route::delete('websites/{agentWebsite}', [AgentWebsiteController::class, 'destroy'])->name('websites.destroy');
        Route::post('websites/{agentWebsite}/photo', [AgentWebsiteController::class, 'uploadPhoto'])->name('websites.upload-photo');
        Route::post('websites/{agentWebsite}/hero', [AgentWebsiteController::class, 'uploadHero'])->name('websites.upload-hero');
        Route::post('websites/{agentWebsite}/logo', [AgentWebsiteController::class, 'uploadBrokerageLogo'])->name('websites.upload-logo');
        Route::post('websites/{agentWebsite}/site-logo', [AgentWebsiteController::class, 'uploadSiteLogo'])->name('websites.upload-site-logo');
        Route::post('websites/ai/generate-all', [AiWebsiteController::class, 'generateAll'])->name('websites.ai.generate-all');
        Route::post('websites/{agentWebsite}/ai/generate-field', [AiWebsiteController::class, 'generateField'])->name('websites.ai.generate-field');

        // Landing Pages (block-based lead-capture pages)
        Route::get('landing-pages', [LandingPageController::class, 'index'])->name('landing-pages.index');
        // feature:websites gate is enforced at the controller level (LandingPageController, except index).
        Route::get('landing-pages/create', [LandingPageController::class, 'create'])->name('landing-pages.create');
        Route::post('landing-pages', [LandingPageController::class, 'store'])->name('landing-pages.store');
        Route::post('landing-pages/generate', [LandingPageController::class, 'generate'])->name('landing-pages.generate');
        Route::get('landing-pages/{landingPage:uuid}/edit', [LandingPageController::class, 'edit'])->name('landing-pages.edit');
        Route::patch('landing-pages/{landingPage:uuid}', [LandingPageController::class, 'update'])->name('landing-pages.update');
        Route::get('landing-pages/{landingPage:uuid}/media', [LandingPageController::class, 'listMedia'])->name('landing-pages.media');
        Route::post('landing-pages/{landingPage:uuid}/media', [LandingPageController::class, 'uploadMedia'])->name('landing-pages.media.upload');
        Route::delete('landing-pages/{landingPage:uuid}/media', [LandingPageController::class, 'deleteMedia'])->name('landing-pages.media.delete');
        Route::post('landing-pages/{landingPage:uuid}/publish', [LandingPageController::class, 'publish'])->name('landing-pages.publish');
        Route::delete('landing-pages/{landingPage:uuid}', [LandingPageController::class, 'destroy'])->name('landing-pages.destroy');

        // IDX Squeeze / Listing Lead Pages (own tab + flow; single-listing Blade design, no block editor)
        Route::get('listing-pages', [ListingPageController::class, 'index'])->name('listing-pages.index');
        Route::get('listing-pages/create', [ListingPageController::class, 'create'])->name('listing-pages.create');
        Route::post('listing-pages', [ListingPageController::class, 'store'])->name('listing-pages.store');
        Route::get('listing-pages/{listingPage:uuid}/edit', [ListingPageController::class, 'edit'])->name('listing-pages.edit');
        Route::patch('listing-pages/{listingPage:uuid}', [ListingPageController::class, 'update'])->name('listing-pages.update');
        Route::post('listing-pages/{listingPage:uuid}/publish', [ListingPageController::class, 'publish'])->name('listing-pages.publish');
        Route::delete('listing-pages/{listingPage:uuid}', [ListingPageController::class, 'destroy'])->name('listing-pages.destroy');

        // Team Chat
        Route::get('team-chat', [TeamChatController::class, 'index'])->name('team-chat.index');
        Route::get('team-chat/latest-id', [TeamChatController::class, 'latestId'])->name('team-chat.latest-id');
        Route::post('team-chat', [TeamChatController::class, 'store'])->name('team-chat.store')->middleware('throttle:60,1');
        Route::patch('team-chat/{id}', [TeamChatController::class, 'update'])->name('team-chat.update');
        Route::delete('team-chat/{id}', [TeamChatController::class, 'destroy'])->name('team-chat.destroy');
        Route::post('team-chat/{id}/react', [TeamChatController::class, 'react'])->name('team-chat.react');
        Route::post('team-chat/{id}/unreact', [TeamChatController::class, 'unreact'])->name('team-chat.unreact');
        Route::post('team-chat/typing', [TeamChatController::class, 'typing'])->name('team-chat.typing')->middleware('throttle:30,1');
        Route::get('team-chat/contacts', [TeamChatController::class, 'searchContacts'])->name('team-chat.contacts');
        Route::get('team-chat/listings', [TeamChatController::class, 'searchListings'])->name('team-chat.listings');
        Route::get('team-chat/deals', [TeamChatController::class, 'searchDeals'])->name('team-chat.deals');
        Route::get('team-chat/context', [TeamChatController::class, 'contextMessages'])->name('team-chat.context');

        // Unified Inbox
        Route::get('inbox', [InboxController::class, 'index'])->name('inbox.index');
        Route::get('inbox/search-contacts', [InboxController::class, 'searchContacts'])->name('inbox.search-contacts');
        Route::get('inbox/search-listings', [InboxController::class, 'searchListings'])->name('inbox.search-listings');
        Route::get('inbox/search-deals', [InboxController::class, 'searchDeals'])->name('inbox.search-deals');
        Route::get('voicemail-drops', [VoicemailDropController::class, 'index'])->name('voicemail-drops.index');
        Route::post('voicemail-drops', [VoicemailDropController::class, 'store'])->name('voicemail-drops.store');
        Route::delete('voicemail-drops/{voicemailDrop}', [VoicemailDropController::class, 'destroy'])->name('voicemail-drops.destroy');
        Route::post('voicemail-drops/send', [VoicemailDropController::class, 'send'])->name('voicemail-drops.send');
        Route::get('inbox/{contact}', [InboxController::class, 'thread'])->name('inbox.thread');

        // Email Inbox
        Route::get('email', [EmailInboxController::class, 'inbox'])->name('email.index');
        Route::get('email/threads/{emailThread}', [EmailInboxController::class, 'thread'])->name('email.thread');
        Route::post('email/send', [EmailInboxController::class, 'send'])->name('email.send');
        Route::patch('email/threads/{emailThread}/link', [EmailInboxController::class, 'linkToContact'])->name('email.link');
        Route::post('email/threads/{emailThread}/archive', [EmailInboxController::class, 'archive'])->name('email.archive');

        // Email OAuth & Accounts
        Route::get('email/oauth/google/redirect', [EmailAccountController::class, 'redirectToGoogle'])->name('email.oauth.google.redirect');
        Route::get('email/oauth/google/callback', [EmailAccountController::class, 'handleGoogleCallback'])->name('email.oauth.google.callback');
        Route::get('email/accounts', [EmailAccountController::class, 'index'])->name('email.accounts');
        Route::delete('email/accounts/{emailAccount}', [EmailAccountController::class, 'disconnect'])->name('email.accounts.disconnect');
        Route::post('email/accounts/{emailAccount}/default', [EmailAccountController::class, 'setDefault'])->name('email.accounts.default');
        Route::post('email/accounts/{emailAccount}/sync', [EmailAccountController::class, 'triggerSync'])->name('email.accounts.sync');

        // Phone Numbers & SMS
        Route::get('phone-numbers/search', [PhoneNumberController::class, 'searchAvailable'])->name('phone-numbers.search');
        Route::post('phone-numbers', [PhoneNumberController::class, 'purchase'])->middleware('feature:phone')->name('phone-numbers.purchase');
        Route::post('phone-numbers/{phoneNumber}/release', [PhoneNumberController::class, 'release'])->name('phone-numbers.release');
        Route::post('phone-numbers/{phoneNumber}/default', [PhoneNumberController::class, 'setDefault'])->name('phone-numbers.default');
        Route::get('sms', [SmsController::class, 'inbox'])->name('sms.index');
        Route::get('contacts/{contact}/sms', [SmsController::class, 'thread'])->name('sms.thread');
        Route::post('sms', [SmsController::class, 'send'])->middleware('feature:phone')->name('sms.send');
        Route::patch('contacts/{contact}/sms-consent', [SmsController::class, 'updateConsent'])->name('sms.consent');
        Route::patch('contacts/{contact}/dnd', [ContactController::class, 'updateDnd'])->name('contacts.dnd');

        // Voice (WebRTC dialer + Call Control)
        Route::get('voice/token', [VoiceController::class, 'getToken'])->name('voice.token');
        Route::post('voice/call', [VoiceController::class, 'initiateCall'])->name('voice.call');
        Route::patch('voice/call/{callRecord}/attach', [VoiceController::class, 'attachCallControl'])->name('voice.attach');
        Route::post('voice/call/{callRecord}/control', [VoiceController::class, 'callControl'])->name('voice.control');
        Route::post('voice/call/{callRecord}/end', [VoiceController::class, 'endCall'])->name('voice.end');
        Route::get('voice/lookup', [VoiceController::class, 'lookupCaller'])->name('voice.lookup');

        // Power Dialer — session orchestration on top of the single-call WebRTC plumbing above.
        Route::get('dialer/sessions', [DialerSessionController::class, 'index'])->name('dialer.sessions.index');
        Route::post('dialer/sessions', [DialerSessionController::class, 'store'])->name('dialer.sessions.store');
        Route::post('dialer/contact/{contact}', [DialerSessionController::class, 'dialContact'])->name('dialer.contact');
        Route::get('dialer/sessions/active', [DialerSessionController::class, 'active'])->name('dialer.sessions.active');
        Route::get('dialer/sessions/{dialerSession}', [DialerSessionController::class, 'show'])->name('dialer.sessions.show');
        Route::delete('dialer/sessions/{dialerSession}', [DialerSessionController::class, 'destroy'])->name('dialer.sessions.destroy');
        Route::post('dialer/sessions/{dialerSession}/disposition', [DialerSessionController::class, 'disposition'])->name('dialer.sessions.disposition');
        Route::post('dialer/sessions/{dialerSession}/skip', [DialerSessionController::class, 'skip'])->name('dialer.sessions.skip');
        Route::post('dialer/sessions/{dialerSession}/pause', [DialerSessionController::class, 'pause'])->name('dialer.sessions.pause');
        Route::post('dialer/sessions/{dialerSession}/resume', [DialerSessionController::class, 'resume'])->name('dialer.sessions.resume');
        Route::post('dialer/sessions/{dialerSession}/end', [DialerSessionController::class, 'end'])->name('dialer.sessions.end');
        Route::post('dialer/sessions/{dialerSession}/answers', [DialerSessionController::class, 'saveAnswers'])->name('dialer.sessions.answers');
        Route::patch('dialer/sessions/{dialerSession}/script', [DialerSessionController::class, 'updateScript'])->name('dialer.sessions.script');

        // Voicemails (audio clips used by VM Drop)
        Route::get('voicemails', [VoicemailController::class, 'index'])->name('voicemails.index');
        Route::post('voicemails', [VoicemailController::class, 'store'])->name('voicemails.store');
        Route::delete('voicemails/{voicemail}', [VoicemailController::class, 'destroy'])->name('voicemails.destroy');
        Route::patch('voicemails/{voicemail}/default', [VoicemailController::class, 'setDefault'])->name('voicemails.default');

        // Calling Scripts (used by the Power Dialer modal)
        Route::get('calling-scripts', [CallingScriptController::class, 'index'])->name('calling-scripts.index');
        Route::post('calling-scripts', [CallingScriptController::class, 'store'])->name('calling-scripts.store');
        Route::put('calling-scripts/{callingScript}', [CallingScriptController::class, 'update'])->name('calling-scripts.update');
        Route::delete('calling-scripts/{callingScript}', [CallingScriptController::class, 'destroy'])->name('calling-scripts.destroy');

        // 10DLC Registration (Phase 3)
        Route::post('10dlc/brand', [TenDlcController::class, 'storeBrand'])->name('10dlc.brand.store');
        Route::post('10dlc/campaign', [TenDlcController::class, 'storeCampaign'])->name('10dlc.campaign.store');
        Route::get('10dlc/status', [TenDlcController::class, 'checkStatus'])->name('10dlc.status');

        // Account context switching
        Route::post('account/switch', [AccountContextController::class, 'switch'])->name('account.switch');

        // Team — the index page is open (it renders an upgrade state for users
        // without the Team plan); founding a team requires the user's own Team
        // plan (they become the billing owner); all other management +
        // collaboration requires the team.plan entitlement (own plan OR active
        // membership of a team whose owner is on the Team plan).
        Route::get('team', [TeamController::class, 'index'])->name('team.index');
        Route::post('team', [TeamController::class, 'store'])->middleware('feature:team')->name('team.store');
        Route::middleware('team.plan')->group(function () {
            Route::patch('team/{team}', [TeamController::class, 'update'])->name('team.update');
            Route::patch('team/{team}/mls-office-id', [TeamController::class, 'updateMlsOfficeId'])->name('team.mls-office-id.update');
            Route::delete('team/{team}', [TeamController::class, 'destroy'])->name('team.destroy');
            Route::patch('team/members/{teamMember}/role', [TeamMemberController::class, 'updateRole'])->name('team.members.role');
            Route::patch('team/{team}/role-permissions', [TeamController::class, 'updateRolePermissions'])->name('team.role-permissions.update');
            Route::post('team/{team}/roles', [TeamController::class, 'addRole'])->name('team.roles.store');
            Route::delete('team/{team}/roles', [TeamController::class, 'removeRole'])->name('team.roles.destroy');
            Route::patch('team/members/{teamMember}/toggle-active', [TeamController::class, 'toggleActive'])->name('team.members.toggle-active');
            Route::delete('team/members/{teamMember}', [TeamMemberController::class, 'remove'])->name('team.members.remove');
            Route::post('team/invitations', [TeamInvitationController::class, 'store'])->name('team.invitations.store');
            Route::post('team/invitations/{teamInvitation}/resend', [TeamInvitationController::class, 'resend'])->name('team.invitations.resend');
            Route::delete('team/invitations/{teamInvitation}', [TeamInvitationController::class, 'destroy'])->name('team.invitations.destroy');
        });
    });

    // Team invitation acceptance
    Route::get('/team/invite/{token}', [TeamInvitationController::class, 'accept'])->name('team.invite.accept');

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Visitor Google sign-in broker — ONE platform OAuth client serves every agent
// site (incl. custom domains). These two live on the APP domain because Google
// only redirects to registered URIs; the flow finishes on the site's origin at
// agent-site.visitor.google-complete.
Route::get('/visitor-auth/google/redirect', [SiteVisitorGoogleController::class, 'redirect'])
    ->name('visitor-auth.google.redirect')->middleware('throttle:20,1');
Route::get('/visitor-auth/google/callback', [SiteVisitorGoogleController::class, 'callback'])
    ->name('visitor-auth.google.callback')->middleware('throttle:20,1');

// Public, token-based unsubscribe from property-alert emails (no auth).
Route::get('/alerts/unsubscribe/{token}', PropertyAlertUnsubscribeController::class)
    ->name('property-alerts.unsubscribe')
    ->where('token', '[A-Za-z0-9]+')
    ->middleware('throttle:30,1');

// Public, token-based unsubscribe from automated (Action Plan) emails (no auth).
Route::get('/email/unsubscribe/{token}', ContactEmailUnsubscribeController::class)
    ->name('email.unsubscribe')
    ->where('token', '[A-Za-z0-9]+')
    ->middleware('throttle:30,1');

// Public landing pages (block-based lead-capture pages)
Route::get('l/{slug}', [PublicLandingPageController::class, 'show'])->name('landing.show');
Route::get('l/{slug}/get-started', [PublicLandingPageController::class, 'flow'])->name('landing.flow');
Route::post('l/{slug}', [PublicLandingPageController::class, 'submit'])->name('landing.submit')->middleware('throttle:20,1');

// Public agent websites
Route::prefix('site/{slug}')->name('agent-site.')->group(function () {
    Route::get('/', [PublicWebsiteController::class, 'show'])->name('home')->defaults('page', 'home');
    Route::get('/about', [PublicWebsiteController::class, 'show'])->name('about')->defaults('page', 'about');
    Route::get('/buy', [PublicWebsiteController::class, 'show'])->name('buy')->defaults('page', 'buy');
    Route::get('/sell', [PublicWebsiteController::class, 'show'])->name('sell')->defaults('page', 'sell');
    Route::get('/contact', [PublicWebsiteController::class, 'show'])->name('contact')->defaults('page', 'contact');
    Route::get('/blog', [PublicWebsiteController::class, 'show'])->name('blog')->defaults('page', 'blog');
    Route::get('/blog/{postSlug}', [PublicWebsiteController::class, 'blogPost'])->name('blog.post');
    // Communities live under /neighborhoods (SEO structure: community →
    // city/zip/neighborhood sub-pages + lifestyle pages). Route NAMES keep the
    // legacy `areas` prefix so every existing route() call stays valid.
    Route::get('/neighborhoods', [PublicWebsiteController::class, 'show'])->name('areas')->defaults('page', 'areas');
    Route::get('/neighborhoods/{areaSlug}', [PublicWebsiteController::class, 'areaShow'])->name('areas.show')->where('areaSlug', '[a-z0-9-]+');
    Route::get('/neighborhoods/{areaSlug}/{subSlug}', [PublicWebsiteController::class, 'areaSubShow'])->name('areas.sub')->where(['areaSlug' => '[a-z0-9-]+', 'subSlug' => '[a-z0-9-]+']);
    // Legacy /areas URLs 301 to the new structure (link equity preserved).
    Route::get('/areas', fn (string $slug) => redirect()->route('agent-site.areas', $slug, 301));
    Route::get('/areas/{areaSlug}', fn (string $slug, string $areaSlug) => redirect()->route('agent-site.areas.show', [$slug, $areaSlug], 301));
    // Condo Directory — the platform-curated building catalog (admin-managed),
    // rendered per site when the owner enables it.
    Route::get('/condos', [PublicWebsiteController::class, 'condosIndex'])->name('condos');
    Route::get('/condos/{buildingSlug}', [PublicWebsiteController::class, 'condoBuilding'])->name('condos.building')->where('buildingSlug', '[a-z0-9-]+');
    // New Developments — same platform-curated pattern as the Condo Directory.
    Route::get('/new-developments', [PublicWebsiteController::class, 'newDevelopmentsIndex'])->name('new-developments');
    Route::get('/new-developments/{devSlug}', [PublicWebsiteController::class, 'newDevelopmentShow'])->name('new-developments.show')->where('devSlug', '[a-z0-9-]+');
    // Curated listings pages — manual (CRM) + MLS-config sections.
    Route::get('/featured-properties', [PublicWebsiteController::class, 'listingsSection'])->name('featured')->defaults('section', 'featured');
    Route::get('/past-transactions', [PublicWebsiteController::class, 'listingsSection'])->name('sold')->defaults('section', 'sold');
    // Mortgage Calculator — standalone client-side payment estimator page.
    Route::get('/mortgage-calculator', [PublicWebsiteController::class, 'mortgageCalculator'])->name('mortgage-calculator');
    // Market Trends — standalone, theme-agnostic market dashboard (live MLS data).
    Route::get('/market-trends', [PublicWebsiteController::class, 'marketTrends'])->name('market-trends');
    // Team — index + member page (bio + their listings via MLS agent id).
    Route::get('/team', [PublicWebsiteController::class, 'teamIndex'])->name('team');
    Route::get('/team/{memberSlug}', [PublicWebsiteController::class, 'teamMember'])->name('team.member')->where('memberSlug', '[a-z0-9-]+');
    // Shared property search (map + grid) — one implementation across every theme.
    Route::get('/properties', [PublicWebsiteController::class, 'properties'])->name('properties');
    Route::match(['get', 'post'], '/properties/search', [PublicWebsiteController::class, 'searchProperties'])->name('properties.search');
    // SEO listing-detail URLs (address slug — no MLS name or raw listing key).
    Route::get('/property/{propertySlug}', [PublicWebsiteController::class, 'propertyDetail'])->name('property')->where('propertySlug', '[a-z0-9-]+');
    // Legacy pre-SEO URLs (/property/{mls}/{key}) — 301 to the slug URL.
    Route::get('/property/{mlsSlug}/{mlsId}', [PublicWebsiteController::class, 'propertyDetailLegacy'])->name('property.legacy')->where(['mlsSlug' => '[a-z0-9_-]+', 'mlsId' => '[A-Za-z0-9_-]+']);
    Route::post('/contact', [PublicWebsiteController::class, 'submitContact'])->name('contact.submit');
    // Tour/showing requests → CRM lead + calendar task + timeline activity.
    Route::post('/showing-request', [PublicWebsiteController::class, 'submitShowingRequest'])->name('showing.submit')->middleware('throttle:15,1');
    Route::get('/home-valuation', [PublicWebsiteController::class, 'homeValuation'])->name('home-valuation');
    Route::get('/thank-you', [PublicWebsiteController::class, 'thankYou'])->name('thank-you');
    // Visitor accounts (header Login/Register modal, favorites, saved searches).
    Route::post('/auth/register', [SiteVisitorAuthController::class, 'register'])->name('visitor.register')->middleware('throttle:10,1');
    Route::post('/auth/login', [SiteVisitorAuthController::class, 'login'])->name('visitor.login')->middleware('throttle:10,1');
    Route::post('/auth/logout', [SiteVisitorAuthController::class, 'logout'])->name('visitor.logout');
    Route::get('/account', [SiteVisitorAccountController::class, 'show'])->name('visitor.account');
    Route::get('/account/favorites', [SiteVisitorAccountController::class, 'favoriteIds'])->name('visitor.favorites.index');
    Route::post('/account/favorites', [SiteVisitorAccountController::class, 'toggleFavorite'])->name('visitor.favorites.toggle');
    Route::delete('/account/favorites/{favorite}', [SiteVisitorAccountController::class, 'destroyFavorite'])->name('visitor.favorites.destroy');
    Route::post('/account/searches', [SiteVisitorAccountController::class, 'storeSearch'])->name('visitor.searches.store');
    Route::delete('/account/searches/{savedSearch}', [SiteVisitorAccountController::class, 'destroySearch'])->name('visitor.searches.destroy');
    Route::post('/account/track-view', [SiteVisitorAccountController::class, 'trackView'])->name('visitor.track-view');
    Route::post('/account/phone', [SiteVisitorAccountController::class, 'updatePhone'])->name('visitor.phone');
    Route::get('/auth/google/complete', [SiteVisitorGoogleController::class, 'complete'])->name('visitor.google-complete');
    Route::get('/robots.txt', [PublicWebsiteController::class, 'robotsTxt'])->name('robots-txt');
    Route::get('/llms.txt', [PublicWebsiteController::class, 'llmsTxt'])->name('llms-txt');
    Route::get('/sitemap.xml', [PublicWebsiteController::class, 'sitemap'])->name('sitemap');
    Route::get('/sitemap-{section}.xml', [PublicWebsiteController::class, 'sitemapSection'])
        ->where('section', 'pages|neighborhoods|condos|new-developments|posts')
        ->name('sitemap.section');
    Route::get('/{customPage}', [PublicWebsiteController::class, 'customPage'])->name('custom-page')->where('customPage', '[a-z0-9-]+');
});

// ─── Admin panel ─────────────────────────────────────────────────────────
// Gated by EnsureAdmin middleware (alias 'admin'). Only superadmin + admin roles.
Route::middleware(['web', 'auth', 'admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function (): void {
        Route::get('/', [AdminDashboardController::class, 'index'])->name('dashboard');
        // Placeholders — real controllers ship in P2 + P3 + P6.
        Route::get('users', [AdminUserController::class, 'index'])->name('users');
        Route::patch('users/{user}/role', [AdminUserController::class, 'updateRole'])->name('users.update-role');
        Route::patch('users/{user}/subscription', [AdminUserController::class, 'updateSubscription'])->name('users.update-subscription');
        // Plans — admin edits each plan's default feature set, trial length and pricing.
        Route::get('plans', [AdminPlanController::class, 'index'])->name('plans');
        Route::post('plans', [AdminPlanController::class, 'store'])->name('plans.store');
        Route::patch('plans/{plan}', [AdminPlanController::class, 'update'])->name('plans.update');
        Route::delete('plans/{plan}', [AdminPlanController::class, 'destroy'])->name('plans.destroy');
        // Settings — admin settings shell (user-settings-style tabbed page).
        Route::get('settings', [AdminSettingsController::class, 'index'])->name('settings');
        // Phone Pricing section — per-area-code + default monthly price users see/pay
        // when provisioning a number (falls back to the Telnyx cost when unset).
        Route::post('settings/area-code-pricing', [AdminAreaCodePriceController::class, 'store'])->name('settings.area-code-pricing.store');
        Route::post('settings/area-code-pricing/default', [AdminAreaCodePriceController::class, 'updateDefault'])->name('settings.area-code-pricing.default');
        Route::patch('settings/area-code-pricing/{areaCodePrice}', [AdminAreaCodePriceController::class, 'update'])->name('settings.area-code-pricing.update');
        Route::delete('settings/area-code-pricing/{areaCodePrice}', [AdminAreaCodePriceController::class, 'destroy'])->name('settings.area-code-pricing.destroy');
        // Websites — admin lists/manages sites; "Create" launches the same
        // onboarding wizard for the selected user (see OnboardingController).
        Route::get('websites', [AdminWebsiteController::class, 'index'])->name('websites');
        Route::get('mls-providers', [AdminMlsProviderController::class, 'index'])->name('mls-providers');
        Route::post('mls-providers', [AdminMlsProviderController::class, 'store'])->name('mls-providers.store');
        Route::patch('mls-providers/{mlsProvider}', [AdminMlsProviderController::class, 'update'])->name('mls-providers.update');
        Route::post('mls-providers/{mlsProvider}/toggle-visibility', [AdminMlsProviderController::class, 'toggleVisibility'])->name('mls-providers.toggle-visibility');
        Route::post('mls-providers/{mlsProvider}/logo', [AdminMlsProviderController::class, 'uploadLogo'])->name('mls-providers.upload-logo');
        Route::post('mls-providers/{mlsProvider}/compliance-logo', [AdminMlsProviderController::class, 'uploadComplianceLogo'])->name('mls-providers.upload-compliance-logo');
        Route::post('mls-providers-pending-logo', [AdminMlsProviderController::class, 'uploadLogoPending'])->name('mls-providers.upload-pending-logo');
        Route::delete('mls-providers/{mlsProvider}', [AdminMlsProviderController::class, 'destroy'])->name('mls-providers.destroy');
        Route::get('mls-requests', [AdminMlsRequestController::class, 'index'])->name('mls-requests');
        Route::patch('mls-requests/{mlsConnectionRequest}', [AdminMlsRequestController::class, 'updateStatus'])->name('mls-requests.update');
        // Condo Directory — the platform-wide building catalog agent sites render at /condos.
        Route::get('condo-buildings', [AdminCondoBuildingController::class, 'index'])->name('condo-buildings');
        Route::post('condo-buildings', [AdminCondoBuildingController::class, 'store'])->name('condo-buildings.store');
        Route::patch('condo-buildings/{condoBuilding}', [AdminCondoBuildingController::class, 'update'])->name('condo-buildings.update');
        Route::delete('condo-buildings/{condoBuilding}', [AdminCondoBuildingController::class, 'destroy'])->name('condo-buildings.destroy');
        Route::post('condo-buildings-image', [AdminCondoBuildingController::class, 'uploadImage'])->name('condo-buildings.upload-image');
        // New Developments of Florida — the pre-construction catalog agent sites render at /new-developments.
        Route::get('new-developments', [AdminNewDevelopmentController::class, 'index'])->name('new-developments');
        Route::post('new-developments', [AdminNewDevelopmentController::class, 'store'])->name('new-developments.store');
        Route::patch('new-developments/{newDevelopment}', [AdminNewDevelopmentController::class, 'update'])->name('new-developments.update');
        Route::delete('new-developments/{newDevelopment}', [AdminNewDevelopmentController::class, 'destroy'])->name('new-developments.destroy');
        Route::post('new-developments-image', [AdminNewDevelopmentController::class, 'uploadImage'])->name('new-developments.upload-image');
        // Email delivery tracking (read-only) — Resend logs, timelines, suppressions.
        Route::get('email-logs', [AdminEmailLogController::class, 'index'])->name('email-logs');
        Route::get('email-logs/{emailSendLog}', [AdminEmailLogController::class, 'show'])->name('email-logs.show');
    });

require __DIR__.'/auth.php';
