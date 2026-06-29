/*
 | Public landing page — React entry.
 |
 | The Blade shell (partials/spa-shell.blade.php) emits a #lp-root mount node
 | with a data-page JSON payload (page meta + agent + config + blocks). This
 | bundle renders the whole public page in React — classic or video-landing
 | design, or the full-screen lead "flow" — with NO Blade templating of content.
 | Lead forms still POST to the existing landing.submit controller (CSRF token in
 | the payload), so attribution + CRM contact creation are unchanged.
 */
import { createRoot } from 'react-dom/client';
import type { LpPageData } from './types';
import { captureUtm } from './helpers';
import Layout from './Layout';
import VideoLayout from './VideoLayout';
import { resolveBlock } from './registry';
import Flow from './Flow';

function Page({ page }: { page: LpPageData }) {
    const Wrapper = page.template === 'video-landing' ? VideoLayout : Layout;
    const blocks = (page.blocks || []).filter((b) => !b.hidden);

    return (
        <Wrapper page={page}>
            {blocks.map((block) => {
                const Block = resolveBlock(page.template, block.type);
                if (!Block) return null;
                return <Block key={block.id} data={block.data || {}} page={page} />;
            })}
        </Wrapper>
    );
}

const node = document.getElementById('lp-root');
if (node) {
    captureUtm();
    const data = JSON.parse(node.dataset.page || 'null') as LpPageData | null;
    if (data) {
        createRoot(node).render(data.mode === 'flow' ? <Flow page={data} /> : <Page page={data} />);
    }
}
