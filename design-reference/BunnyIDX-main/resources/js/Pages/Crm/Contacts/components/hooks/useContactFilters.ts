import { router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import type { ContactsIndexProps } from '../types';

type Filters = ContactsIndexProps['filters'];

/**
 * URL-navigation helpers for the Contacts list filters: builds the preserved
 * query param set and the search / sort / type / smart-filter / remove / clear
 * actions. Pure extraction from the index page — behaviour is unchanged.
 */
export function useContactFilters(filters: Filters, search: string) {
    function getParams(overrides: Record<string, string | undefined> = {}) {
        return { search: filters.search, type: filters.type, status: filters.status, source: filters.source, sort: filters.sort, direction: filters.direction, smart_list: filters.smart_list, lead_score_min: filters.lead_score_min, lead_score_max: filters.lead_score_max, last_contacted_before: filters.last_contacted_before, last_contacted_after: filters.last_contacted_after, city: filters.city, tag: filters.tag, has_email: filters.has_email, has_phone: filters.has_phone, ...overrides };
    }

    /** Navigate with a given search term, preserving every other filter. */
    function submitSearch(term: string) {
        router.get(route('crm.contacts.index'), getParams({ search: term || undefined }), { preserveState: true, replace: true });
    }

    function handleSearch(e: FormEvent) {
        e.preventDefault();
        submitSearch(search);
    }

    /**
     * Apply a multi-filter set built by the SmartListModal (filter mode) directly
     * to the URL params. The backend accepts the same param shape that smart
     * lists store, so this is just a URL navigation. Array filters (status / type
     * / source / tags) are serialized to comma-separated for the controller's
     * existing scalar accept, falling back to the first item for now.
     */
    function applyFilters(built: Record<string, unknown>) {
        const scalarOr = (v: unknown) => Array.isArray(v) ? (v.length ? String(v[0]) : undefined) : (v != null ? String(v) : undefined);
        const overrides: Record<string, string | undefined> = {
            status: scalarOr(built.status),
            type: scalarOr(built.type),
            source: scalarOr(built.source),
            tag: Array.isArray(built.tags) && built.tags.length ? String(built.tags[0]) : undefined,
            city: built.city as string | undefined,
            lead_score_min: built.lead_score_min != null ? String(built.lead_score_min) : undefined,
            lead_score_max: built.lead_score_max != null ? String(built.lead_score_max) : undefined,
            last_contacted_after: built.last_contacted_after as string | undefined,
            last_contacted_before: built.last_contacted_before as string | undefined,
            has_email: built.has_email === true ? '1' : built.has_email === false ? '0' : undefined,
            has_phone: built.has_phone === true ? '1' : built.has_phone === false ? '0' : undefined,
            smart_list: undefined, // clear any active smart list — this is ad-hoc
        };
        router.get(route('crm.contacts.index'), getParams(overrides), { preserveState: true });
    }

    /** Count of distinct filters currently applied via URL params. Used for the Filter button badge. */
    const activeFilterCount = [
        filters.status, filters.type, filters.source, filters.tag,
        filters.city, filters.lead_score_min, filters.lead_score_max,
        filters.last_contacted_after, filters.last_contacted_before,
        filters.has_email, filters.has_phone,
    ].filter((v) => v !== undefined && v !== null && v !== '').length;

    /** Remove a single filter param while preserving the rest. */
    function removeFilter(key: keyof Filters) {
        router.get(route('crm.contacts.index'), getParams({ [key as string]: undefined }), { preserveState: true });
    }

    /** Clear every filter param at once, keeping only the search + sort + active view. */
    function clearAllFilters() {
        router.get(route('crm.contacts.index'), {
            search: filters.search,
            sort: filters.sort,
            direction: filters.direction,
            // Drop smart_list too — clearing all filters resets to the unfiltered view.
        }, { preserveState: true });
    }

    function handleTypeFilter(type: string) {
        router.get(route('crm.contacts.index'), getParams({ type: type || undefined }), { preserveState: true });
    }

    function handleSort(column: string) {
        const direction = filters.sort === column && filters.direction === 'asc' ? 'desc' : 'asc';
        router.get(route('crm.contacts.index'), getParams({ sort: column, direction }), { preserveState: true });
    }

    return { handleSearch, submitSearch, applyFilters, activeFilterCount, removeFilter, clearAllFilters, handleTypeFilter, handleSort };
}
