import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("terms");
  return { title: t("metaTitle") };
}

export default function TermsPage() {
  const t = useTranslations("terms");
  const email = t("contactEmail");

  return (
    <div className="min-h-screen bg-brand-dark text-white">
      {/* Atmosphere */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44IiBudW1PY3RhdmVzPSI0IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==")`,
            backgroundRepeat: "repeat",
          }}
        />
      </div>

      {/* Nav */}
      <div className="relative z-10 px-6 py-6">
        <a href="/" className="font-heading text-lg uppercase tracking-tight text-white hover:text-brand-orange transition-colors">
          {t("brand")}
        </a>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 pb-32">
        <h1 className="font-heading text-4xl sm:text-5xl uppercase tracking-tight mb-4">
          {t("titleLead")} <span className="text-brand-orange">{t("titleAccent")}</span>
        </h1>
        <p className="text-xs text-white/25 mb-12">{t("lastUpdated")}</p>

        <div className="space-y-10 text-sm text-white/50 leading-relaxed">
          <section>
            <h2 className="font-heading text-lg uppercase tracking-tight text-white mb-3">{t("s1Title")}</h2>
            <p>{t("s1Body")}</p>
          </section>

          <section>
            <h2 className="font-heading text-lg uppercase tracking-tight text-white mb-3">{t("s2Title")}</h2>
            <p>{t("s2Body")}</p>
          </section>

          <section>
            <h2 className="font-heading text-lg uppercase tracking-tight text-white mb-3">{t("s3Title")}</h2>
            <ul className="list-disc list-inside space-y-1.5">
              <li>{t("s3Item1")}</li>
              <li>{t("s3Item2")}</li>
              <li>{t("s3Item3")}</li>
              <li>{t("s3Item4")}</li>
              <li>{t("s3Item5")}</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-lg uppercase tracking-tight text-white mb-3">{t("s4Title")}</h2>
            <p>{t("s4Intro")}</p>
            <ul className="list-disc list-inside mt-3 space-y-1.5">
              <li>{t("s4Item1")}</li>
              <li>{t("s4Item2")}</li>
              <li>{t("s4Item3")}</li>
              <li>{t("s4Item4")}</li>
              <li>{t("s4Item5")}</li>
              <li>{t("s4Item6")}</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-lg uppercase tracking-tight text-white mb-3">{t("s5Title")}</h2>
            <p>{t("s5Body")}</p>
          </section>

          <section>
            <h2 className="font-heading text-lg uppercase tracking-tight text-white mb-3">{t("s6Title")}</h2>
            <p>{t("s6Body")}</p>
          </section>

          <section>
            <h2 className="font-heading text-lg uppercase tracking-tight text-white mb-3">{t("s7Title")}</h2>
            <ul className="list-disc list-inside space-y-1.5">
              <li>{t("s7Item1")}</li>
              <li>{t("s7Item2")}</li>
              <li>{t("s7Item3")}</li>
              <li>{t("s7Item4")}</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-lg uppercase tracking-tight text-white mb-3">{t("s8Title")}</h2>
            <p>{t("s8Body")}</p>
          </section>

          <section>
            <h2 className="font-heading text-lg uppercase tracking-tight text-white mb-3">{t("s9Title")}</h2>
            <p>{t("s9Body")}</p>
          </section>

          <section>
            <h2 className="font-heading text-lg uppercase tracking-tight text-white mb-3">{t("s10Title")}</h2>
            <p>{t("s10Body")}</p>
          </section>

          <section>
            <h2 className="font-heading text-lg uppercase tracking-tight text-white mb-3">{t("s11Title")}</h2>
            <p>{t("s11Body")}</p>
          </section>

          <section>
            <h2 className="font-heading text-lg uppercase tracking-tight text-white mb-3">{t("s12Title")}</h2>
            <p>
              {t("s12BodyLead")}
              <a href={`mailto:${email}`} className="text-brand-orange hover:underline">{email}</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
