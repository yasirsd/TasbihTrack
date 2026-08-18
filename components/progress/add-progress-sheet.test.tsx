/**
 * Regression test for the Add Progress input reset bug.
 *
 * The previous reset effect had `[open, initialTrackerId, active]` as deps.
 * Because `active` was derived from `trackers` (a context value that gets a
 * new array reference every background sync), any `reload()` while the
 * sheet was open would re-run the reset and wipe the amount the user was
 * typing.
 *
 * These tests set up a fake DataContext, render the sheet, simulate a data
 * refresh mid-typing, and assert the input value is preserved.
 */
import * as React from "react";
import { render, fireEvent, act, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Stub out DataProvider so the sheet renders without pg/idb/env.
const trackersState: { current: { id: string; name: string; status: string }[] } = {
  current: [{ id: "t1", name: "Durood Shareef", status: "active" }],
};
const entriesState: {
  current: {
    id: string;
    trackerId: string;
    amount: number;
    entryDate: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
  }[];
} = { current: [] };
const setStateBumper: { current: (() => void) | null } = { current: null };

vi.mock("@/components/data/data-context", () => ({
  useData: () => {
    const [, force] = React.useReducer((x: number) => x + 1, 0);
    setStateBumper.current = force;
    return {
      trackers: trackersState.current,
      entries: entriesState.current,
      loading: false,
      sync: "idle" as const,
      pendingCount: 0,
      addEntry: vi.fn(async () => ({ id: "e1" })),
      deleteEntry: vi.fn(async () => undefined),
      createTracker: vi.fn(),
      updateTracker: vi.fn(),
      deleteTracker: vi.fn(),
      reorderTrackers: vi.fn(),
      updateEntry: vi.fn(),
      reload: vi.fn(),
    };
  },
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Radix Dialog uses portals and browser-only refs — mock the Sheet to
// render inline so we can query it.
vi.mock("@/components/ui/sheet", () => {
  const Comp = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const Sheet = ({
    open,
    children,
  }: {
    open: boolean;
    onOpenChange?: (v: boolean) => void;
    children: React.ReactNode;
  }) => (open ? <div data-testid="sheet">{children}</div> : null);
  const SheetContent = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    Sheet,
    SheetContent,
    SheetHeader: Comp,
    SheetTitle: Comp,
    SheetDescription: Comp,
    SheetClose: Comp,
    SheetTrigger: Comp,
    SheetFooter: Comp,
  };
});

// Motion is unused at runtime in this test path — stub it.
vi.mock("motion/react", () => ({
  motion: new Proxy(
    {},
    {
      get: () =>
        ({ children, ...rest }: { children?: React.ReactNode }) => <div {...rest}>{children}</div>,
    },
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

import { AddProgressSheet } from "./add-progress-sheet";

function Harness({ open }: { open: boolean }) {
  const [o, setO] = React.useState(open);
  React.useEffect(() => setO(open), [open]);
  return <AddProgressSheet open={o} onOpenChange={setO} />;
}

beforeEach(() => {
  trackersState.current = [{ id: "t1", name: "Durood Shareef", status: "active" }];
  entriesState.current = [];
});

afterEach(() => {
  cleanup();
  setStateBumper.current = null;
});

describe("AddProgressSheet — draft state survives data refreshes", () => {
  it("typed amount persists across a re-render triggered by a data sync", async () => {
    const { getByLabelText } = render(<Harness open />);
    const input = getByLabelText("Amount") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "1000" } });
    expect(input.value).toBe("1000");

    // Simulate a background sync: DataContext hands us a new trackers array
    // (fresh reference) and a new entries reference. This is the exact
    // scenario that previously wiped the input.
    act(() => {
      trackersState.current = [{ ...trackersState.current[0] }];
      entriesState.current = [...entriesState.current];
      setStateBumper.current?.();
    });

    expect(input.value).toBe("1000");
  });

  it("quick-amount chip adds to the current draft rather than replacing it", () => {
    const { getByLabelText, getByText } = render(<Harness open />);
    const input = getByLabelText("Amount") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "500" } });
    fireEvent.click(getByText("+1,000"));
    expect(input.value).toBe("1500");
  });

  it("input strips non-numeric characters", () => {
    const { getByLabelText } = render(<Harness open />);
    const input = getByLabelText("Amount") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1a2b3c" } });
    expect(input.value).toBe("123");
  });
});
