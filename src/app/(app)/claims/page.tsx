"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { claimsApi } from "@/services/claims";
import { useAuth } from "@/context/AuthContext";
import type { Claim, ClaimStatus } from "@/types";
import { format } from "date-fns";

const STATUS_COLORS: Record<ClaimStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
};

type ReviewDialogState = {
  claimId: string;
  action: "approved" | "rejected";
  notes: string;
};

export default function ClaimsPage() {
  const { user } = useAuth();
  const isStaff = user?.role === "staff" || user?.role === "admin" || user?.role === "super_admin";
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewDialog, setReviewDialog] = useState<ReviewDialogState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchClaims = async () => {
    try {
      const res = isStaff
        ? await claimsApi.list({ status: "pending" })
        : await claimsApi.listMine();
      setClaims(res.data.data);
    } catch {
      toast.error("Failed to load claims.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadClaims = async () => {
      try {
        const res = isStaff
          ? await claimsApi.list({ status: "pending" })
          : await claimsApi.listMine();
        if (!isMounted) return;
        setClaims(res.data.data);
      } catch {
        if (!isMounted) return;
        toast.error("Failed to load claims.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    void loadClaims();

    return () => {
      isMounted = false;
    };
  }, [isStaff]);

  const handleReview = async () => {
    if (!reviewDialog) return;
    setIsSubmitting(true);
    try {
      await claimsApi.review(reviewDialog.claimId, {
        status: reviewDialog.action,
        reviewNotes: reviewDialog.notes || undefined,
      });
      toast.success(
        reviewDialog.action === "approved" ? "Claim approved." : "Claim rejected."
      );
      setReviewDialog(null);
      await fetchClaims();
    } catch {
      toast.error("Failed to review claim.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Claims</h1>
        <p className="text-muted-foreground">
          {isStaff
            ? "Review pending claims from students."
            : "Track your claim submissions."}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : claims.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          {isStaff ? "No pending claims to review." : "You have no claims yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => (
            <div
              key={claim.id}
              className="rounded-xl border bg-background p-4 shadow-sm space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm">Claim #{claim.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    Lost Report: {claim.lostReportId.slice(0, 8)}
                    {claim.foundReportId ? ` · Found: ${claim.foundReportId.slice(0, 8)}` : ""}
                  </p>
                </div>
                <Badge variant="secondary" className={STATUS_COLORS[claim.status]}>
                  {claim.status}
                </Badge>
              </div>
              {claim.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {claim.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Submitted {format(new Date(claim.createdAt), "dd MMM yyyy")}
              </p>
              {claim.reviewNotes && (
                <p className="text-xs italic text-muted-foreground">
                  Review note: {claim.reviewNotes}
                </p>
              )}
              {isStaff && claim.status === "pending" && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() =>
                      setReviewDialog({ claimId: claim.id, action: "approved", notes: "" })
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      setReviewDialog({ claimId: claim.id, action: "rejected", notes: "" })
                    }
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog?.action === "approved" ? "Approve Claim" : "Reject Claim"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Optional: add a review note for the claimant.
            </p>
            <Textarea
              rows={3}
              placeholder="Review notes…"
              value={reviewDialog?.notes ?? ""}
              onChange={(e) =>
                setReviewDialog((prev) => prev && { ...prev, notes: e.target.value })
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={reviewDialog?.action === "approved" ? "default" : "destructive"}
              onClick={handleReview}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving…"
                : reviewDialog?.action === "approved"
                ? "Confirm Approve"
                : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
