import { useEffect } from 'react';
import { StepProps } from '../types';
import StepShell from '../components/StepShell';
import ChoiceCard from '../components/ChoiceCard';
import { FEATURES, FEATURE_ICON_PATHS, newDevelopmentsAvailable } from '../constants';

/** Step 3 — multi-select the site features. All optional (skippable). */
export default function FeaturesStep({ data, set }: StepProps) {
    const showNewDev = newDevelopmentsAvailable(data.agent_country, data.agent_state);
    const visibleFeatures = FEATURES.filter((f) => f.key !== 'new_developments' || showNewDev);

    // Drop New Developments from the selection if the chosen region no longer offers it.
    useEffect(() => {
        if (!showNewDev && data.features.includes('new_developments')) {
            set('features', data.features.filter((f) => f !== 'new_developments'));
        }
    }, [showNewDev]); // eslint-disable-line react-hooks/exhaustive-deps

    function toggle(key: string) {
        const next = data.features.includes(key)
            ? data.features.filter((f) => f !== key)
            : [...data.features, key];
        set('features', next);
    }

    return (
        <StepShell
            title="Which features do you want?"
            subtitle="Pick everything you’d like on your site. You can add or remove these anytime in the editor."
            maxWidth="max-w-2xl"
        >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {visibleFeatures.map((f) => (
                    <ChoiceCard
                        key={f.key}
                        multi
                        selected={data.features.includes(f.key)}
                        onClick={() => toggle(f.key)}
                        title={f.title}
                        description={f.desc}
                        icon={
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d={FEATURE_ICON_PATHS[f.key]} />
                            </svg>
                        }
                    />
                ))}
            </div>
        </StepShell>
    );
}
