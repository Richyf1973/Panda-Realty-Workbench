"use client"

interface OfferFormSubmitFooterProps {
  submitError: string | null
  draftStatus: string | null
  draftSavedAt: string | null
  submitting: boolean
  viewMode: boolean
  signaturesSummaryError?: string | null
}

export function OfferFormSubmitFooter({ submitError, draftStatus, draftSavedAt, submitting, viewMode, signaturesSummaryError }: OfferFormSubmitFooterProps) {
  return (
    <div data-testid="offer-form-submit-footer">
      {submitError && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600" data-testid="offer-form-error">
          {submitError}
        </p>
      )}
      {signaturesSummaryError && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600" data-testid="offer-form-signatures-error">
          {signaturesSummaryError}
        </p>
      )}

      {draftStatus != null && draftStatus !== "idle" && (
        <p className="text-center text-xs text-slate-500" data-testid="offer-form-draft-status">
          {draftStatus === "saving" ? "Saving…" : `Draft saved ${draftSavedAt}`}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex-1 rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-base font-bold text-slate-800 shadow transition duration-150 ease-in-out hover:bg-slate-200"
          data-testid="offer-form-print"
        >
          Print Offer
        </button>
        {!viewMode && (
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-base font-bold text-white shadow transition duration-150 ease-in-out hover:bg-slate-800 disabled:opacity-50"
            data-testid="offer-form-submit"
          >
            {submitting ? "Submitting…" : "Submit Offer"}
          </button>
        )}
      </div>
    </div>
  )
}
