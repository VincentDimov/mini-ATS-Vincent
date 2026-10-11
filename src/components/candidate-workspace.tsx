"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  BriefcaseBusiness,
  GripVertical,
  Mail,
  Plus,
  Search,
  UserRound,
  Download,
  LayoutGrid,
  List,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";

import {
  createCandidate,
  updateCandidate,
  updateCandidateStage,
  deleteCandidate,
} from "@/app/actions";
import { moveCandidates } from "@/app/workspace-actions";
import { downloadText, toCsv } from "@/lib/exports";
import {
  Feedback,
  fieldClass,
  useWorkspaceAction,
} from "@/components/workspace-ui";
import {
  CandidateFormDialog,
  type CandidateFormValues,
} from "@/components/candidate-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PIPELINE_META,
  PIPELINE_STAGES,
  isPipelineStage,
} from "@/lib/pipeline";
import type { CandidateWithJob, Job, PipelineStage } from "@/lib/types";

type ViewPreferences = {
  search: string;
  jobFilter: string;
  view: "board" | "list";
  stageFilter: string;
  sort: string;
};

export function CandidateWorkspace({
  initialCandidates,
  jobs,
  organizationId,
}: {
  initialCandidates: CandidateWithJob[];
  jobs: Job[];
  organizationId?: string;
}) {
  const [preferences, setPreferences] = useState<ViewPreferences>({
    search: "",
    jobFilter: "all",
    view: "board",
    stageFilter: "all",
    sort: "newest",
  });
  // A router refresh supplies a new server snapshot. Remounting only when that
  // snapshot changes resets optimistic state without a cascading setState effect.
  const snapshotKey = [
    ...initialCandidates.map(
      (candidate) =>
        `${candidate.id}:${candidate.updated_at}:${candidate.pipeline_stage}`,
    ),
    ...jobs.map((job) => `${job.id}:${job.updated_at}:${job.status}`),
  ].join("|");

  return (
    <CandidateWorkspaceContent
      key={snapshotKey}
      initialCandidates={initialCandidates}
      jobs={jobs}
      organizationId={organizationId}
      preferences={preferences}
      setPreferences={setPreferences}
    />
  );
}

