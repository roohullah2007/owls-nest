import { Form, Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BreadcrumbItem } from '@/types';

type Dataset = {
    slug: string;
    label: string;
};

type Settings = {
    search_query: string | null;
    mls_slugs: string[] | null;
    agent_id: string | null;
    office_id: string | null;
    result_limit: number;
    is_active: boolean;
};

type PageProps = {
    settings: Settings;
    availableDatasets: Dataset[];
};

const UPDATE_URL = '/admin/idx-settings/featured-listings';

export default function FeaturedListings({
    settings,
    availableDatasets,
}: PageProps) {
    const selectedSlugs = settings.mls_slugs ?? [];

    return (
        <div className="px-4 py-6">
            <Head title="Featured Listings" />

            <Heading
                title="IDX Featured Listings"
                description="Configure which live MLS listings appear on the public Featured Properties page. When inactive, the page shows the latest general listings."
            />

            <Form
                method="patch"
                action={UPDATE_URL}
                options={{ preserveScroll: true }}
                className="max-w-2xl space-y-6"
            >
                {({ processing, errors, recentlySuccessful }) => (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="search_query">Search query</Label>
                            <Input
                                id="search_query"
                                name="search_query"
                                defaultValue={settings.search_query ?? ''}
                                placeholder="e.g. waterfront lakefront"
                            />
                            <InputError message={errors.search_query} />
                        </div>

                        <div className="grid gap-2">
                            <Label>MLS datasets</Label>
                            <p className="text-sm text-muted-foreground">
                                Select one or more datasets to pull listings
                                from. Leave all unchecked to default to PrimeMLS.
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {availableDatasets.map((dataset) => (
                                    <label
                                        key={dataset.slug}
                                        htmlFor={`mls-${dataset.slug}`}
                                        className="flex items-start gap-2 text-sm"
                                    >
                                        <Checkbox
                                            id={`mls-${dataset.slug}`}
                                            name="mls_slugs[]"
                                            value={dataset.slug}
                                            defaultChecked={selectedSlugs.includes(
                                                dataset.slug,
                                            )}
                                            className="mt-0.5"
                                        />
                                        <span>{dataset.label}</span>
                                    </label>
                                ))}
                            </div>
                            <InputError message={errors.mls_slugs} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="agent_id">Agent ID</Label>
                            <Input
                                id="agent_id"
                                name="agent_id"
                                defaultValue={settings.agent_id ?? ''}
                                placeholder="MLS agent id"
                            />
                            <InputError message={errors.agent_id} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="office_id">Office ID</Label>
                            <Input
                                id="office_id"
                                name="office_id"
                                defaultValue={settings.office_id ?? ''}
                                placeholder="MLS office id"
                            />
                            <InputError message={errors.office_id} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="result_limit">Result limit</Label>
                            <Input
                                id="result_limit"
                                name="result_limit"
                                type="number"
                                min={1}
                                max={60}
                                defaultValue={settings.result_limit ?? 12}
                                className="max-w-[160px]"
                            />
                            <InputError message={errors.result_limit} />
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Hidden field guarantees an explicit "0" is sent
                                when the toggle is unchecked. */}
                            <input
                                type="hidden"
                                name="is_active"
                                value="0"
                            />
                            <Checkbox
                                id="is_active"
                                name="is_active"
                                value="1"
                                defaultChecked={settings.is_active}
                            />
                            <Label htmlFor="is_active">
                                Active (use this configuration on the public
                                page)
                            </Label>
                            <InputError message={errors.is_active} />
                        </div>

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>Save</Button>
                            {recentlySuccessful && (
                                <p className="text-sm text-green-600">Saved.</p>
                            )}
                        </div>
                    </>
                )}
            </Form>
        </div>
    );
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'IDX Featured Listings',
        href: '/admin/idx-settings/featured-listings',
    },
];

FeaturedListings.layout = { breadcrumbs };
