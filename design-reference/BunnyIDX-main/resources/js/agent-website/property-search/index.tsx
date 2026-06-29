/*
 | Entry for the shared public property-search app (map + grid). One React
 | codebase used by every theme: the Blade page provides the themed chrome
 | (header/footer) and an empty `.ps-app` mount node carrying the JSON config.
 */
import { createRoot } from 'react-dom/client';
import App from './App';
import { PsConfig } from './types';

const node = document.getElementById('ps-app');
if (node) {
    const cfg: PsConfig = JSON.parse(node.dataset.config || '{}');
    createRoot(node).render(<App cfg={cfg} container={node} />);
}
