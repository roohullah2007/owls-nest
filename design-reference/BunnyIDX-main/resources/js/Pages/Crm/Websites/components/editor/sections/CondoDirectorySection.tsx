import { AgentWebsite } from '../../../types';
import DirectoryManagerSection from './DirectoryManagerSection';

interface Props {
    website: AgentWebsite;
    onActionChange: (action: { label: string; onClick: () => void; secondary?: { label: string; onClick: () => void } } | null) => void;
}

/** Website settings → Condo Directory (shared DirectoryManagerSection wiring — a deliberate duplicate of New Developments). */
export default function CondoDirectorySection({ website, onActionChange }: Props) {
    return (
        <DirectoryManagerSection
            website={website}
            onActionChange={onActionChange}
            cfg={{
                endpointBase: 'condo-buildings',
                configEndpoint: 'condo-directory-config',
                aiEndpoint: 'condo-buildings/ai-description',
                publicPath: 'condos',
                publicItemPrefix: '/condos',
                pageTitle: 'Condo Directory',
                noun: 'Building',
                nounPlural: 'Buildings',
                settingsIntro: 'Add a Condo Directory page to your website — the building catalog our team keeps updated, your own buildings, or both.',
                platformEmptyTitle: 'No platform buildings yet',
                ownIntro: 'Buildings you specialize in — each gets its own page with the logo, project team, gallery, floor plans, brochure and key details, plus its listings for sale.',
            }}
        />
    );
}
