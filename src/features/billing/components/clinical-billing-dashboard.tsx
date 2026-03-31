"use client";

import { useState } from "react";
import { toast } from "sonner";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";

import type { Id } from "../../../../convex/_generated/dataModel";
import {
  useBillingMutations,
  useBillingRecords,
} from "../hooks/use-billing-records";
import { BillingRecordEditor } from "./billing-record-editor";
import { BillingRecordRow } from "./billing-record-row";
import { SuperbillViewer } from "./superbill-viewer";

type Tab = "unbilled" | "ready" | "billed";

export function ClinicalBillingDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("unbilled");
  const [editingId, setEditingId] = useState<Id<"billingRecords"> | null>(null);
  const [superbillId, setSuperbillId] = useState<Id<"billingRecords"> | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<Id<"billingRecords">>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  const toggleSelected = (id: Id<"billingRecords">) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const draftRecords = useBillingRecords("draft");
  const finalizedRecords = useBillingRecords("finalized");
  const billedRecords = useBillingRecords("billed");
  const { markBilled } = useBillingMutations();

  const totalUnbilledAmount = (draftRecords ?? []).reduce(
    (sum, r) => sum + (r.fee ?? 0),
    0,
  );
  const unbilledCount = (draftRecords ?? []).length + (finalizedRecords ?? []).length;
  const billedThisMonth = (billedRecords ?? []).filter((r) => {
    if (!r.billedAt) return false;
    const now = new Date();
    const billedDate = new Date(r.billedAt);
    return (
      billedDate.getMonth() === now.getMonth() &&
      billedDate.getFullYear() === now.getFullYear()
    );
  });
  const billedThisMonthTotal = billedThisMonth.reduce(
    (sum, r) => sum + (r.fee ?? 0),
    0,
  );

  async function handleMarkBilled(recordId: Id<"billingRecords">) {
    try {
      await markBilled({ recordId });
      toast.success("Record marked as billed");
    } catch {
      toast.error("Failed to mark record as billed");
    }
  }

  function renderTableHeaders(showCheckbox = false) {
    return (
      <tr className="border-b border-surface-container-high">
        {showCheckbox && <th className="px-4 py-2 w-10" />}
        <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Patient</th>
        <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Date</th>
        <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">CPT</th>
        <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Modifiers</th>
        <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Fee</th>
        <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Status</th>
        <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Actions</th>
      </tr>
    );
  }

  function renderEmpty(message: string) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
        <MaterialIcon icon="receipt_long" size="lg" className="mb-2 opacity-40" />
        <p className="text-sm">{message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-on-surface">Clinical Billing</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Manage billing records and generate superbills
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <MaterialIcon icon="add" size="sm" />
          New Record
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-surface-container p-4">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Unbilled Amount</p>
          <p className="text-2xl font-semibold text-on-surface mt-1">
            ${(totalUnbilledAmount / 100).toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl bg-surface-container p-4">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Unbilled Sessions</p>
          <p className="text-2xl font-semibold text-on-surface mt-1">{unbilledCount}</p>
        </div>
        <div className="rounded-2xl bg-surface-container p-4">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Billed This Month</p>
          <p className="text-2xl font-semibold text-on-surface mt-1">
            ${(billedThisMonthTotal / 100).toFixed(2)}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as Tab); setSelectedIds(new Set()); }}>
        <TabsList>
          <TabsTrigger value="unbilled">
            Unbilled
            {(draftRecords?.length ?? 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-xs text-amber-800">
                {draftRecords!.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ready">
            Ready to Bill
            {(finalizedRecords?.length ?? 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 text-xs text-blue-800">
                {finalizedRecords!.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="billed">Billed</TabsTrigger>
        </TabsList>

        <TabsContent value="unbilled">
          {!draftRecords || draftRecords.length === 0 ? (
            renderEmpty("No unbilled records. Records are created automatically when you sign session notes.")
          ) : (
            <div className="overflow-x-auto rounded-xl border border-surface-container-high">
              <table className="w-full">
                <thead>{renderTableHeaders()}</thead>
                <tbody>
                  {draftRecords.map((record) => (
                    <BillingRecordRow
                      key={record._id}
                      record={record}
                      onEdit={setEditingId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ready">
          {!finalizedRecords || finalizedRecords.length === 0 ? (
            renderEmpty("No finalized records. Edit and finalize draft records to prepare them for billing.")
          ) : (
            <div className="relative flex flex-col gap-3">
              <div className="overflow-x-auto rounded-xl border border-surface-container-high">
                <table className="w-full">
                  <thead>{renderTableHeaders(true)}</thead>
                  <tbody>
                    {finalizedRecords.map((record) => (
                      <BillingRecordRow
                        key={record._id}
                        record={record}
                        onEdit={setEditingId}
                        onGenerateSuperbill={setSuperbillId}
                        onMarkBilled={handleMarkBilled}
                        onToggle={toggleSelected}
                        isSelected={selectedIds.has(record._id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              {selectedIds.size > 0 && (
                <div className="sticky bottom-0 flex items-center justify-between rounded-xl border border-outline-variant/20 bg-background p-3 shadow-lg">
                  <p className="text-sm text-on-surface-variant">
                    {selectedIds.size} record{selectedIds.size !== 1 ? "s" : ""} selected
                  </p>
                  <Button
                    type="button"
                    disabled={batchLoading}
                    onClick={async () => {
                      setBatchLoading(true);
                      try {
                        const results = await Promise.allSettled(
                          [...selectedIds].map((id) =>
                            handleMarkBilled(id).then(() => id)
                          )
                        );
                        const succeededIds = results
                          .filter((r): r is PromiseFulfilledResult<Id<"billingRecords">> => r.status === "fulfilled")
                          .map((r) => r.value);
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          succeededIds.forEach((id) => next.delete(id));
                          return next;
                        });
                      } finally {
                        setBatchLoading(false);
                      }
                    }}
                    className="bg-gradient-to-br from-primary to-primary-container text-white hover:opacity-90"
                  >
                    {batchLoading ? "Billing…" : `Mark ${selectedIds.size} as billed`}
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="billed">
          {!billedRecords || billedRecords.length === 0 ? (
            renderEmpty("No billed records yet.")
          ) : (
            <div className="overflow-x-auto rounded-xl border border-surface-container-high">
              <table className="w-full">
                <thead>{renderTableHeaders()}</thead>
                <tbody>
                  {billedRecords.map((record) => (
                    <BillingRecordRow
                      key={record._id}
                      record={record}
                      onEdit={setEditingId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {editingId && (
        <BillingRecordEditor
          recordId={editingId}
          open={!!editingId}
          onOpenChange={(open: boolean) => {
            if (!open) setEditingId(null);
          }}
        />
      )}

      <BillingRecordEditor
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {superbillId && (
        <SuperbillViewer
          recordId={superbillId}
          open={!!superbillId}
          onOpenChange={(open: boolean) => {
            if (!open) setSuperbillId(null);
          }}
        />
      )}
    </div>
  );
}
