/*
 | Block registry — maps a page design (template) + block type to its React
 | component. A block type can render differently per design (e.g. classic vs
 | video-landing testimonials/lead-form/cta have their own styled versions),
 | so the registry is keyed by template first, then type. Mirrors the old
 | partials/blocks-renderer.blade.php whitelist + per-template view resolution.
 */
import type { ComponentType } from 'react';
import type { BlockProps } from './types';

// Classic design blocks
import Hero from './blocks/classic/Hero';
import Logos from './blocks/classic/Logos';
import Content from './blocks/classic/Content';
import About from './blocks/classic/About';
import ValueProps from './blocks/classic/ValueProps';
import Steps from './blocks/classic/Steps';
import Calculator from './blocks/classic/Calculator';
import Testimonials from './blocks/classic/Testimonials';
import TestimonialLegacy from './blocks/classic/TestimonialLegacy';
import VideoBlock from './blocks/classic/VideoBlock';
import VideoTestimonials from './blocks/classic/VideoTestimonials';
import LeadForm from './blocks/classic/LeadForm';
import Cta from './blocks/classic/Cta';

// Video Landing design blocks
import HeroVideo from './blocks/video/HeroVideo';
import Benefits from './blocks/video/Benefits';
import VideoTestimonialsBlock from './blocks/video/Testimonials';
import Guarantee from './blocks/video/Guarantee';
import Authority from './blocks/video/Authority';
import VideoLeadForm from './blocks/video/LeadForm';
import VideoCta from './blocks/video/Cta';

type BlockComponent = ComponentType<BlockProps>;

const CLASSIC: Record<string, BlockComponent> = {
    hero: Hero,
    logos: Logos,
    content: Content,
    about: About,
    'value-props': ValueProps,
    steps: Steps,
    calculator: Calculator,
    testimonials: Testimonials,
    testimonial: TestimonialLegacy,
    'video-testimonials': VideoTestimonials,
    video: VideoBlock,
    'lead-form': LeadForm,
    cta: Cta,
};

const VIDEO_LANDING: Record<string, BlockComponent> = {
    'hero-video': HeroVideo,
    benefits: Benefits,
    testimonials: VideoTestimonialsBlock,
    guarantee: Guarantee,
    authority: Authority,
    'lead-form': VideoLeadForm,
    cta: VideoCta,
};

export const REGISTRY: Record<string, Record<string, BlockComponent>> = {
    classic: CLASSIC,
    'video-landing': VIDEO_LANDING,
};

/** Resolve a block component for a template, falling back to the classic version. */
export function resolveBlock(template: string, type: string): BlockComponent | null {
    const map = REGISTRY[template] || CLASSIC;
    return map[type] || CLASSIC[type] || null;
}
