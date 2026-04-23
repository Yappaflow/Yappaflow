import type { Section } from "@yappaflow/types";
import { ExhibitPricing } from "yappaflow-ui";
import { PlaceholderSection } from "../internal/placeholder.js";
import { PricingContentSchema } from "./schema.js";
import { DEFAULT_PRICING_VARIANT } from "./variants.js";

export function PricingSection({ section }: { section: Section }) {
  const parsed = PricingContentSchema.safeParse(section.content);
  const content = parsed.success ? parsed.data : null;
  const variant = section.variant ?? DEFAULT_PRICING_VARIANT;

  return (
    <PlaceholderSection section={section} variant={variant}>
      {content ? (
        <ExhibitPricing
          eyebrow={content.eyebrow}
          heading={content.heading}
          subheading={content.subheading}
          tiers={content.tiers}
        />
      ) : (
        <em className="block p-6 text-sm text-neutral-500">invalid pricing content</em>
      )}
    </PlaceholderSection>
  );
}
