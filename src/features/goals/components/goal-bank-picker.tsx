"use client";

import { useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { anyApi } from "convex/server";

import { cn } from "@/core/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { type GoalDomain } from "../lib/goal-bank-data";
import { domainColor, domainLabel } from "../lib/goal-utils";

export interface GoalBankSelection {
  domain: GoalDomain;
  shortDescription: string;
  fullGoalText: string;
  defaultTargetAccuracy: number;
  defaultConsecutiveSessions: number;
}

interface GoalBankPickerProps {
  onSelect: (goal: GoalBankSelection) => void;
}

const DOMAINS: GoalDomain[] = [
  "articulation",
  "language-receptive",
  "language-expressive",
  "fluency",
  "voice",
  "pragmatic-social",
  "aac",
  "feeding",
];

const AGE_RANGES = ["0-3", "3-5", "5-8", "8-12", "12-18", "adult"] as const;
type AgeRange = (typeof AGE_RANGES)[number];

const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  "0-3": "0–3 years",
  "3-5": "3–5 years",
  "5-8": "5–8 years",
  "8-12": "8–12 years",
  "12-18": "12–18 years",
  adult: "Adult",
};

export function GoalBankPicker({ onSelect }: GoalBankPickerProps) {
  const { isAuthenticated } = useConvexAuth();

  const [selectedDomain, setSelectedDomain] = useState<GoalDomain | "">("");
  const [selectedAgeRange, setSelectedAgeRange] = useState<AgeRange | "">("");
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<string>("");
  const [keyword, setKeyword] = useState("");

  // Build search args — only include defined filters
  const searchArgs = isAuthenticated
    ? {
        ...(selectedDomain ? { domain: selectedDomain } : {}),
        ...(selectedAgeRange ? { ageRange: selectedAgeRange } : {}),
        ...(selectedSkillLevel ? { skillLevel: selectedSkillLevel } : {}),
        ...(keyword.trim() ? { keyword: keyword.trim() } : {}),
      }
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const goals = useQuery(
    anyApi.goalBank.search as any,
    searchArgs ?? "skip"
  ) as GoalBankSelection[] | undefined;

  // Skill levels for selected domain
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const skillLevels = useQuery(
    anyApi.goalBank.listDomainSkillLevels as any,
    isAuthenticated && selectedDomain ? { domain: selectedDomain } : "skip"
  ) as string[] | undefined;

  function handleDomainChange(value: string) {
    setSelectedDomain(value as GoalDomain | "");
    setSelectedSkillLevel(""); // reset skill level when domain changes
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {/* Domain */}
        <Select value={selectedDomain} onValueChange={handleDomainChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Domains" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Domains</SelectItem>
            {DOMAINS.map((d) => (
              <SelectItem key={d} value={d}>
                {domainLabel(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Age range */}
        <Select
          value={selectedAgeRange}
          onValueChange={(v) => setSelectedAgeRange(v as AgeRange | "")}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Ages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Ages</SelectItem>
            {AGE_RANGES.map((a) => (
              <SelectItem key={a} value={a}>
                {AGE_RANGE_LABELS[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Skill level — only shown when domain selected */}
        {selectedDomain && (
          <Select
            value={selectedSkillLevel}
            onValueChange={(v) => setSelectedSkillLevel(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Skill Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Skill Levels</SelectItem>
              {(skillLevels ?? []).map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Keyword search */}
        <Input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search goals..."
          className={cn(selectedDomain ? "sm:col-span-1" : "sm:col-span-2")}
        />
      </div>

      {/* Results */}
      {goals === undefined ? (
        // Loading skeletons
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        // Empty state
        <p className="py-6 text-center text-sm text-muted-foreground">
          No goals found. Try adjusting your filters.
        </p>
      ) : (
        // Goal cards
        <div className="flex flex-col gap-2">
          {goals.map((goal, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-2 rounded-lg border border-border p-3 transition-colors duration-300 hover:border-primary/50 hover:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={cn(
                        "rounded-full text-xs font-medium",
                        domainColor(goal.domain)
                      )}
                    >
                      {domainLabel(goal.domain)}
                    </Badge>
                    {(goal as any).ageRange && (
                      <span className="text-xs text-muted-foreground">
                        {AGE_RANGE_LABELS[(goal as any).ageRange as AgeRange] ?? (goal as any).ageRange}
                      </span>
                    )}
                    {(goal as any).skillLevel && (
                      <span className="text-xs text-muted-foreground">
                        {(goal as any).skillLevel}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium">{goal.shortDescription}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() =>
                    onSelect({
                      domain: goal.domain,
                      shortDescription: goal.shortDescription,
                      fullGoalText: goal.fullGoalText,
                      defaultTargetAccuracy: goal.defaultTargetAccuracy,
                      defaultConsecutiveSessions: goal.defaultConsecutiveSessions,
                    })
                  }
                >
                  Add
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
