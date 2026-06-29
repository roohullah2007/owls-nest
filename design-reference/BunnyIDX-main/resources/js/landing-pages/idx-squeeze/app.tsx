/*
 | Public IDX listing landing page — React entry.
 | The Blade shell (templates/idx-squeeze/show.blade.php) emits a #idx-squeeze-root
 | mount node with a data-page JSON payload (listing snapshot + copy config +
 | agent + meta + chosen template). No block system — each template is a fixed,
 | data-driven React component, picked from the registry by payload.template.
 */
import { createRoot } from 'react-dom/client';
import type { IdxPageData } from './Template';
import { TEMPLATES, DEFAULT_TEMPLATE } from './registry';

const node = document.getElementById('idx-squeeze-root');
if (node) {
    const data = JSON.parse(node.dataset.page || 'null') as IdxPageData | null;
    if (data) {
        const Template = TEMPLATES[data.template] || TEMPLATES[DEFAULT_TEMPLATE];
        createRoot(node).render(<Template data={data} />);
    }
}
