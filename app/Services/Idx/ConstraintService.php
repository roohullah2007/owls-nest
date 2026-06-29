<?php

declare(strict_types=1);

namespace App\Services\Idx;

use App\Models\IdxConnection;

/**
 * Applies connection constraints to search filters.
 *
 * Constraints are server-side limits set by the CRM user on their MLS connections.
 * They restrict what data the WordPress plugin / end-users can query.
 * Constraints always take precedence over user-supplied filters.
 */
class ConstraintService
{
    /**
     * Merge connection constraints into search filters.
     * Returns the constrained filter set.
     */
    public function apply(array $filters, IdxConnection $connection): array
    {
        $c = $connection->constraints;
        if (empty($c) || ! is_array($c)) {
            return $filters;
        }

        $filters = $this->applyOwnership($filters, $c, $connection);
        $filters = $this->applyPropertyTypes($filters, $c);
        $filters = $this->applyStatuses($filters, $c);
        $filters = $this->applyNumericBounds($filters, $c);
        $filters = $this->applyLocation($filters, $c);
        $filters = $this->applyKeywords($filters, $c);

        return $filters;
    }

    /**
     * Agent/office listing ownership restrictions.
     */
    private function applyOwnership(array $filters, array $c, IdxConnection $connection): array
    {
        if (! empty($c['agent_only']) && $connection->agent_id) {
            $filters['agent_id'] = $connection->agent_id;
        }
        if (! empty($c['office_only']) && $connection->office_id) {
            $filters['office_id'] = $connection->office_id;
        }

        return $filters;
    }

    /**
     * Restrict property types to allowed set.
     * If user requests a single type, validate it against the allowed list.
     * If no type specified, restrict to the full allowed list.
     */
    private function applyPropertyTypes(array $filters, array $c): array
    {
        if (empty($c['property_types'])) {
            return $filters;
        }

        $allowed = $c['property_types'];

        if (! empty($filters['property_type'])) {
            // User wants a specific type — validate against allowed list
            if (! in_array($filters['property_type'], $allowed, true)) {
                // Not allowed — remove user's choice and apply full constraint list
                unset($filters['property_type']);
                $filters['property_types'] = $allowed;
            }
            // If allowed, keep the user's single property_type as-is
        } else {
            // No user preference — apply all allowed types
            $filters['property_types'] = $allowed;
        }

        return $filters;
    }

    /**
     * Restrict statuses to allowed set.
     */
    private function applyStatuses(array $filters, array $c): array
    {
        if (empty($c['statuses'])) {
            return $filters;
        }

        $allowed = $c['statuses'];

        if (! empty($filters['status'])) {
            if (! in_array($filters['status'], $allowed, true)) {
                unset($filters['status']);
                $filters['statuses'] = $allowed;
            }
        } else {
            $filters['statuses'] = $allowed;
        }

        return $filters;
    }

    /**
     * Apply numeric bounds: price, sqft, year built, days on market.
     * Constraint bounds always tighten user bounds (never loosen).
     */
    private function applyNumericBounds(array $filters, array $c): array
    {
        // Min bounds: take the HIGHER of user vs constraint (tighter restriction)
        foreach (['min_price', 'min_sqft', 'min_year_built'] as $key) {
            if (! empty($c[$key])) {
                $userVal = (int) ($filters[$key] ?? 0);
                $filters[$key] = max($userVal, (int) $c[$key]);
            }
        }

        // Max bounds: take the LOWER of user vs constraint (tighter restriction)
        foreach (['max_price', 'max_sqft', 'max_year_built', 'max_dom'] as $key) {
            if (! empty($c[$key])) {
                $userVal = ! empty($filters[$key]) ? (int) $filters[$key] : PHP_INT_MAX;
                $filters[$key] = min($userVal, (int) $c[$key]);
            }
        }

        return $filters;
    }

    /**
     * Restrict to allowed cities and postal codes.
     * If user requests a city/zip that's not in the allowed list, fall back to the full list.
     */
    private function applyLocation(array $filters, array $c): array
    {
        if (! empty($c['cities'])) {
            if (! empty($filters['city'])) {
                $allowed = array_map('strtolower', $c['cities']);
                if (! in_array(strtolower($filters['city']), $allowed, true)) {
                    unset($filters['city']);
                    $filters['cities'] = $c['cities'];
                }
            } else {
                $filters['cities'] = $c['cities'];
            }
        }

        if (! empty($c['postal_codes'])) {
            if (! empty($filters['postal_code'])) {
                $match = false;
                foreach ($c['postal_codes'] as $allowed) {
                    if (str_starts_with($filters['postal_code'], $allowed)) {
                        $match = true;
                        break;
                    }
                }
                if (! $match) {
                    unset($filters['postal_code']);
                    $filters['postal_codes'] = $c['postal_codes'];
                }
            } else {
                $filters['postal_codes'] = $c['postal_codes'];
            }
        }

        return $filters;
    }

    /**
     * Apply keyword inclusion/exclusion. Always additive — these are mandatory.
     */
    private function applyKeywords(array $filters, array $c): array
    {
        if (! empty($c['keywords'])) {
            $filters['keywords'] = $c['keywords'];
        }
        if (! empty($c['exclude_keywords'])) {
            $filters['exclude_keywords'] = $c['exclude_keywords'];
        }

        return $filters;
    }
}
