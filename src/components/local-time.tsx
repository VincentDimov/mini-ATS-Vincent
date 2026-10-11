"use client";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
// A deterministic UTC server snapshot avoids locale/timezone hydration errors.
// After hydration the real browser timezone is used, without setting state in an effect.
export function useBrowserTimezone() {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return mounted ? undefined : "UTC";
}
export function LocalTime({
  value,
  options,
  className,
}: {
  value: string;
  options?: Intl.DateTimeFormatOptions;
  className?: string;
}) {
  const timeZone = useBrowserTimezone();
  return (
    <time dateTime={value} className={className}>
      {new Intl.DateTimeFormat("en-GB", {
        dateStyle: options ? undefined : "medium",
        ...options,
        timeZone,
      }).format(new Date(value))}
    </time>
  );
}
