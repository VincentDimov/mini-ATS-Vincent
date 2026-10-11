import { requireCustomer } from "@/lib/auth";
import { JobDetail } from "@/components/job-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCustomer();
  return <JobDetail id={(await params).id} />;
}
