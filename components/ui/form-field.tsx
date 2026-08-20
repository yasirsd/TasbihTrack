"use client";
import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Persistent-label form row.
 *
 * Global placeholder policy (PROMPT 5A §5): labels ALWAYS stay visible
 * above the field. Placeholder text is example-only, weaker color/weight
 * than a real value. This wrapper standardises the pattern so no form in
 * the app can accidentally use the placeholder as its label.
 *
 * Usage:
 *   <FormField label="Goal name" hint="Something short and personal.">
 *     <Input placeholder="e.g. Durood Shareef" ... />
 *   </FormField>
 *
 * `error` prints an inline error under the input.
 * `hint` prints a muted helper below the input.
 * `optional` renders "(optional)" beside the label.
 */
export interface FormFieldProps {
  id?: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  id,
  label,
  hint,
  error,
  optional,
  className,
  children,
}: FormFieldProps) {
  // Clone the single child so it inherits our id + aria-describedby without
  // requiring every caller to remember to pass them.
  const child = React.Children.only(children) as React.ReactElement<{
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }>;
  const hintId = hint ? `${id ?? child.props.id ?? "ff"}-hint` : undefined;
  const errorId = error ? `${id ?? child.props.id ?? "ff"}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const merged = React.cloneElement(child, {
    id: id ?? child.props.id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
  });

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id ?? child.props.id}>{label}</Label>
        {optional && (
          <span className="text-xs font-normal text-muted-foreground">
            optional
          </span>
        )}
      </div>
      {merged}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
