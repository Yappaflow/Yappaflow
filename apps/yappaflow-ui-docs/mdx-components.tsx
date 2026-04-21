import type { MDXComponents } from "mdx/types";
import { LiveExample } from "@/components/docs/LiveExample";
import { CopyablePre } from "@/components/docs/CopyablePre";

/**
 * Global MDX component overrides.
 *
 * We expose the interactive docs widgets (<LiveExample>) so any .mdx file
 * can drop them in without importing, and replace <pre> with the copyable
 * variant so every code block gets a hover-revealed Copy button.
 *
 * .docs-prose handles the rest of the visual styling — only override where
 * HTML alone can't express the right semantics.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    pre: CopyablePre,
    LiveExample,
  };
}
