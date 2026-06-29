// Buyer FAQ content shown in the FaqAccordion on the buyers page. Copy kept
// verbatim from the design contract (design-reference/buyers.html).

export interface Faq {
    /** Question shown in the navy summary bar. */
    q: string;
    /** Answer paragraphs revealed when the item is open. */
    a: string[];
}

export const BUYER_FAQS: Faq[] = [
    {
        q: "Why choose Owl's Nest Real Estate over a discount brokerage?",
        a: [
            'Real estate is one of the largest financial transactions most people make — and the brokerage you choose can directly impact your final sale price, time on market, and overall experience.',
            'While some brokerages compete by charging the lowest commission possible, our focus is maximizing your net return through strategic pricing, professional marketing, high-end photography and video, targeted digital advertising, buyer network exposure, and strong negotiation.',
            'In many cases, the difference between an average listing strategy and an exceptional one can far outweigh a 1–2% commission difference.',
            "We don't aim to be the cheapest brokerage — we aim to deliver the strongest results.",
        ],
    },
    {
        q: "What's the advantage of having a buyer's agent?",
        a: [
            'Buying a property involves far more than just scheduling showings. We help protect your interests throughout the entire process — from identifying red flags and evaluating value to negotiating pricing, contingencies, inspections, and contract terms.',
            'We also provide access to local market insight, trusted vendor recommendations, and guidance designed to help you make confident long-term decisions rather than emotional short-term ones.',
            'In competitive markets, having experienced representation can make the difference between simply getting under contract and actually making a smart purchase.',
        ],
    },
    {
        q: 'Do I need to be pre-approved before looking at homes?',
        a: [
            'Not always — but getting pre-approved early gives you a major advantage.',
            "Pre-approval helps you understand your true budget, strengthens your negotiating position, and allows you to move quickly when the right property hits the market. In today's market, sellers often take financed offers more seriously when a buyer is already fully vetted by a lender.",
            'We work with several trusted lenders and can help connect you with financing options that fit your goals.',
        ],
    },
    {
        q: 'How long does the home-buying process take?',
        a: [
            'Every transaction is different, but most purchases take approximately 30–45 days from accepted offer to closing.',
            'The timeline can vary depending on financing, inspections, negotiations, title work, and the complexity of the transaction. Our job is to help keep everything moving smoothly, communicate clearly throughout the process, and avoid unnecessary delays whenever possible.',
            'We believe buying real estate should feel organized and strategic — not stressful and confusing.',
        ],
    },
];
