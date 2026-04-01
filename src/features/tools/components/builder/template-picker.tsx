"use client";

import { Clock } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

import { templateRegistry } from "../../lib/registry";

interface TemplatePickerProps {
  onSelect: (templateType: string) => void;
}

export function TemplatePicker({ onSelect }: TemplatePickerProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.values(templateRegistry).map((t) => (
        <Card
          key={t.meta.id}
          onClick={() => onSelect(t.meta.id)}
          className="cursor-pointer hover:border-primary transition-colors duration-200"
        >
          <CardHeader>
            <CardTitle className="text-base">{t.meta.name}</CardTitle>
            <CardDescription>{t.meta.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">{t.meta.intendedFor}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>~{t.meta.estimatedSetupMinutes} min setup</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
