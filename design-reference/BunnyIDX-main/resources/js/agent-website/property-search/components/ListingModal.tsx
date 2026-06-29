import { PsListing } from '../types';
import ListingDetail from './ListingDetail';

interface Props {
    listing: PsListing | null;
    onClose: () => void;
    accent: string;
    leadEndpoint: string;
    /** Site search feed — powers the real comparables inside the detail UI. */
    searchEndpoint?: string;
    /** MLS courtesy/attribution (MLS name + logo from the search compliance block). */
    courtesy?: { office?: string | null; mlsName?: string | null; logo?: string | null; disclaimer?: string | null };
    /** Visitor-account favorite state for the open listing. */
    favorited?: boolean;
    onToggleFavorite?: (listing: PsListing) => void;
    consentText?: string;
    agent?: { name?: string | null; title?: string | null; phone?: string | null; photo?: string | null; bg?: string | null };
    showingEndpoint?: string;
    customBlocks?: import('../lib/merge').PsDetailBlock[];
    detailSections?: Array<{ key: string; label?: string; enabled?: boolean }>;
}

/**
 * Card-click property modal — a thin overlay wrapper around the shared
 * <ListingDetail>. The same component renders the standalone detail page
 * (mode="page"), so both screens stay identical.
 */
export default function ListingModal({ listing, onClose, accent, leadEndpoint, searchEndpoint, courtesy, favorited, onToggleFavorite, consentText, agent, showingEndpoint, customBlocks, detailSections }: Props) {
    return <ListingDetail listing={listing} accent={accent} leadEndpoint={leadEndpoint} searchEndpoint={searchEndpoint} courtesy={courtesy} favorited={favorited} onToggleFavorite={onToggleFavorite} consentText={consentText} agent={agent} showingEndpoint={showingEndpoint} customBlocks={customBlocks} detailSections={detailSections} mode="modal" onClose={onClose} />;
}
