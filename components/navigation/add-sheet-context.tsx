"use client";
import * as React from "react";

export interface AddSheetContextValue {
  openAdd: (trackerId?: string) => void;
  openCreate: () => void;
}

export const AddSheetContext = React.createContext<AddSheetContextValue | null>(null);

export function useAddSheet(): AddSheetContextValue {
  const ctx = React.useContext(AddSheetContext);
  if (!ctx) throw new Error("useAddSheet must be used inside the app layout");
  return ctx;
}
