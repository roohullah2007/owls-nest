import { AgentWebsite } from '../../../types';
import DirectoryManagerSection from './DirectoryManagerSection';

interface Props {
    website: AgentWebsite;
    onActionChange: (action: { label: string; onClick: () => void; secondary?: { label: string; onClick: () => void } } | null) => void;
}

/** Website settings → New Developments (shared DirectoryManagerSection wiring). */
export default function NewDevelopmentsSection({ website, onActionChange }: Props) {
    return (
        <DirectoryManagerSection
            website={website}
            onActionChange={onActionChange}
            cfg={{
                endpointBase: 'new-developments',
                configEndpoint: 'new-developments-config',
                aiEndpoint: 'new-developments/ai-description',
                publicPath: 'new-developments',
                publicItemPrefix: '/new-developments',
                pageTitle: 'New Developments',
                noun: 'Project',
                nounPlural: 'Projects',
                settingsIntro: 'Add a New Developments page to your website — the pre-construction catalog our team keeps updated, your own projects, or both.',
                platformEmptyTitle: 'No platform projects yet',
                ownIntro: 'Developments you represent directly — each gets its own page with the logo, project team, gallery, floor plans, brochure and key details, plus its listings for sale.',
            }}
        />
    );
}
