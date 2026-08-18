"use client";
import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/**
 * Wraps our Button with a shared pending state:
 *   • disables during pending (prevents duplicate submits from repeat taps),
 *   • sets aria-busy / aria-disabled,
 *   • preserves layout width via min-w rather than swapping to an icon,
 *   • shows inline spinner + optional pendingLabel while pending.
 *
 * Use this instead of Button for every mutation trigger. It is the shared
 * loading visual language for TasbihTrack.
 */
export interface PendingButtonProps extends ButtonProps {
  pending?: boolean;
  pendingLabel?: string;
}

export const PendingButton = React.forwardRef<HTMLButtonElement, PendingButtonProps>(
  function PendingButton({ pending, pendingLabel, children, disabled, className, ...rest }, ref) {
    return (
      <Button
        ref={ref}
        disabled={disabled || pending}
        aria-disabled={disabled || pending ? true : undefined}
        aria-busy={pending ? true : undefined}
        className={cn(className)}
        {...rest}
      >
        {pending ? (
          <>
            <Spinner size="sm" />
            <span>{pendingLabel ?? "Working…"}</span>
          </>
        ) : (
          children
        )}
      </Button>
    );
  },
);
