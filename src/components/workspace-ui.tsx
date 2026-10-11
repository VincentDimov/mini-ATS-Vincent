"use client";
import { useTransition, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Sparkles } from "lucide-react";
import type { ActionResult } from "@/lib/types";
export function useWorkspaceAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  function execute(
    operation: () => Promise<ActionResult<unknown>>,
    onSuccess?: () => void,
  ) {
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await operation();
        setFeedback({
          ok: result.ok,
          message: result.ok ? (result.message ?? "Saved.") : result.error,
        });
        if (result.ok) {
          onSuccess?.();
          router.refresh();
        }
      } catch (error) {
        setFeedback({
          ok: false,
          message:
            error instanceof Error
              ? error.message
              : "Could not complete this action.",
        });
      }
    });
  }
  return { pending, feedback, execute };
}
export function Feedback({
  value,
}: {
  value: { ok: boolean; message: string } | null;
}) {
  return value ? (
    <p
      role={value.ok ? "status" : "alert"}
      className={
        value.ok
          ? "rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
          : "rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
      }
    >
      {value.message}
    </p>
  ) : null;
}
export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="workspace-heading">
      <div>
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-primary">
          <Sparkles className="size-3.5" />
          {eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
export function EmptyPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/3 px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles />
      </div>
      <h2 className="font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {children}
    </div>
  );
}
export function Busy({ pending }: { pending: boolean }) {
  return pending ? (
    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
  ) : null;
}
export const fieldClass =
  "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
