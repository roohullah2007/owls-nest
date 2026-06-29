import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BlogPostData } from '../types';
import { inputClass, textareaClass, labelClass, sectionLabel } from '../constants';
import RichTextField from '@/Components/Crm/RichTextField';
import MediaField from './MediaField';

interface BlogTabProps {
    websiteId: number;
    websiteUuid: string;
    initialPostId?: number;
    onActionChange: (action: { label: string; onClick: () => void } | null) => void;
}

/** Featured images can be storage paths or full URLs (AI/sample posts). */
function postImageUrl(path: string): string {
    return /^https?:\/\//.test(path) ? path : `/storage/${path}`;
}

export default function BlogTab({ websiteId, websiteUuid, initialPostId, onActionChange }: BlogTabProps) {
    const [posts, setPosts] = useState<BlogPostData[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<BlogPostData | null>(null);
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);

    // SEO Blog AI Writer
    const [aiTopic, setAiTopic] = useState('');
    const [aiKeywords, setAiKeywords] = useState('');
    const [aiBusy, setAiBusy] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        excerpt: '',
        category: '',
        body: '',
        featured_image: '',
        status: 'draft' as 'draft' | 'published',
        published_at: '',
        meta_title: '',
        meta_description: '',
    });

    async function fetchPosts() {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/website-editor/${websiteId}/blog-posts`);
            setPosts(data.posts || []);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchPosts(); }, []);

    // Sync action button with parent top bar: "+ New Post" on the list,
    // Save on the editor (same top-right placement as every other tab).
    const saveRef = useRef<() => void>(() => {});
    useEffect(() => {
        if (!creating) {
            onActionChange({ label: '+ New Post', onClick: () => startCreate() });
        } else {
            onActionChange({ label: editing ? 'Update Post' : 'Create Post', onClick: () => saveRef.current() });
        }
        return () => onActionChange(null);
    }, [creating, editing]);

    function resetForm() {
        setFormData({ title: '', slug: '', excerpt: '', category: '', body: '', featured_image: '', status: 'draft', published_at: '', meta_title: '', meta_description: '' });
    }

    function startCreate() {
        resetForm();
        setEditing(null);
        setCreating(true);
    }

    function startEdit(post: BlogPostData, pushUrl = true) {
        setFormData({
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt || '',
            category: post.category || '',
            body: post.body,
            featured_image: post.featured_image || '',
            status: post.status,
            published_at: post.published_at ? post.published_at.slice(0, 16) : '',
            meta_title: post.meta_title || '',
            meta_description: post.meta_description || '',
        });
        setEditing(post);
        setCreating(true);
        // Each post edit is its own URL: /crm/websites/{uuid}/blog/{post}.
        if (pushUrl) {
            window.history.pushState({}, '', route('crm.websites.edit-blog-post', { agentWebsite: websiteUuid, blogPost: post.id }));
        }
    }

    function handleCancel(pushUrl = true) {
        const wasEditing = !!editing;
        setCreating(false);
        setEditing(null);
        resetForm();
        if (pushUrl && wasEditing) {
            window.history.pushState({}, '', route('crm.websites.edit', { agentWebsite: websiteUuid, section: 'blog' }));
        }
    }

    // Deep link (/blog/{post}): open the post once the list has loaded. The id
    // comes from the server prop on full page loads, or the URL when the tab
    // remounts client-side already on a post URL.
    const openedInitial = useRef(false);
    useEffect(() => {
        if (openedInitial.current || !posts.length) return;
        openedInitial.current = true;
        const urlMatch = window.location.pathname.match(/\/blog\/(\d+)$/);
        const targetId = initialPostId ?? (urlMatch ? Number(urlMatch[1]) : undefined);
        if (!targetId) return;
        const post = posts.find((p) => p.id === targetId);
        if (post) startEdit(post, false);
    }, [posts, initialPostId]);

    // Browser back/forward between /blog and /blog/{post}.
    const postsRef = useRef(posts);
    postsRef.current = posts;
    useEffect(() => {
        function onPop() {
            const parts = window.location.pathname.split('/').filter(Boolean);
            const last = parts[parts.length - 1];
            const prev = parts[parts.length - 2];
            if (prev === 'blog' && /^\d+$/.test(last)) {
                const post = postsRef.current.find((p) => p.id === Number(last));
                if (post) startEdit(post, false);
            } else if (last === 'blog') {
                handleCancel(false);
            }
        }
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    async function handleSave() {
        setSaving(true);
        try {
            if (editing) {
                await axios.patch(`/api/website-editor/${websiteId}/blog-posts/${editing.id}`, formData);
            } else {
                await axios.post(`/api/website-editor/${websiteId}/blog-posts`, formData);
            }
            handleCancel();
            fetchPosts();
        } catch {
            // silent
        } finally {
            setSaving(false);
        }
    }

    saveRef.current = handleSave;

    async function handleDelete(postId: number) {
        if (!confirm('Delete this blog post? This cannot be undone.')) return;
        setDeleting(postId);
        try {
            await axios.delete(`/api/website-editor/${websiteId}/blog-posts/${postId}`);
            fetchPosts();
            if (editing?.id === postId) handleCancel();
        } catch {
            // silent
        } finally {
            setDeleting(null);
        }
    }

    async function handleAiWrite() {
        if (!aiTopic.trim()) return;
        if (formData.body && !confirm('Replace the current title, content and SEO fields with the AI draft?')) return;
        setAiBusy(true);
        setAiError(null);
        try {
            const { data } = await axios.post(`/api/website-editor/${websiteId}/ai/generate-blog-post`, {
                topic: aiTopic.trim(),
                keywords: aiKeywords.trim() || null,
                current_body: formData.body || null,
            });
            const post = data.post || {};
            setFormData(prev => ({
                ...prev,
                title: post.title || prev.title,
                slug: prev.slug || post.slug || generateSlug(post.title || ''),
                excerpt: post.excerpt || prev.excerpt,
                body: post.body || prev.body,
                meta_title: post.meta_title || prev.meta_title,
                meta_description: post.meta_description || prev.meta_description,
            }));
        } catch (e) {
            const err = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
            setAiError(err || 'Could not generate the post. Check that the AI key is configured.');
        } finally {
            setAiBusy(false);
        }
    }

    function generateSlug(title: string) {
        return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    // Editor form view
    if (creating) {
        return (
            <div className="space-y-6">
                {/* Back to the list — the save action lives in the tab's top bar. */}
                <button type="button" onClick={() => handleCancel()} className="flex items-center gap-1.5 text-[12px] font-medium text-[#5F656D] hover:text-[#111315] transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                    All Posts
                </button>

                {/* ── SEO Blog AI Writer ── */}
                <div className="border border-[#BFE3F2] bg-[#F2FAFD] rounded-xl p-5 space-y-3">
                    <div>
                        <p className="text-sm font-semibold text-[#111315]">SEO Blog AI Writer</p>
                        <p className="mt-0.5 text-[12px] text-[#5F656D]">Describe the topic and the AI drafts the full post — title, SEO-structured content, excerpt and meta tags — localised to your market. Everything stays editable.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
                        <input
                            type="text"
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAiWrite(); }}
                            className={inputClass}
                            placeholder="Topic — e.g. Is fall a good time to buy in Miami?"
                        />
                        <input
                            type="text"
                            value={aiKeywords}
                            onChange={(e) => setAiKeywords(e.target.value)}
                            className={inputClass}
                            placeholder="Target keywords (optional)"
                        />
                        <button
                            type="button"
                            onClick={handleAiWrite}
                            disabled={aiBusy || !aiTopic.trim()}
                            className="h-9 px-5 bg-[#1693C9] text-white text-xs font-medium rounded-lg hover:bg-[#1380AF] disabled:opacity-30 transition-colors whitespace-nowrap"
                        >
                            {aiBusy ? 'Writing…' : formData.body ? 'Rewrite with AI' : 'Write with AI'}
                        </button>
                    </div>
                    {aiError && <p className="text-[12px] font-medium text-red-600">{aiError}</p>}
                </div>

                <div className="border border-[#E4E7EB] bg-white rounded-xl p-6 space-y-5">
                    <div>
                        <label className={labelClass}>Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => {
                                const title = e.target.value;
                                setFormData(prev => ({
                                    ...prev,
                                    title,
                                    slug: prev.slug || generateSlug(title),
                                }));
                            }}
                            className={inputClass}
                            placeholder="My Blog Post Title"
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Slug</label>
                        <input
                            type="text"
                            value={formData.slug}
                            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                            className={inputClass}
                            placeholder="my-blog-post-title"
                        />
                        <p className="mt-1 text-[11px] text-[#5F656D]">URL-friendly identifier. Auto-generated from title if left empty.</p>
                    </div>
                    <div>
                        <label className={labelClass}>Excerpt</label>
                        <textarea
                            value={formData.excerpt}
                            onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                            rows={2}
                            className={textareaClass}
                            placeholder="A short summary of the post..."
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Category</label>
                        <input
                            type="text"
                            value={formData.category}
                            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                            className={inputClass}
                            placeholder="e.g. Market Updates"
                            list="blog-category-options"
                        />
                        <datalist id="blog-category-options">
                            {Array.from(new Set(posts.map((p) => p.category).filter(Boolean))).map((c) => (
                                <option key={c as string} value={c as string} />
                            ))}
                        </datalist>
                        <p className="mt-1 text-[11px] text-[#5F656D]">Optional. The Latest Blog Posts block can filter by category.</p>
                    </div>
                    <div>
                        <label className={labelClass}>Body *</label>
                        <RichTextField
                            value={formData.body}
                            onChange={(body) => setFormData(prev => ({ ...prev, body }))}
                            minHeight={320}
                            placeholder="Write your blog post content here…"
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Featured Image</label>
                        <MediaField websiteId={websiteId} value={formData.featured_image} onChange={(p) => setFormData(prev => ({ ...prev, featured_image: p }))} size="lg" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'draft' | 'published' }))}
                                className={inputClass}
                            >
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Published Date</label>
                            <input
                                type="datetime-local"
                                value={formData.published_at}
                                onChange={(e) => setFormData(prev => ({ ...prev, published_at: e.target.value }))}
                                className={inputClass}
                            />
                        </div>
                    </div>
                </div>

                <div className="border border-[#E4E7EB] bg-white rounded-xl p-6 space-y-5">
                    <p className={sectionLabel}>SEO</p>
                    <div>
                        <label className={labelClass}>Meta Title</label>
                        <input
                            type="text"
                            value={formData.meta_title}
                            onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                            className={inputClass}
                            placeholder="Custom page title for search engines"
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Meta Description</label>
                        <textarea
                            value={formData.meta_description}
                            onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                            rows={2}
                            className={textareaClass}
                            placeholder="Short description for search engine results"
                        />
                    </div>
                </div>

            </div>
        );
    }

    // List view — cards matching the Pages tab design.
    return (
        <div className="space-y-3">
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <svg className="animate-spin h-5 w-5 text-[#8B9096]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
            ) : posts.length === 0 ? (
                <div className="bg-white border border-[#E4E7EB] rounded-[4px] shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)] p-12 text-center">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[#E0F2FE] mb-3">
                        <svg className="h-5 w-5 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" /></svg>
                    </div>
                    <h4 className="text-sm font-semibold text-[#111315] mb-1">No blog posts yet</h4>
                    <p className="text-[12px] text-[#5F656D] mb-4">Create your first blog post to share articles with your audience.</p>
                    <button type="button" onClick={startCreate} className="h-8 px-4 bg-[#1693C9] text-white text-[12px] font-medium rounded-[4px] hover:bg-[#1380AF] transition-colors">
                        Create First Post
                    </button>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {posts.map((post) => {
                        const open = () => startEdit(post);
                        return (
                            <div
                                key={post.id}
                                className="group bg-white border border-[#E4E7EB] rounded-[4px] shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)] hover:shadow-[0_2px_3px_-1px_rgba(17,19,21,0.16)] hover:border-[#D1D5DB] transition-all flex items-center"
                            >
                                {/* Featured image / icon chip */}
                                <button type="button" onClick={open} className="shrink-0 pl-3 flex items-center" aria-label={`Edit ${post.title}`}>
                                    {post.featured_image ? (
                                        <span className="h-10 w-10 rounded-[4px] bg-[#F3F4F6] bg-cover bg-center block" style={{ backgroundImage: `url(${postImageUrl(post.featured_image)})` }} />
                                    ) : (
                                        <span className="h-10 w-10 rounded-[4px] bg-[#E0F2FE] flex items-center justify-center">
                                            <svg className="h-5 w-5 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" /></svg>
                                        </span>
                                    )}
                                </button>

                                {/* Content + actions */}
                                <div className="flex-1 min-w-0 flex items-center gap-4 px-4 py-4">
                                    <div className="min-w-0 flex-1">
                                        <button type="button" onClick={open} className="block max-w-full text-left">
                                            <span className="inline-flex items-center gap-2 max-w-full">
                                                <span className="text-[15px] font-semibold text-[#111315] truncate hover:text-[#1693C9] transition-colors">{post.title}</span>
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 ${
                                                    post.status === 'published' ? 'bg-[#E8F5E0] text-[#63A205]' : 'bg-[#F3F4F6] text-[#5F656D]'
                                                }`}>
                                                    {post.status}
                                                </span>
                                            </span>
                                        </button>
                                        <p className="text-[11px] text-[#8B9096] truncate mt-0.5">
                                            <span className="font-mono">/blog/{post.slug}</span>
                                            {' · '}
                                            {post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Not published'}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={open}
                                        className="h-8 px-3.5 text-[12px] font-medium text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] transition-colors flex items-center gap-1.5 shrink-0"
                                    >
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(post.id)}
                                        disabled={deleting === post.id}
                                        className="h-8 px-3 text-[12px] font-medium text-[#DC2626] border border-[#F0C2C2] rounded-[4px] hover:bg-[#FEF2F2] transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-30"
                                    >
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
