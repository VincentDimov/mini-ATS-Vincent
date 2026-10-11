import { ActivityWorkspace } from "@/components/activity-workspace";
import { GroupsWorkspace } from "@/components/groups-workspace";
import { ScheduleWorkspace } from "@/components/schedule-workspace";
import { TeamWorkspace } from "@/components/team-workspace";
import { InsightsWorkspace } from "@/components/insights-workspace";
import { SearchWorkspace } from "@/components/search-workspace";
import { SettingsWorkspace } from "@/components/settings-workspace";
import type { Profile, Job, CandidateWithJob } from "@/lib/types";
import type { CollaborationData } from "@/lib/workspace-types";
export function WorkspaceToolView({
  tool,
  organizationId,
  data,
  jobs,
  candidates,
  profile,
  initialQuery,
}: {
  tool: string;
  organizationId: string;
  data: CollaborationData;
  jobs: Job[];
  candidates: CandidateWithJob[];
  profile: Profile;
  initialQuery?: string;
}) {
  const canManage = profile.role === "admin" || profile.is_org_manager;
  switch (tool) {
    case "team":
      return (
        <TeamWorkspace
          organizationId={organizationId}
          profiles={data.profiles}
          jobs={jobs}
          canManage={canManage}
          currentUserId={profile.id}
        />
      );
    case "groups":
      return (
        <GroupsWorkspace
          organizationId={organizationId}
          profiles={data.profiles}
          jobs={jobs}
          groups={data.groups}
          members={data.members}
          links={data.links}
          canManage={canManage}
        />
      );
    case "activity":
      return <ActivityWorkspace events={data.events} />;
    case "schedule":
      return (
        <ScheduleWorkspace
          interviews={data.interviews}
          candidates={candidates}
        />
      );
    case "insights":
      return <InsightsWorkspace jobs={jobs} candidates={candidates} />;
    case "search":
      return (
        <SearchWorkspace
          jobs={jobs}
          candidates={candidates}
          admin={profile.role === "admin"}
          initialQuery={initialQuery}
        />
      );
    case "settings":
      return <SettingsWorkspace email={profile.email} />;
    default:
      return null;
  }
}
