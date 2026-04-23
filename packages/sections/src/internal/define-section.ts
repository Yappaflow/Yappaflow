/**
 * defineSection — the single declaration helper every section folder uses.
 *
 * A SectionDefinition bundles the four artefacts the rest of Yappaflow needs
 * from a section type: the Zod schema for its content, the default content
 * for a freshly-inserted instance, its named variants, and the React render
 * component. The MCP assembler uses `defaultContent` and `defaultVariant` to
 * seed a SiteProject; the builder uses the schema to drive the right rail
 * property panel; the CMS adapters-v2 walk the schema to know what fields to
 * serialize.
 *
 * Keeping this as a thin generic wrapper (rather than a class) lets the AI
 * generate SiteProject JSON without instantiating anything — the definitions
 * are plain objects.
 */

import type { ComponentType } from "react";
import type { z } from "zod";
import type { Section, SectionType } from "@yappaflow/types";

/**
 * Loose Zod schema constraint. We accept any schema whose parsed output is
 * assignable to TContent; the schema's INPUT type is left open (any) because
 * Zod's .default() makes inputs different from outputs and we don't care
 * about the input side at the definition boundary — the builder and the MCP
 * only care about parsed results. The narrower `ZodType<TContent>` constraint
 * rejected every schema that used `.default()` anywhere inside it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySchema<TOutput> = z.ZodType<TOutput, z.ZodTypeDef, any>;

export interface SectionDefinition<
  TType extends SectionType = SectionType,
  TContent = unknown,
  TVariant extends string = string,
> {
  /** The section type literal from @yappaflow/types. */
  type: TType;
  /** Zod schema for `section.content` when `section.type === type`. */
  contentSchema: AnySchema<TContent>;
  /** Named variants — order here drives the builder's variant dropdown. */
  variants: readonly TVariant[];
  /** The variant chosen when none is specified. */
  defaultVariant: TVariant;
  /** Starter content the assembler / builder uses for a fresh instance. */
  defaultContent: TContent;
  /** Placeholder-quality React renderer. Phase 8 replaces with real UI. */
  Component: ComponentType<{ section: Section }>;
}

export function defineSection<
  TType extends SectionType,
  TContent,
  TVariant extends string,
>(
  def: SectionDefinition<TType, TContent, TVariant>,
): SectionDefinition<TType, TContent, TVariant> {
  return def;
}
