/**
 * Regression tests for the ImportLocalDialog dismiss bugs.
 *
 * Before this pass, <Dialog open …> was hard-coded and dismissal only guarded
 * a detection effect — so the modal reappeared/stayed open on every parent
 * re-render caused by unrelated DataContext churn.
 */
import * as React from "react";
import { render, fireEvent, act, cleanup, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---- Mocks --------------------------------------------------------------

const sessionState: {
  current: { user: { id: string; username: string; preferences: Record<string, unknown> } } | null;
} = {
  current: {
    user: { id: "user-A", username: "yasir", preferences: {} },
  },
};
const bumpAuth: { current: (() => void) | null } = { current: null };

vi.mock("@/components/auth/auth-context", () => ({
  useAuth: () => {
    const [, force] = React.useReducer((x: number) => x + 1, 0);
    bumpAuth.current = force;
    return {
      session: sessionState.current,
      service: {
        updatePreferences: vi.fn(async () => undefined),
        signOut: vi.fn(async () => undefined),
      },
      loading: false,
      refresh: () => undefined,
    };
  },
}));

vi.mock("@/components/data/data-context", () => ({
  useData: () => ({ reload: vi.fn(async () => undefined) }),
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn() }),
}));

// Dialog stub so we don't need Radix's portal — the visibility is what we
// care about, not the visual chrome.
vi.mock("@/components/ui/dialog", () => {
  const Passthrough = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  return {
    Dialog: ({
      open,
      children,
    }: {
      open: boolean;
      onOpenChange?: (v: boolean) => void;
      children: React.ReactNode;
    }) => (open ? <div data-testid="migration-dialog">{children}</div> : null),
    DialogContent: Passthrough,
    DialogHeader: Passthrough,
    DialogFooter: Passthrough,
    DialogTitle: Passthrough,
    DialogDescription: Passthrough,
  };
});

// Motion stub in case anything imports it
vi.mock("motion/react", () => ({
  motion: new Proxy({}, { get: () => ({ children }: { children: React.ReactNode }) => <div>{children}</div> }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

const detectMock = vi.fn();
vi.mock("@/lib/migration/phase1-local", () => ({
  detectPhase1Data: (u: string) => detectMock(u),
  invalidateDetectionCache: vi.fn(),
}));

const importActionMock = vi.fn();
vi.mock("@/lib/server/actions/migration-actions", () => ({
  importLocalDataAction: (p: unknown) => importActionMock(p),
}));

import { MigrationProvider } from "./migration-context";
import { ImportLocalDialog } from "./import-local-dialog";

function Harness() {
  return (
    <MigrationProvider>
      <ImportLocalDialog />
    </MigrationProvider>
  );
}

beforeEach(() => {
  sessionStorage.clear();
  detectMock.mockReset();
  importActionMock.mockReset();
  sessionState.current = {
    user: { id: "user-A", username: "yasir", preferences: {} },
  };
});

afterEach(() => {
  cleanup();
  bumpAuth.current = null;
});

const candidate = {
  usernameNormalized: "yasir",
  trackerCount: 1,
  entryCount: 0,
  payload: {
    usernameNormalized: "yasir",
    trackers: [
      {
        externalId: "t1",
        name: "Darood",
        arabicText: null,
        description: null,
        targetCount: 100000,
        targetDate: null,
        status: "active",
        sortOrder: 0,
        startedAt: "2026-08-18T18:59:59.999Z",
        completedAt: null,
      },
    ],
    entries: [],
  },
};

describe("ImportLocalDialog — dismissal & state machine", () => {
  it("opens when detection finds data", async () => {
    detectMock.mockResolvedValueOnce(candidate);
    const { findByTestId } = render(<Harness />);
    await findByTestId("migration-dialog");
  });

  it("Not now closes the dialog", async () => {
    detectMock.mockResolvedValueOnce(candidate);
    const { findByTestId, getByText, queryByTestId } = render(<Harness />);
    await findByTestId("migration-dialog");
    fireEvent.click(getByText("Not now"));
    await waitFor(() => expect(queryByTestId("migration-dialog")).toBeNull());
  });

  it("stays closed when the parent re-renders (data-context churn)", async () => {
    detectMock.mockResolvedValueOnce(candidate);
    const { findByTestId, getByText, queryByTestId } = render(<Harness />);
    await findByTestId("migration-dialog");
    fireEvent.click(getByText("Not now"));
    await waitFor(() => expect(queryByTestId("migration-dialog")).toBeNull());

    // Simulate the exact scenario that used to reopen it: parent auth churn.
    act(() => {
      bumpAuth.current?.();
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(queryByTestId("migration-dialog")).toBeNull();
  });

  it("persists dismissal in sessionStorage under a per-user key", async () => {
    detectMock.mockResolvedValueOnce(candidate);
    const { findByTestId, getByText } = render(<Harness />);
    await findByTestId("migration-dialog");
    fireEvent.click(getByText("Not now"));
    await waitFor(() =>
      expect(sessionStorage.getItem("tasbihtrack:migration-dismissed:user-A")).toBe("1"),
    );
  });

  it("a different account gets its own prompt (no cross-user leak)", async () => {
    // Pre-dismiss user-A.
    sessionStorage.setItem("tasbihtrack:migration-dismissed:user-A", "1");
    // Switch to user-B before mount so detection fires for them.
    sessionState.current = {
      user: { id: "user-B", username: "aisha", preferences: {} },
    };
    detectMock.mockResolvedValueOnce({ ...candidate, usernameNormalized: "aisha" });
    const { findByTestId } = render(<Harness />);
    await findByTestId("migration-dialog");
  });

  it("shows nothing when the account is already migrated", async () => {
    sessionState.current = {
      user: {
        id: "user-A",
        username: "yasir",
        preferences: { localMigrationCompletedAt: "2026-08-19T00:00:00.000Z" },
      },
    };
    const { queryByTestId } = render(<Harness />);
    await new Promise((r) => setTimeout(r, 20));
    expect(queryByTestId("migration-dialog")).toBeNull();
    expect(detectMock).not.toHaveBeenCalled();
  });

  it("successful import closes the dialog", async () => {
    detectMock.mockResolvedValueOnce(candidate);
    importActionMock.mockResolvedValueOnce({ success: true, trackers: 1, entries: 0 });
    const { findByTestId, getByText, queryByTestId } = render(<Harness />);
    await findByTestId("migration-dialog");
    await act(async () => {
      fireEvent.click(getByText("Import to my account"));
    });
    await waitFor(() => expect(queryByTestId("migration-dialog")).toBeNull());
  });

  it("failed import keeps the dialog open so user can retry", async () => {
    detectMock.mockResolvedValueOnce(candidate);
    importActionMock.mockResolvedValueOnce({
      success: false,
      code: "internal",
      message: "Nothing was changed.",
    });
    const { findByTestId, getByText, queryByTestId } = render(<Harness />);
    await findByTestId("migration-dialog");
    await act(async () => {
      fireEvent.click(getByText("Import to my account"));
    });
    expect(queryByTestId("migration-dialog")).not.toBeNull();
  });
});