function CandidateWorkspaceContent({
  initialCandidates,
  jobs,
  organizationId,
  preferences,
  setPreferences,
}: {
  initialCandidates: CandidateWithJob[];
  jobs: Job[];
  organizationId?: string;
  preferences: ViewPreferences;
  setPreferences: Dispatch<SetStateAction<ViewPreferences>>;
}) {
  const router = useRouter();
  const [candidates, setCandidates] = useState(initialCandidates);
  const { search, jobFilter, view, stageFilter, sort } = preferences;
  const setSearch = (search: string) =>
    setPreferences((p) => ({ ...p, search }));
  const setJobFilter = (jobFilter: string) =>
    setPreferences((p) => ({ ...p, jobFilter }));
  const setView = (view: "board" | "list") =>
    setPreferences((p) => ({ ...p, view }));
  const setStageFilter = (stageFilter: string) =>
    setPreferences((p) => ({ ...p, stageFilter }));
  const setSort = (sort: string) => setPreferences((p) => ({ ...p, sort }));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<
    CandidateWithJob | undefined
  >();
  const [movingCandidateId, setMovingCandidateId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const action = useWorkspaceAction();

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return candidates
      .filter((candidate) => {
        const matchesJob =
          jobFilter === "all" || candidate.job_id === jobFilter;
        const matchesSearch =
          !query ||
          candidate.full_name.toLowerCase().includes(query) ||
          candidate.email.toLowerCase().includes(query) ||
          (candidate.tags ?? []).some((tag) =>
            tag.toLowerCase().includes(query),
          );
        return (
          matchesJob &&
          matchesSearch &&
          (stageFilter === "all" || candidate.pipeline_stage === stageFilter)
        );
      })
      .sort((a, b) =>
        sort === "name"
          ? a.full_name.localeCompare(b.full_name)
          : sort === "oldest"
            ? a.created_at.localeCompare(b.created_at)
            : b.created_at.localeCompare(a.created_at),
      );
  }, [candidates, jobFilter, search, stageFilter, sort]);

  function openCreate() {
    setEditingCandidate(undefined);
    setDialogOpen(true);
  }

  function openEdit(candidate: CandidateWithJob) {
    setEditingCandidate(candidate);
    setDialogOpen(true);
  }

  async function saveCandidate(values: CandidateFormValues) {
    setError(null);
    const input = {
      organizationId: values.organizationId,
      jobId: values.jobId,
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      linkedinUrl: values.linkedinUrl,
      currentTitle: values.currentTitle,
      currentCompany: values.currentCompany,
      notes: values.notes,
      pipelineStage: values.pipelineStage,
    };
    const result = values.candidateId
      ? await updateCandidate(values.candidateId, input)
      : await createCandidate(input);

    if (result.ok) router.refresh();
    return result;
  }

  async function moveCandidate(candidateId: string, nextStage: PipelineStage) {
    const previous = candidates;
    setMovingCandidateId(candidateId);
    setError(null);
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === candidateId
          ? { ...candidate, pipeline_stage: nextStage }
          : candidate,
      ),
    );

    const result = await updateCandidateStage(candidateId, nextStage);
    setMovingCandidateId(null);

    if (!result.ok) {
      setCandidates(previous);
      setError(result.error);
      return;
    }
    router.refresh();
  }

  function handleDragEnd(result: DropResult) {
    if (
      !result.destination ||
      result.destination.droppableId === result.source.droppableId
    )
      return;
    if (!isPipelineStage(result.destination.droppableId)) return;
    void moveCandidate(result.draggableId, result.destination.droppableId);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-primary/10 bg-card/85 p-4 shadow-lg shadow-primary/5 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 pl-9"
            placeholder="Search by name, email or label"
            aria-label="Search candidates"
          />
        </div>
        <select
          value={jobFilter}
          onChange={(event) => setJobFilter(event.target.value)}
          aria-label="Filter candidates by job"
          className="h-10 min-w-48 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="all">All jobs</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}
            </option>
          ))}
        </select>
        <Button className="h-10" onClick={openCreate}>
          <Plus /> Add candidate
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-border bg-card p-1">
            <Button
              variant={view === "board" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("board")}
            >
              <LayoutGrid />
              Board
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("list")}
            >
              <List />
              List
            </Button>
          </div>
          <select
            aria-label="Filter by pipeline stage"
            className={fieldClass + " w-auto"}
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            <option value="all">All stages</option>
            {PIPELINE_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {PIPELINE_META[stage].label}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort candidates"
            className={fieldClass + " w-auto"}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {filteredCandidates.length} candidates
          </span>
          <Button
            variant="outline"
            onClick={() =>
              downloadText(
                "mini-ats-candidates.csv",
                toCsv([
                  [
                    "Name",
                    "Email",
                    "Phone",
                    "Role",
                    "Stage",
                    "Labels",
                    "Added",
                  ],
                  ...filteredCandidates.map((c) => [
                    c.full_name,
                    c.email,
                    c.phone,
                    c.job.title,
                    PIPELINE_META[c.pipeline_stage].label,
                    (c.tags ?? []).join("; "),
                    c.created_at,
                  ]),
                ]),
                "text/csv;charset=utf-8",
              )
            }
          >
            <Download />
            Export CSV
          </Button>
        </div>
      </div>
      <Feedback value={action.feedback} />
      {view === "list" ? (
        <div className="space-y-3">
          {selected.length ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 p-3">
              <span className="text-sm font-medium">
                {selected.length} selected
              </span>
              <select
                aria-label="Move selected candidates"
                value=""
                disabled={action.pending}
                className={fieldClass + " w-auto"}
                onChange={(e) => {
                  const stage = e.target.value;
                  if (isPipelineStage(stage))
                    action.execute(
                      () => moveCandidates(selected, stage),
                      () => setSelected([]),
                    );
                }}
              >
                <option value="">Move to stage…</option>
                {PIPELINE_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {PIPELINE_META[stage].label}
                  </option>
                ))}
              </select>
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                Clear
              </Button>
            </div>
          ) : null}
          <div className="overflow-x-auto rounded-2xl border border-primary/10 bg-card">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="p-4">
                    <input
                      type="checkbox"
                      aria-label="Select visible candidates"
                      checked={
                        filteredCandidates.length > 0 &&
                        filteredCandidates.every((c) => selected.includes(c.id))
                      }
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? filteredCandidates.slice(0, 100).map((c) => c.id)
                            : [],
                        )
                      }
                    />
                  </th>
                  <th className="p-4">Candidate</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Stage</th>
                  <th className="p-4">Labels</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCandidates.map((c) => (
                  <tr key={c.id} className="hover:bg-primary/3">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        aria-label={"Select " + c.full_name}
                        checked={selected.includes(c.id)}
                        disabled={
                          !selected.includes(c.id) && selected.length >= 100
                        }
                        onChange={(e) =>
                          setSelected((current) =>
                            e.target.checked
                              ? [...current, c.id]
                              : current.filter((id) => id !== c.id),
                          )
                        }
                      />
                    </td>
                    <td className="p-4">
                      <Link
                        href={"/candidates/" + c.id}
                        className="font-medium hover:text-primary"
                      >
                        {c.full_name}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.email}
                      </p>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {c.job.title}
                    </td>
                    <td className="p-4">
                      <span
                        className={
                          "status-chip " +
                          PIPELINE_META[c.pipeline_stage].badgeClassName
                        }
                      >
                        {PIPELINE_META[c.pipeline_stage].label}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {(c.tags ?? []).map((tag) => (
                          <span key={tag} className="status-chip">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(c)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon-sm"
                          aria-label={"Delete " + c.full_name}
                          disabled={action.pending}
                          onClick={() => {
                            if (
                              confirm(
                                "Delete " +
                                  c.full_name +
                                  " and their saved candidate data?",
                              )
                            )
                              action.execute(() => deleteCandidate(c.id));
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredCandidates.length ? (
              <p className="p-10 text-center text-sm text-muted-foreground">
                No candidates match these filters.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {view === "board" && jobs.length ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid min-w-0 gap-4 overflow-x-auto pb-2 xl:grid-cols-5">
            {PIPELINE_STAGES.map((stage) => {
              const stageCandidates = filteredCandidates.filter(
                (candidate) => candidate.pipeline_stage === stage,
              );
              const meta = PIPELINE_META[stage];
              return (
                <Droppable droppableId={stage} key={stage}>
                  {(provided, snapshot) => (
                    <section
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-52 min-w-64 rounded-2xl border p-3 shadow-sm transition-all ${snapshot.isDraggingOver ? "border-primary bg-primary/10 ring-2 ring-primary/15" : meta.surfaceClassName}`}
                    >
                      <header className="mb-3 flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-2 rounded-full ${meta.dotClassName}`}
                          />
                          <h2 className="text-sm font-semibold">
                            {meta.label}
                          </h2>
                        </div>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${meta.countClassName}`}
                        >
                          {stageCandidates.length}
                        </span>
                      </header>
                      <div className="space-y-2">
                        {stageCandidates.map((candidate, index) => (
                          <Draggable
                            draggableId={candidate.id}
                            index={index}
                            key={candidate.id}
                          >
                            {(dragProvided, dragSnapshot) => (
                              <article
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                className={`rounded-xl border border-white/80 bg-card/95 p-3 shadow-sm transition-shadow hover:shadow-md ${dragSnapshot.isDragging ? "shadow-lg ring-1 ring-primary/40" : ""}`}
                              >
                                <div className="flex items-start gap-2">
                                  <button
                                    type="button"
                                    aria-label={`Drag ${candidate.full_name}`}
                                    className="mt-0.5 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
                                    {...dragProvided.dragHandleProps}
                                  >
                                    <GripVertical className="size-4" />
                                  </button>
                                  <button
                                    type="button"
                                    className="min-w-0 flex-1 text-left"
                                    onClick={() => openEdit(candidate)}
                                  >
                                    <p className="truncate text-sm font-medium hover:text-primary">
                                      {candidate.full_name}
                                    </p>
                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                      {candidate.current_title ??
                                        candidate.job.title}
                                    </p>
                                  </button>
                                </div>
                                <div className="mt-3 space-y-1.5 border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
                                  <p className="flex items-center gap-1.5 truncate">
                                    <Mail className="size-3" />
                                    {candidate.email}
                                  </p>
                                  <p className="flex items-center gap-1.5 truncate">
                                    <BriefcaseBusiness className="size-3" />
                                    {candidate.job.title}
                                  </p>
                                </div>
                                <label
                                  className="sr-only"
                                  htmlFor={`candidate-stage-${candidate.id}`}
                                >
                                  Change stage for {candidate.full_name}
                                </label>
                                <select
                                  id={`candidate-stage-${candidate.id}`}
                                  value={candidate.pipeline_stage}
                                  disabled={movingCandidateId === candidate.id}
                                  onChange={(event) => {
                                    if (isPipelineStage(event.target.value))
                                      void moveCandidate(
                                        candidate.id,
                                        event.target.value,
                                      );
                                  }}
                                  className="mt-3 h-8 w-full rounded-md border border-input bg-card px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  {PIPELINE_STAGES.map((item) => (
                                    <option key={item} value={item}>
                                      {PIPELINE_META[item].label}
                                    </option>
                                  ))}
                                </select>
                                <div className="mt-2 flex items-center justify-between">
                                  <Link
                                    href={`/candidates/${candidate.id}`}
                                    className="text-xs font-medium text-primary hover:underline"
                                  >
                                    Open profile
                                  </Link>
                                  <span
                                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${meta.badgeClassName}`}
                                  >
                                    {meta.label}
                                  </span>
                                </div>
                                {(candidate.tags ?? []).length ? (
                                  <div className="mt-3 flex flex-wrap gap-1">
                                    {candidate.tags.slice(0, 3).map((tag) => (
                                      <span
                                        key={tag}
                                        className="rounded-md bg-primary/5 px-1.5 py-1 text-[10px] text-primary"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </article>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {!stageCandidates.length && (
                          <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                            Drop candidates here
                          </p>
                        )}
                      </div>
                    </section>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      ) : view === "board" ? (
        <div className="rounded-2xl border border-dashed border-border p-14 text-center">
          <UserRound className="mx-auto mb-3 size-8 text-muted-foreground" />
          <h2 className="font-medium">Create a job first</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Candidates are always linked to a role so the board stays clear.
          </p>
        </div>
      ) : null}

      <CandidateFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        jobs={jobs.map(({ id, title, status }) => ({ id, title, status }))}
        candidate={editingCandidate}
        organizationId={organizationId}
        onSave={saveCandidate}
      />
    </section>
  );
}
