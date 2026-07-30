import { LibraryPage } from "@/components/library-page";

export default async function CollectionPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LibraryPage scope="all" collectionId={id} />;
}
