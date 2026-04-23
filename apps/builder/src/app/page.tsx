import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Builder landing page. Phase 8 is still agency-facing, single-project for
 * now — this page just routes to the sample project at /p/sample for
 * development. Phase 10.5 replaces it with a project list fed by the
 * server-side /projects cache.
 */
export default function Home() {
  return (
    <main className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <span className="text-xs uppercase tracking-[0.22em] opacity-60">
          Yappaflow · Builder
        </span>
        <ThemeToggle />
      </header>

      <section className="flex flex-1 items-center px-6 md:px-10">
        <div className="w-full max-w-2xl">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 px-3 py-1 text-xs dark:border-white/10">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
            <span className="opacity-70">Phase 8 · in progress</span>
          </p>
          <h1 className="text-5xl font-semibold tracking-tight md:text-6xl">
            A builder for sites the AI assembled.
          </h1>
          <p className="mt-6 max-w-xl text-lg opacity-70">
            Drop a brief on{" "}
            <a
              href="https://yappaflow.com"
              className="underline underline-offset-4 hover:decoration-current"
            >
              yappaflow.com
            </a>
            , pick references, shape the result here, export to your CMS. The
            agency surface lives on this subdomain from Phase 10 onward.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/p/sample"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:opacity-90 dark:bg-paper dark:text-ink"
            >
              Open sample project
              <span aria-hidden="true">→</span>
            </Link>
            <span className="text-xs opacity-50">
              Dev entry point — real projects arrive via the studio flow from
              Phase 10.5.
            </span>
          </div>

          <dl className="mt-12 grid gap-6 sm:grid-cols-3">
            <Step
              phase="7"
              title="Canonical format"
              body="SiteProject schema + section library. Shipped."
              done
            />
            <Step
              phase="8"
              title="Builder UI"
              body="Canvas, section list, right-rail editor, inline text."
            />
            <Step
              phase="10"
              title="Shopify export"
              body="Deterministic adapter-v2 converts SiteProject → theme."
            />
          </dl>
        </div>
      </section>

      <footer className="flex items-center justify-between px-6 py-5 text-xs opacity-50 md:px-10">
        <span>© {new Date().getFullYear()} Yappaflow</span>
        <span>builder.yappaflow.com</span>
      </footer>
    </main>
  );
}

function Step({
  phase,
  title,
  body,
  done = false,
}: {
  phase: string;
  title: string;
  body: string;
  done?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 border-l border-black/10 pl-4 dark:border-white/10">
      <dt className="text-xs uppercase tracking-wider opacity-50">
        Phase {phase}
        {done ? " · done" : ""}
      </dt>
      <dd className="text-base font-medium">{title}</dd>
      <dd className="text-sm opacity-65">{body}</dd>
    </div>
  );
}
