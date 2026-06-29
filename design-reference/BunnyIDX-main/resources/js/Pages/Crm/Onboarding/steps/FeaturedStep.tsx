import { StepProps } from '../types';
import StepShell from '../components/StepShell';
import ChoiceCard from '../components/ChoiceCard';

/** Step 8 — featured listings: the agent's own, their office's, or none. */
export default function FeaturedStep({ data, set }: StepProps) {
    return (
        <StepShell
            title="Show featured listings?"
            subtitle="Display a curated set of listings on your homepage. Choose whose listings to feature — this needs a connected MLS to pull live data."
        >
            <div className="space-y-3">
                <ChoiceCard
                    selected={data.featured === 'mine'}
                    onClick={() => set('featured', 'mine')}
                    title="My listings"
                    description="Feature the properties you’ve personally listed."
                />
                <ChoiceCard
                    selected={data.featured === 'office'}
                    onClick={() => set('featured', 'office')}
                    title="My office’s listings"
                    description="Feature all listings from your brokerage/office."
                />
                <ChoiceCard
                    selected={data.featured === 'none'}
                    onClick={() => set('featured', 'none')}
                    title="Don’t show featured listings"
                    description="Skip this section for now."
                />
            </div>
        </StepShell>
    );
}
