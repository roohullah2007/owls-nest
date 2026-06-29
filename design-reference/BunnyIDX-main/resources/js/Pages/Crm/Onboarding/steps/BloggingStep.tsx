import { StepProps } from '../types';
import StepShell from '../components/StepShell';
import ChoiceCard from '../components/ChoiceCard';

/** Step 7 — yes/no: enable a blog. Flag is stored on page_data._config. */
export default function BloggingStep({ data, set }: StepProps) {
    return (
        <StepShell
            title="Will you publish a blog?"
            subtitle="A blog helps your site rank on Google and keeps clients engaged with market updates and guides. We’ll add a Blog section if you want one."
        >
            <div className="space-y-3">
                <ChoiceCard
                    selected={data.blogging === true}
                    onClick={() => set('blogging', true)}
                    title="Yes, I’ll blog"
                    description="Add a blog with a starter post layout."
                />
                <ChoiceCard
                    selected={data.blogging === false}
                    onClick={() => set('blogging', false)}
                    title="Not right now"
                    description="Skip the blog — you can enable it later."
                />
            </div>
        </StepShell>
    );
}
