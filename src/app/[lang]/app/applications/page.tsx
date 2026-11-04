import type { Metadata } from "next";
import { ApplicationsList } from "@/components/app/applications-list";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.applicationsTitle, description: t.meta.applicationsDescription };
}

export default function ApplicationsPage() {
  return <ApplicationsList />;
}
