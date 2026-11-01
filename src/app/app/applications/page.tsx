import type { Metadata } from "next";
import { ApplicationsList } from "@/components/app/applications-list";

export const metadata: Metadata = {
  title: "My applications",
  description: "Every job you have checked, with its scores and status.",
};

export default function ApplicationsPage() {
  return <ApplicationsList />;
}
