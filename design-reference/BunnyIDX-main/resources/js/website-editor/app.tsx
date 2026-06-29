import React from 'react';
import { createRoot } from 'react-dom/client';
import EditorBar from './EditorBar';
import { SiteData } from './types';
import '../../css/website-editor.css';

declare global {
    interface Window {
        __EDITOR_SITE__: SiteData;
        __EDITOR_PAGE__: string;
    }
}

const root = document.getElementById('editor-bar-root');
if (root) {
    const site = window.__EDITOR_SITE__;
    const currentPage = window.__EDITOR_PAGE__ || 'home';
    if (site) {
        createRoot(root).render(<EditorBar site={site} currentPage={currentPage} />);
    }
}
