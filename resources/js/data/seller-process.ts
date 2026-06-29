// The four steps of the Owl's Nest seller process, rendered as ProcessStepCards
// in the navy "Our Seller Process" rail on the sellers page. Copy kept verbatim
// from the design contract (design-reference/sellers.html).

export interface ProcessStep {
    /** Two-digit step label shown as the large translucent number (01–04). */
    number: string;
    title: string;
    description: string;
}

export const SELLER_PROCESS: ProcessStep[] = [
    {
        number: '01',
        title: 'Property Consultation',
        description:
            "We start with an in-depth conversation about your property, goals, timing, and overall strategy. We'll review upgrades, market conditions, and opportunities to maximize value before going live.",
    },
    {
        number: '02',
        title: 'Pricing & Marketing Strategy',
        description:
            'We analyze current market data, buyer demand, competing inventory, and local trends to strategically position your property for maximum exposure and strongest possible offers. Professional photography, drone media, social advertising, and premium listing presentation are all prepared during this phase.',
    },
    {
        number: '03',
        title: 'Launch, Showings & Negotiation',
        description:
            'Once live, we actively market your property across multiple platforms while coordinating showings, communicating with buyers and agents, and negotiating offers and terms on your behalf. Our goal is to create competition and leverage that helps maximize your final outcome.',
    },
    {
        number: '04',
        title: 'Under Contract To Closing',
        description:
            'After accepting an offer, we manage the transaction from contract to closing — including inspections, contingencies, communication, timelines, and coordination with lenders, attorneys, and title companies. We stay hands-on throughout to help ensure a smooth and successful closing.',
    },
];
