import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";

export function Footer() {
  const t = useTranslations("footer");

  const columns = [
    {
      title: t("platform"),
      links: [
        { label: t("compose"), href: "#" },
        { label: t("guard"), href: "#" },
        { label: t("command"), href: "#" },
      ],
    },
    {
      title: t("solutions"),
      links: [
        { label: t("ecommerce"), href: "#" },
        { label: t("agency"), href: "#" },
        { label: t("enterprise"), href: "#" },
      ],
    },
    {
      title: t("company"),
      links: [
        { label: t("about"), href: "#" },
        { label: t("careers"), href: "#" },
        { label: t("contact"), href: "#" },
        { label: t("press"), href: "#" },
      ],
    },
    {
      title: t("legal"),
      links: [
        { label: t("privacy"), href: "#" },
        { label: t("terms"), href: "#" },
        { label: t("cookies"), href: "#" },
      ],
    },
  ];

  return (
    <footer className="border-t border-brand-gray-200 bg-white">
      <Container className="py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-6">
          {/* Brand Column */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-black">
                <span className="text-sm font-bold text-white">Y</span>
              </div>
              <span className="text-lg font-bold tracking-tight">Yappaflow</span>
            </div>

            <div className="space-y-3 text-sm text-gray-500">
              <div>
                <p className="font-medium text-brand-gray-900">{t("headquarters")}</p>
                <p>{t("address")}</p>
              </div>
              <div>
                <p className="font-medium text-brand-gray-900">{t("getInTouch")}</p>
                <p>{t("email")}</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-gray-400">{t("dataNotice")}</p>
          </div>

          {/* Link Columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 text-sm font-semibold text-brand-gray-900">
                {col.title}
              </h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-gray-500 transition-colors hover:text-brand-black"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-12 border-t border-brand-gray-200 pt-8 text-center text-sm text-gray-400">
          {t("copyright")}
        </div>
      </Container>
    </footer>
  );
}
