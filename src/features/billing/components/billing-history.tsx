"use client";

import { useAction } from "convex/react";
import { FileText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

import { api } from "../../../../convex/_generated/api";

interface Invoice {
  id: string;
  date: number;
  amount: number;
  status: string;
  pdfUrl: string | null;
}

export function BillingHistory() {
  const getInvoices = useAction(api.billingActions.getInvoices);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    try {
      const result = await getInvoices();
      setInvoices(result);
    } catch {
      // Silently fail — invoices are not critical
    } finally {
      setLoading(false);
    }
  }, [getInvoices]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-base">Billing History</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-8 rounded bg-muted" />
            <div className="h-8 rounded bg-muted" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <FileText className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No billing history yet
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-left font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="py-2 text-left font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="py-2 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="py-2 text-right font-medium text-muted-foreground">
                    Invoice
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border last:border-0">
                    <td className="py-2">
                      {new Date(invoice.date).toLocaleDateString()}
                    </td>
                    <td className="py-2">
                      ${(invoice.amount / 100).toFixed(2)}
                    </td>
                    <td className="py-2 capitalize">{invoice.status}</td>
                    <td className="py-2 text-right">
                      {invoice.pdfUrl ? (
                        <a
                          href={invoice.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          PDF
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
