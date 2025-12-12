import { SectionBlock } from "@/lib/types";
import HeroSection from "./HeroSection";
import FeaturesSection from "./FeaturesSection";
import TestimonialsSection from "./TestimonialsSection";
import FaqSection from "./FaqSection";
import CtaSection from "./CtaSection";
import CustomHtmlSection from "./CustomHtmlSection";

export default function SectionRenderer({ section }: { section: SectionBlock }) {
    if (!section.enabled) return null;

    switch (section.type) {
        case 'hero': return <HeroSection props={section.props} />;
        case 'features': return <FeaturesSection props={section.props} />;
        case 'testimonials': return <TestimonialsSection props={section.props} />;
        case 'faq': return <FaqSection props={section.props} />;
        case 'cta': return <CtaSection props={section.props} />;
        case 'customHtml': return <CustomHtmlSection props={section.props} />;
        default: return null;
    }
}
