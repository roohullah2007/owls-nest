// Google review testimonials shown in the TestimonialsCarousel (reused across
// home, about, buyers, sellers). Copy kept verbatim from the design contract.

export interface Testimonial {
    id: string;
    name: string;
    quote: string;
    timeAgo: string;
    /** Avatar photo URL. When absent, a colored initial badge is shown instead. */
    avatar?: string;
    /** Single-letter fallback avatar. */
    initial?: string;
    /** Background color (CSS value) for the initial badge. */
    initialBg?: string;
}

export const TESTIMONIALS: Testimonial[] = [
    {
        id: 'susan',
        name: 'Susan',
        quote: "\"We wanted to share our experience with Owl's Nest Realty. Tom DeMatteo was our agent. He was very helpful to us. He showed us all around the Campton and Thornton area. We went all over the place in the golf cart. We purchased land in the Rising Ridge neighborhood. We don't golf but love Owl's Nest and all the amenities they have for us. Campton is a fun and neat town. Thanks for all you did for us, Tom.\"",
        timeAgo: '8 months ago',
        avatar: 'https://lh3.googleusercontent.com/a-/ALV-UjWQPe9j6cc9G7V14NNhm3p3ZgY9VUy2HVgMvQNwvPN2NaAeR3k=w40-h40-c-rp-mo-ba2-br100',
    },
    {
        id: 'bethany-knight',
        name: 'Bethany Knight',
        quote: '"Closing went well. Dad is successfully a new homeowner once again. People were professional and personable."',
        timeAgo: '5 years ago',
        initial: 'B',
        initialBg: '#7d7d7d',
    },
    {
        id: 'denkopf',
        name: 'denkopf',
        quote: '"Tom DeMatteo, our agent for this buy, was very attentive. Communication was excellent throughout. He answered questions at all hours. We are snowmobilers and wanted to be on the trails, so he took us out on the trails. This purchase is land only and even after the closing he continues to work with us on the site prep and build to come. To date, extremely happy."',
        timeAgo: '6 years ago',
        initial: 'd',
        initialBg: '#3c8c3c',
    },
];

/** Public Google reviews link used by the carousel's "Verified" footer. */
export const GOOGLE_REVIEWS_URL =
    'https://www.google.com/search?q=Owl%27s+Nest+Real+Estate+Campton+NH+reviews';
