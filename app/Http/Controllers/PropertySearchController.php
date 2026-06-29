<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\Mls\Dto\MlsQuery;
use App\Services\Mls\MlsGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Thin public endpoint over the PrimeMLS (Paragon) integration. Resolves the
 * single owner user, builds a typed MlsQuery from the request, and fans the
 * search out to the gateway restricted to the `primemls` dataset.
 */
class PropertySearchController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        $user = User::first();
        if (! $user) {
            return response()->json([
                'error' => 'No owner user configured.',
            ], 503);
        }

        $query = MlsQuery::fromArray($request->all());

        $result = app(MlsGateway::class)->search($user, $query, ['primemls']);

        return response()->json($result->toArray());
    }
}
