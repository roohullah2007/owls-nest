// Recent blog post rotator data for the home page. Each slide promotes one post
// as the big feature and lists three others alongside it.

export interface BlogPost {
    image: string;
    date: string;
    title: string;
}

export interface BlogSlide {
    big: BlogPost;
    small: BlogPost[];
}

const POSTS = {
    mashpee: {
        image: '/images/hero-communities.webp',
        date: 'April 16, 2026',
        title: 'Mashpee Neighborhoods For Golf, Ponds, And Beaches',
    },
    secondHome: {
        image: '/images/hero-owls-nest-resort.webp',
        date: 'May 7, 2026',
        title: 'What It Is Like To Own A Second Home On Cape Cod',
    },
    checklist: {
        image: '/images/waterfront-living.webp',
        date: 'March 5, 2026',
        title: 'Out-Of-State Buyer Checklist For Closing On A Cape Cod Home',
    },
    falmouth: {
        image: '/images/hero-lakes-region.webp',
        date: 'April 2, 2026',
        title: 'Falmouth Villages Guide For Cape Cod Home Buyers',
    },
} satisfies Record<string, BlogPost>;

export const BLOG_SLIDES: BlogSlide[] = [
    {
        big: POSTS.mashpee,
        small: [POSTS.secondHome, POSTS.checklist, POSTS.falmouth],
    },
    {
        big: POSTS.secondHome,
        small: [POSTS.mashpee, POSTS.falmouth, POSTS.checklist],
    },
    {
        big: POSTS.checklist,
        small: [POSTS.falmouth, POSTS.mashpee, POSTS.secondHome],
    },
];
