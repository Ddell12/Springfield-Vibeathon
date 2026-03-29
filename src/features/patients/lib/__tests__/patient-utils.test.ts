import { calculateAge, formatAge, getInitials, formatFullName } from "../patient-utils";

// Helper: build an ISO date string N years ago from today
function yearsAgo(years: number, extraMonths = 0): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setMonth(d.getMonth() - extraMonths);
  return d.toISOString().split("T")[0];
}

// Helper: build an ISO date string N months ago from today
function monthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().split("T")[0];
}

describe("calculateAge", () => {
  it("returns correct age for a child born exactly 5 years ago", () => {
    expect(calculateAge(yearsAgo(5))).toBe(5);
  });

  it("returns correct age for a 10-year-old", () => {
    expect(calculateAge(yearsAgo(10))).toBe(10);
  });

  it("returns 0 for a newborn (born this month)", () => {
    expect(calculateAge(monthsAgo(0))).toBe(0);
  });

  it("returns 1 for a child who just turned 1", () => {
    expect(calculateAge(yearsAgo(1))).toBe(1);
  });

  it("subtracts a year when birthday has not yet occurred this year", () => {
    // 5 years and 3 months ago — birthday was 3 months ago, so still 5
    expect(calculateAge(yearsAgo(5, 3))).toBe(5);
  });
});

describe("formatAge", () => {
  it("formats age >= 2 years as Xy", () => {
    expect(formatAge(yearsAgo(5))).toBe("5y");
    expect(formatAge(yearsAgo(8))).toBe("8y");
  });

  it("formats age < 2 years as Xmo", () => {
    const result = formatAge(monthsAgo(8));
    expect(result).toMatch(/^\d+mo$/);
    expect(result).toBe("8mo");
  });

  it("formats a newborn as 0mo", () => {
    const result = formatAge(monthsAgo(0));
    expect(result).toMatch(/^\d+mo$/);
  });

  it("formats exactly 1 year old as 1y", () => {
    const result = formatAge(yearsAgo(1));
    expect(result).toBe("1y");
  });

  it("formats a 2-year-old as 2y", () => {
    expect(formatAge(yearsAgo(2))).toBe("2y");
  });
});

describe("getInitials", () => {
  it("returns uppercase initials from first and last name", () => {
    expect(getInitials("Alice", "Brown")).toBe("AB");
  });

  it("handles lowercase names", () => {
    expect(getInitials("john", "doe")).toBe("JD");
  });

  it("handles empty last name gracefully", () => {
    expect(getInitials("Solo", "")).toBe("S");
  });

  it("handles empty first name gracefully", () => {
    expect(getInitials("", "Stark")).toBe("S");
  });
});

describe("formatFullName", () => {
  it("joins first and last name with a space", () => {
    expect(formatFullName("Alice", "Brown")).toBe("Alice Brown");
  });

  it("handles names with existing spaces", () => {
    expect(formatFullName("Mary Jane", "Watson")).toBe("Mary Jane Watson");
  });
});
