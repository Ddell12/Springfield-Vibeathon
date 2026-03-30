import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppTile } from "../app-tile";

describe("AppTile", () => {
  it("renders the app title", () => {
    render(
      <AppTile
        appId="app1"
        patientId="patient1"
        title="AAC Board"
        index={0}
        hasPracticeProgram={false}
      />
    );
    expect(screen.getByText("AAC Board")).toBeInTheDocument();
  });

  it("shows practice badge when hasPracticeProgram is true", () => {
    render(
      <AppTile
        appId="app1"
        patientId="patient1"
        title="AAC Board"
        index={0}
        hasPracticeProgram={true}
      />
    );
    expect(screen.getByText("Practice today")).toBeInTheDocument();
  });

  it("does not show practice badge when hasPracticeProgram is false", () => {
    render(
      <AppTile
        appId="app1"
        patientId="patient1"
        title="AAC Board"
        index={0}
        hasPracticeProgram={false}
      />
    );
    expect(screen.queryByText("Practice today")).not.toBeInTheDocument();
  });

  it("links to the correct play URL", () => {
    render(
      <AppTile
        appId="app1"
        patientId="patient1"
        title="AAC Board"
        index={0}
        hasPracticeProgram={false}
      />
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/family/patient1/play/app1");
  });
});
