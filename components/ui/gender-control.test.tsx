import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { GenderControl } from "./gender-control";

/**
 * Behavioural + structural invariants for the shared gender radiogroup.
 *
 * Assertions stay attribute-based so they work under happy-dom, which
 * doesn't always reflect boolean form properties (like
 * HTMLButtonElement#disabled) even when React set the corresponding
 * attribute.
 */
describe("GenderControl — Phase 7.2 P0.7 shared gender primitive", () => {
  function radios(container: HTMLElement): HTMLButtonElement[] {
    return Array.from(
      container.querySelectorAll<HTMLButtonElement>('button[role="radio"]'),
    );
  }

  it("renders the three canonical options as radios in order", () => {
    const { container } = render(<GenderControl value="" onChange={() => {}} />);
    const rs = radios(container);
    expect(rs).toHaveLength(3);
    expect(rs[0].textContent).toContain("Male");
    expect(rs[1].textContent).toContain("Female");
    expect(rs[2].textContent).toContain("Prefer not to say");
  });

  it("marks the current value as checked and flags it via data-active", () => {
    const { container } = render(
      <GenderControl value="female" onChange={() => {}} />,
    );
    const [male, female] = radios(container);
    expect(female.getAttribute("aria-checked")).toBe("true");
    expect(female.getAttribute("data-active")).toBe("true");
    expect(male.getAttribute("aria-checked")).toBe("false");
  });

  it("emits onChange with the canonical Gender value on click", () => {
    const onChange = vi.fn();
    const { container } = render(<GenderControl value="" onChange={onChange} />);
    const [male] = radios(container);
    fireEvent.click(male);
    expect(onChange).toHaveBeenCalledWith("male");
  });

  it("respects the disabled flag", () => {
    const { container } = render(
      <GenderControl value="male" onChange={() => {}} disabled />,
    );
    for (const r of radios(container)) {
      // React renders `disabled` as a boolean attribute — assert the
      // attribute directly rather than the DOM property because
      // happy-dom doesn't consistently reflect it.
      expect(r.hasAttribute("disabled")).toBe(true);
    }
  });

  it("uses the shared .clay-segmented tray class so both surfaces look identical", () => {
    const { container } = render(<GenderControl value="male" onChange={() => {}} />);
    const rg = container.querySelector('[role="radiogroup"]');
    expect(rg?.className).toContain("clay-segmented");
  });
});
