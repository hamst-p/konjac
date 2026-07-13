import type { Metadata } from "next";
import { DocumentList } from "@/components/document-list";

export const metadata: Metadata = {
  title: "Konjac",
  description: "A bilingual block editor for English and Japanese article translation.",
};

export default function Home() {
  return <DocumentList />;
}

