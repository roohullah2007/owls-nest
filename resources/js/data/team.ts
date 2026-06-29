// Team member data for the About page's alternating image/text rows
// (TeamMemberRow). Bios kept verbatim from the design contract (about.html).

export interface TeamMember {
    id: string;
    name: string;
    role: string;
    photo: string;
    photoAlt: string;
    bio: string[];
    /** Extra classes for the photo (e.g. Enzo's `object-top` crop). */
    imageClassName?: string;
}

export const TEAM: TeamMember[] = [
    {
        id: 'tom-dematteo',
        name: 'Tom DeMatteo',
        role: "Broker/Owner, Owl's Nest Real Estate",
        photo: '/assets/images/team-tom.png',
        photoAlt: 'Tom DeMatteo',
        bio: [
            "Tom DeMatteo is the Broker/Owner of Owl's Nest Real Estate, a boutique firm based in New Hampshire's White Mountains, specializing in residential, land, and development opportunities throughout Campton, Thornton, Plymouth, and surrounding areas.",
            'Since launching the brokerage in 2019, Tom has built a reputation for a highly strategic, results-driven approach to real estate. He works closely with buyers, sellers, and investors to not only facilitate transactions, but to identify ways to maximize value—whether through pricing strategy, land use potential, or long-term investment positioning.',
            'With extensive experience in land analysis, subdivision feasibility, and new construction planning, Tom brings a level of insight that goes well beyond the traditional real estate model. He is known for helping clients understand what a property can become—not just what it is today—giving them a meaningful advantage in both competitive and off-market opportunities.',
            "Tom takes a hands-on approach to every deal, guiding clients through each step with clear communication, practical advice, and a strong understanding of the local market. His ability to combine technical knowledge with real-world strategy has made him a trusted resource for clients ranging from first-time buyers to seasoned investors. Whether you're buying, selling, or developing property in the White Mountains, Tom delivers the expertise and execution needed to move forward with confidence.",
        ],
    },
    {
        id: 'dawn-assencoa',
        name: 'Dawn Assencoa',
        role: "Realtor® | Owl's Nest Real Estate",
        photo: '/assets/images/team-dawn.png',
        photoAlt: 'Dawn Assencoa',
        bio: [
            "Dawn Assencoa is a real estate professional with Owl's Nest Real Estate, bringing a strong work ethic and a practical, client-focused approach to every transaction. Now based in Plymouth, New Hampshire, she serves clients throughout the surrounding White Mountains region.",
            "Dawn spent much of her career working within her family's well-established roofing company in Massachusetts, where she developed a deep understanding of construction, property maintenance, and what truly goes into protecting and maintaining a home. That hands-on background gives her clients a valuable perspective when evaluating properties—helping them look beyond the surface and make confident, informed decisions. Like many who have made the move north, Dawn relocated to New Hampshire to enjoy a better pace of life and everything the region has to offer. Having personally gone through that transition, she relates closely to buyers coming from Massachusetts and Rhode Island, offering guidance that goes beyond the transaction itself.",
            'Dawn is known for being approachable, reliable, and detail-oriented. Whether working with first-time buyers, out-of-state clients, or sellers preparing their home for market, she is committed to providing clear communication, honest advice, and a smooth overall experience. With her strong foundation in the trades, local insight, and genuine enthusiasm for helping others make the move to New Hampshire, Dawn is a trusted resource for clients looking to buy or sell in the Plymouth area and beyond.',
        ],
    },
    {
        id: 'mattie-boyle',
        name: 'Mattie Boyle',
        role: "Realtor® | Owl's Nest Real Estate",
        photo: '/assets/images/team-mattie.jpeg',
        photoAlt: 'Mattie Boyle',
        bio: [
            "Mattie Boyle is a dedicated real estate professional with Owl's Nest Real Estate. As a local expert in the White Mountains region, she specializes in helping clients navigate the unique opportunities within resort markets, vacation homes, and investment properties.",
            'Mattie is particularly known for her expertise in short-term rentals. She plays a key role in managing and advising on STR properties, helping our clients understand everything from income potential and guest appeal to setup, operations, and ongoing performance. Her hands-on experience gives buyers and investors a clear advantage when evaluating properties for rental use.',
            'With a strong understanding of the local market and a practical, detail-oriented approach, Mattie is committed to making each transaction as smooth and informed as possible. Whether working with buyers searching for the right getaway, sellers positioning a property for maximum exposure, or investors looking to enter the short-term rental space, she brings clarity, responsiveness, and real-world insight to every step of the process. Living in Campton, Mattie has a true connection to the area and a deep appreciation for what makes the White Mountains such a desirable destination. Her local knowledge, combined with her STR expertise, makes her a valuable resource for anyone looking to buy or sell in the region.',
        ],
    },
    {
        id: 'enzo',
        name: 'Enzo',
        role: "Mascot | Owl's Nest Real Estate",
        photo: '/assets/images/team-enzo.png',
        photoAlt: 'Enzo, office mascot',
        imageClassName: 'object-top',
        bio: [
            "Meet our unofficial office mascot, Enzo — part greeter, part security team, and full-time morale booster. Whether he's supervising showings, greeting clients at the office, or keeping a close eye on neighborhood activity from the front window, Enzo takes his role very seriously. When he's not making rounds, you'll usually find him napping through paperwork, tagging along on property tours, or demanding attention during team meetings.",
            "Known for his friendly personality and impeccable timing, Enzo has become a familiar face around the office and a favorite among clients. He may not have a real estate license, but he definitely knows how to sniff out a good deal. Around here, no transaction is truly complete without Enzo's approval.",
        ],
    },
];
