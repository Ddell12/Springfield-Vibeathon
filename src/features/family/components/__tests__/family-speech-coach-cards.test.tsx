import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { FamilySpeechCoachCards } from "../family-speech-coach-cards";

const PATIENT_ID = "p1" as any;

describe("FamilySpeechCoachCards", () => {
  it("renders only speech-coach programs", () => {
    render(
      <FamilySpeechCoachCards
        patientId={PATIENT_ID}
        programs={[
          {
            _id: "hp1" as any,
            title: "R practice",
            type: "speech-coach",
            speechCoachConfig: { targetSounds: ["r"] },
          } as any,
          {
            _id: "hp2" as any,
            title: "Paper handout",
            type: "standard",
          } as any,
        ]}
      />
    );
    expect(screen.getByText("R practice")).toBeInTheDocument();
    expect(screen.queryByText("Paper handout")).not.toBeInTheDocument();
  });

  it("renders nothing when there are no speech-coach programs", () => {
    const { container } = render(
      <FamilySpeechCoachCards patientId={PATIENT_ID} programs={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when all programs are non-speech-coach type", () => {
    const { container } = render(
      <FamilySpeechCoachCards
        patientId={PATIENT_ID}
        programs={[
          { _id: "hp1" as any, title: "Handout", type: "standard" } as any,
        ]}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
