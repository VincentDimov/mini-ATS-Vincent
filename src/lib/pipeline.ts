import type { PipelineStage } from '@/lib/types'

export const PIPELINE_STAGES = [
  'new',
  'screening',
  'interview',
  'offered',
  'rejected',
] as const satisfies readonly PipelineStage[]

export const PIPELINE_META: Record<
  PipelineStage,
  { label: string; dotClassName: string; badgeClassName: string }
> = {
  new: {
    label: 'New',
    dotClassName: 'bg-sky-500',
    badgeClassName: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  },
  screening: {
    label: 'Screening',
    dotClassName: 'bg-amber-500',
    badgeClassName: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  interview: {
    label: 'Interview',
    dotClassName: 'bg-violet-500',
    badgeClassName: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  },
  offered: {
    label: 'Offered',
    dotClassName: 'bg-emerald-500',
    badgeClassName: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  rejected: {
    label: 'Rejected',
    dotClassName: 'bg-rose-500',
    badgeClassName: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  },
}

export function isPipelineStage(value: string): value is PipelineStage {
  return PIPELINE_STAGES.includes(value as PipelineStage)
}
