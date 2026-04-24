import { ProjectPageView } from "@/components/project-page-view";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ handle: string[] }>;
}) {
  const { handle } = await params;
  const slug = `/products/${handle.join("/")}`;
  return <ProjectPageView projectId="sample" slug={slug} />;
}
