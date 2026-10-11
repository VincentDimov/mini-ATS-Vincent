import type { CandidateWithJob, Job, Organization, Profile } from "@/lib/types";
export interface JobGroup {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  created_at: string;
}
export interface GroupMember {
  id: string;
  group_id: string;
  profile_id: string;
  organization_id: string;
}
export interface GroupJob {
  id: string;
  group_id: string;
  job_id: string;
  organization_id: string;
}
export interface CandidateNote {
  id: string;
  candidate_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
}
export interface Interview {
  id: string;
  organization_id: string;
  candidate_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location: string;
  notes: string;
  status: "scheduled" | "completed" | "cancelled";
}
export interface ActivityEvent {
  id: string;
  organization_id: string | null;
  job_id: string | null;
  actor_id: string | null;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  details: { from_stage?: string; to_stage?: string; status?: string };
  created_at: string;
}
export interface CollaborationData {
  profiles: Profile[];
  groups: JobGroup[];
  members: GroupMember[];
  links: GroupJob[];
  interviews: Interview[];
  events: ActivityEvent[];
}
export interface WorkspacePageData extends CollaborationData {
  jobs: Job[];
  candidates: CandidateWithJob[];
  organization: Organization;
  canManage: boolean;
}
