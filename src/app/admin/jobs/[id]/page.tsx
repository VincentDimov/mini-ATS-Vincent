import { requireAdmin } from "@/lib/auth";
import { JobDetail } from "@/components/job-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  return <JobDetail id={(await params).id} />;
}
