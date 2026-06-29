<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\WebsiteEditor\Concerns;

use App\Models\AgentWebsite;
use App\Models\AgentWebsiteMedia;
use Illuminate\Http\UploadedFile;

trait RecordsMedia
{
    /** Image types accepted by every upload endpoint (the `image` rule rejects svg/avif). */
    private const IMAGE_MIMES = 'jpg,jpeg,png,gif,webp,avif,svg';

    /** Record an uploaded file in the site's Media Library (idempotent per path). */
    private function recordMedia(AgentWebsite $site, string $path, ?UploadedFile $file = null): AgentWebsiteMedia
    {
        return AgentWebsiteMedia::firstOrCreate(
            ['agent_website_id' => $site->id, 'path' => $path],
            [
                'filename' => $file?->getClientOriginalName(),
                'mime' => $file?->getClientMimeType(),
                'size' => $file?->getSize(),
            ],
        );
    }
}
