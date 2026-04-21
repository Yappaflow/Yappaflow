import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode, { type Options as PrettyCodeOptions } from "rehype-pretty-code";
import remarkGfm from "remark-gfm";

const prettyCodeOptions: PrettyCodeOptions = {
  // Dual theme — rehype-pretty-code emits CSS variables that the ThemeProvider
  // flips when [data-theme="dark"] hits <html>.
  theme: {
    light: "github-light",
    dark: "github-dark-dimmed",
  },
  keepBackground: false,
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug, [rehypePrettyCode, prettyCodeOptions]],
  },
});

const nextConfig: NextConfig = {
  // Allow .mdx files in the app/ router tree.
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  // yappaflow-ui ships as pre-built ESM/CJS under dist/ — no transpile needed.
  experimental: {
    // Keep the door open for Turbopack-specific overrides without churn.
  },
};

export default withMDX(nextConfig);
