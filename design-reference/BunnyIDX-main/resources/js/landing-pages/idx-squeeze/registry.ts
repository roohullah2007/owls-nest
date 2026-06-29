/*
 | IDX listing template registry. A listing page's `template` key (stored in
 | page_data._config.design) selects which React template renders the public
 | page. Add a template = build a component + register it here. The editor's
 | template picker is driven server-side (ListingPageController::templateDesigns).
 */
import type { ComponentType } from 'react';
import VillaSerena from './Template';
import type { IdxPageData } from './Template';

export const TEMPLATES: Record<string, ComponentType<{ data: IdxPageData }>> = {
    'villa-serena': VillaSerena,
};

export const DEFAULT_TEMPLATE = 'villa-serena';
