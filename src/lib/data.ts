import type {
  Candidate,
  CandidateWithJob,
  Job,
  Organization,
} from "@/lib/types";

type SupabaseClient = import("@supabase/supabase-js").SupabaseClient;

function rows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

export async function getOrganization(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<Organization | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, website_url, industry, location, created_at, updated_at")
    .eq("id", organizationId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Organization;
}

export async function getWorkspaceData(
  supabase: SupabaseClient,
  organizationId?: string,
) {
  const [jobsResponse, candidatesResponse] = await Promise.all([
    supabase
      .from("jobs")
      .select("*")
      .match(organizationId ? { organization_id: organizationId } : {})
      .order("created_at", { ascending: false }),
    supabase
      .from("candidates")
      .select("*")
      .match(organizationId ? { organization_id: organizationId } : {})
      .order("created_at", { ascending: false }),
  ]);

  if (jobsResponse.error) throw new Error("Jobs could not be loaded.");
  if (candidatesResponse.error)
    throw new Error("Candidates could not be loaded.");

  const jobs = rows<Job>(jobsResponse.data);
  const jobById = new Map(jobs.map((job) => [job.id, job]));
  const candidates = rows<Candidate>(candidatesResponse.data).flatMap(
    (candidate) => {
      const job = jobById.get(candidate.job_id);
      if (!job) return [];
      return [
        {
          ...candidate,
          job: {
            id: job.id,
            title: job.title,
            description: job.description,
            status: job.status,
          },
        } satisfies CandidateWithJob,
      ];
    },
  );

  return { jobs, candidates };
}

export async function getAllOrganizations(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, website_url, industry, location, created_at, updated_at")
    .order("name");
  if (error) throw new Error("Organizations could not be loaded.");
  return rows<Organization>(data);
}
