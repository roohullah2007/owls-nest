<?php

/**
 * Landing-page Designs — the visual themes a page can be built on.
 *
 * A Design is the look/layout (Blade template under
 * resources/views/landing-pages/templates/{id}/); each Design groups one or
 * more Presets (the prebuilt funnels in config/landing-page-templates.php,
 * matched by their `template` key). The create screen shows Designs, then the
 * Presets inside the chosen Design — each illustrated with a real screenshot.
 *
 *   id          — matches a Preset's `template` and the Blade template folder
 *   name        — label shown in the create screen
 *   description — one-line summary of the look
 */

return [
    [
        'id' => 'classic',
        'name' => 'Classic',
        'description' => 'Clean, conversion-focused light theme with a photo hero and clear sections.',
    ],
    [
        'id' => 'video-landing',
        'name' => 'Video Landing',
        'description' => 'Long-scroll video sales letter — bold dark theme with a hero video, social proof, guarantee and an Apply CTA.',
    ],
];
