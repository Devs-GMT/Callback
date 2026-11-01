"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Labelled form controls.
 *
 * Every control gets a real `<label for>` rather than a placeholder standing
 * in for one, and errors are wired through `aria-describedby` with
 * `aria-invalid`, so a screen reader hears the problem rather than just the
 * field name. The character counters matter here too: PRD section 2 caps the
 * CV at 15,000 characters and the job at 10,000, and a user who pastes a long
 * CV deserves to see the limit before they hit it.
 */

const CONTROL =
  "w-full rounded-[4px] border bg-white px-3 text-[13.5px] text-ink " +
  "placeholder:text-muted/70 transition-colors " +
  "focus:border-espresso/50 focus:outline-none " +
  "disabled:bg-sand disabled:text-muted";

function describedBy(ids: Array<string | undefined>): string | undefined {
  const present = ids.filter(Boolean);
  return present.length > 0 ? present.join(" ") : undefined;
}

type FieldShellProps = {
  label: string;
  /** Hides the label visually while keeping it for assistive technology. */
  hideLabel?: boolean;
  hint?: ReactNode;
  error?: string;
  /** Shown at the end of the label row, e.g. a character counter. */
  trailing?: ReactNode;
  className?: string;
  children: (ids: {
    id: string;
    describedBy: string | undefined;
    invalid: boolean;
  }) => ReactNode;
};

function FieldShell({
  label,
  hideLabel,
  hint,
  error,
  trailing,
  className,
  children,
}: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className={cn(
            "text-[12.5px] font-medium text-ink",
            hideLabel && "sr-only",
          )}
        >
          {label}
        </label>
        {trailing ? (
          <span className="shrink-0 text-[11.5px] tabular-nums text-muted">
            {trailing}
          </span>
        ) : null}
      </div>

      {children({
        id,
        describedBy: describedBy([hintId, errorId]),
        invalid: Boolean(error),
      })}

      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 text-[11.5px] leading-relaxed text-coral-ink"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export type TextFieldProps = Omit<FieldShellProps, "children"> &
  Omit<ComponentPropsWithoutRef<"input">, "id" | "className">;

export function TextField({
  label,
  hideLabel,
  hint,
  error,
  trailing,
  className,
  ...props
}: TextFieldProps) {
  return (
    <FieldShell
      label={label}
      hideLabel={hideLabel}
      hint={hint}
      error={error}
      trailing={trailing}
      className={className}
    >
      {({ id, describedBy: described, invalid }) => (
        <input
          id={id}
          aria-describedby={described}
          aria-invalid={invalid || undefined}
          className={cn(
            CONTROL,
            "h-11",
            invalid ? "border-coral-ink/50" : "border-line",
          )}
          {...props}
        />
      )}
    </FieldShell>
  );
}

export type TextAreaFieldProps = Omit<FieldShellProps, "children"> & {
  /** Shows a live `used / limit` counter above the control. */
  limit?: number;
  value: string;
} & Omit<ComponentPropsWithoutRef<"textarea">, "id" | "className" | "value">;

export function TextAreaField({
  label,
  hideLabel,
  hint,
  error,
  trailing,
  className,
  limit,
  value,
  rows = 10,
  ...props
}: TextAreaFieldProps) {
  const over = limit !== undefined && value.length > limit;

  const counter =
    limit !== undefined ? (
      <span className={over ? "text-coral-ink" : undefined}>
        {value.length.toLocaleString("en")} / {limit.toLocaleString("en")}
      </span>
    ) : (
      trailing
    );

  return (
    <FieldShell
      label={label}
      hideLabel={hideLabel}
      hint={hint}
      error={error}
      trailing={counter}
      className={className}
    >
      {({ id, describedBy: described, invalid }) => (
        <textarea
          id={id}
          rows={rows}
          value={value}
          aria-describedby={described}
          aria-invalid={invalid || over || undefined}
          className={cn(
            CONTROL,
            "resize-y py-2.5 leading-relaxed",
            invalid || over ? "border-coral-ink/50" : "border-line",
          )}
          {...props}
        />
      )}
    </FieldShell>
  );
}

export type SelectFieldProps = Omit<FieldShellProps, "children"> & {
  options: Array<{ value: string; label: string }>;
} & Omit<ComponentPropsWithoutRef<"select">, "id" | "className" | "children">;

export function SelectField({
  label,
  hideLabel,
  hint,
  error,
  trailing,
  className,
  options,
  ...props
}: SelectFieldProps) {
  return (
    <FieldShell
      label={label}
      hideLabel={hideLabel}
      hint={hint}
      error={error}
      trailing={trailing}
      className={className}
    >
      {({ id, describedBy: described, invalid }) => (
        <select
          id={id}
          aria-describedby={described}
          aria-invalid={invalid || undefined}
          className={cn(
            CONTROL,
            "h-11 appearance-none bg-[length:14px] bg-[right_0.75rem_center] bg-no-repeat pr-9",
            invalid ? "border-coral-ink/50" : "border-line",
          )}
          style={{
            // Inline because the token is a data URI, which Tailwind cannot
            // express as a utility without an arbitrary value this long.
            backgroundImage:
              "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23746B68' stroke-width='1.5'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")",
          }}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}
