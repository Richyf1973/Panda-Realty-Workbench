"use client"

import { cn } from "@repo/ui/utils"
import type {
  AdminEntityCrudRelatedCollectionTable,
  AdminEntityDefinition,
} from "../../admin-entity-types"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import {
  adminEntityColumnForRelatedEmbedPreview,
  formatRelatedCollectionFooterSum,
  formatRelatedCollectionFooterSumEmbed,
  formatRelatedCollectionFooterSumVirtual,
  orderRelatedInlineTableColumnSpecs,
  relatedEmbedPreviewCellAlign,
  relatedInlineColumnBoundsStyleForSpec,
  RELATED_INLINE_STICKY_ACTIONS_DIM_CLASS,
  RELATED_INLINE_STICKY_ACTIONS_MASK_MUTED,
} from "../../admin-entity-crud-related-inline-helpers"
import { DisabledCurrencyAmountFooterInput } from "./related-collection-inline-footer-input"

/** Footer sum aria-label: append " total" unless the column label already ends in "total". */
function footerSumAriaLabel(label: string): string {
  return /total\s*$/i.test(label.trim()) ? label : `${label} total`
}

type RelatedCollectionInlineTableFooterProps = {
  show: boolean
  editorTestId: string
  orderedInlineColumnSpecs: ReturnType<typeof orderRelatedInlineTableColumnSpecs>
  footerSumsByKey: Record<string, number>
  footerSumColumnKeys: readonly string[]
  childCfg: AdminEntityDefinition
  collection: AdminEntityCrudRelatedCollectionTable
  adminEntities: Parameters<typeof relatedInlineColumnBoundsStyleForSpec>[3]
  parentSlug: AdminEntitySlug
  hideRelatedRowActions: boolean
}

export function RelatedCollectionInlineTableFooter({
  show,
  editorTestId,
  orderedInlineColumnSpecs,
  footerSumsByKey,
  footerSumColumnKeys,
  childCfg,
  collection,
  adminEntities,
  parentSlug,
  hideRelatedRowActions,
}: RelatedCollectionInlineTableFooterProps) {
  if (!show) return null
  return (
    <tfoot className="sticky bottom-0 z-20">
      <tr
        className="border-t border-border/80 bg-muted/95 font-medium backdrop-blur-sm"
        data-testid={`${editorTestId}--footer-totals`}
      >
        {orderedInlineColumnSpecs.map((spec, idx) => {
          const isFirst = idx === 0
          const footerColStyle = relatedInlineColumnBoundsStyleForSpec(
            collection,
            childCfg,
            spec,
            adminEntities,
          )
          if (spec.kind === "editable") {
            const key = spec.key
            const isSumCol = footerSumColumnKeys.includes(key)
            const sumColMeta = childCfg.columns.find((c) => c.key === key)
            const sumCurrencySym =
              sumColMeta?.valueType === "numeric"
                ? sumColMeta.currencySymbol?.trim()
                : undefined
            return (
              <td
                key={`fe-${key}`}
                className="px-2 py-2 align-middle"
                style={footerColStyle}
              >
                {isSumCol ? (
                  <span
                    className="flex w-full justify-end gap-2 tabular-nums"
                    data-testid={`admin-entity-crud-related-footer-sum--${parentSlug}--${collection.jsonKey}--${key}`}
                  >
                    {isFirst ? (
                      <span className="shrink-0 font-normal text-muted-foreground">
                        Total
                      </span>
                    ) : null}
                    {sumCurrencySym ? (
                      <DisabledCurrencyAmountFooterInput
                        currencySymbol={sumCurrencySym}
                        total={footerSumsByKey[key] ?? 0}
                        allowLeadingMinus={
                          sumColMeta?.currencyAmountAllowLeadingMinus === true
                        }
                        ariaLabel={footerSumAriaLabel(sumColMeta?.label ?? key)}
                        className={isFirst ? "min-w-0 flex-1" : undefined}
                      />
                    ) : (
                      <span>
                        {formatRelatedCollectionFooterSum(
                          key,
                          footerSumsByKey[key] ?? 0,
                          childCfg,
                        )}
                      </span>
                    )}
                  </span>
                ) : isFirst ? (
                  <span className="text-muted-foreground">Total</span>
                ) : null}
              </td>
            )
          }
          if (spec.kind === "readonly") {
            const key = spec.key
            const isSumCol = footerSumColumnKeys.includes(key)
            const sumColMeta = childCfg.columns.find((c) => c.key === key)
            const sumCurrencySym =
              sumColMeta?.valueType === "numeric"
                ? sumColMeta.currencySymbol?.trim()
                : undefined
            return (
              <td
                key={`fro-${key}`}
                className="px-2 py-2 text-right align-middle"
                style={footerColStyle}
              >
                {isSumCol ? (
                  <span
                    className="inline-flex w-full justify-end gap-2 tabular-nums"
                    data-testid={`admin-entity-crud-related-footer-sum--${parentSlug}--${collection.jsonKey}--${key}`}
                  >
                    {isFirst ? (
                      <span className="shrink-0 font-normal text-muted-foreground">
                        Total
                      </span>
                    ) : null}
                    {sumCurrencySym ? (
                      <DisabledCurrencyAmountFooterInput
                        currencySymbol={sumCurrencySym}
                        total={footerSumsByKey[key] ?? 0}
                        allowLeadingMinus={
                          sumColMeta?.currencyAmountAllowLeadingMinus === true
                        }
                        ariaLabel={footerSumAriaLabel(sumColMeta?.label ?? key)}
                        className={isFirst ? "min-w-0 flex-1" : undefined}
                      />
                    ) : (
                      <span>
                        {formatRelatedCollectionFooterSum(
                          key,
                          footerSumsByKey[key] ?? 0,
                          childCfg,
                        )}
                      </span>
                    )}
                  </span>
                ) : isFirst ? (
                  <span className="text-muted-foreground">Total</span>
                ) : null}
              </td>
            )
          }
          if (spec.kind === "embed") {
            const isSumCol = footerSumColumnKeys.includes(spec.ec.key)
            const sumAlign = relatedEmbedPreviewCellAlign(adminEntities, spec.ec)
            const footerFmtCol = adminEntityColumnForRelatedEmbedPreview(
              adminEntities,
              spec.ec,
            )
            const footerCurrencySym =
              footerFmtCol?.valueType === "numeric"
                ? footerFmtCol.currencySymbol?.trim()
                : undefined
            const footerSumVal = footerSumsByKey[spec.ec.key] ?? 0
            return (
              <td
                key={`femb-${spec.ec.key}`}
                className={cn(
                  "px-2 py-2 align-middle",
                  isSumCol && sumAlign === "right" && "text-right",
                  isSumCol && sumAlign === "center" && "text-center",
                )}
                style={footerColStyle}
              >
                {isSumCol ? (
                  footerCurrencySym ? (
                    <DisabledCurrencyAmountFooterInput
                      currencySymbol={footerCurrencySym}
                      total={footerSumVal}
                      allowLeadingMinus={
                        footerFmtCol?.currencyAmountAllowLeadingMinus === true
                      }
                      ariaLabel={footerSumAriaLabel(spec.ec.label)}
                      testId={`admin-entity-crud-related-footer-sum--${parentSlug}--${collection.jsonKey}--${spec.ec.key}`}
                    />
                  ) : (
                    <span
                      className={cn(
                        "inline-flex tabular-nums",
                        sumAlign === "right" && "w-full justify-end",
                        sumAlign === "center" && "w-full justify-center",
                      )}
                      data-testid={`admin-entity-crud-related-footer-sum--${parentSlug}--${collection.jsonKey}--${spec.ec.key}`}
                    >
                      <span>
                        {formatRelatedCollectionFooterSumEmbed(
                          adminEntities,
                          spec.ec,
                          footerSumVal,
                        )}
                      </span>
                    </span>
                  )
                ) : null}
              </td>
            )
          }
          const { vc } = spec
          const isSumCol = footerSumColumnKeys.includes(vc.key)
          const virtualCurrencySym = vc.currencySymbol?.trim()
          return (
            <td
              key={`fv-${vc.key}`}
              className="px-2 py-2 text-right align-middle"
              style={footerColStyle}
            >
              {isSumCol ? (
                virtualCurrencySym ? (
                  <DisabledCurrencyAmountFooterInput
                    currencySymbol={virtualCurrencySym}
                    total={footerSumsByKey[vc.key] ?? 0}
                    ariaLabel={footerSumAriaLabel(vc.label)}
                    testId={`admin-entity-crud-related-footer-sum--${parentSlug}--${collection.jsonKey}--${vc.key}`}
                  />
                ) : (
                  <span
                    className="inline-flex justify-end gap-2 tabular-nums"
                    data-testid={`admin-entity-crud-related-footer-sum--${parentSlug}--${collection.jsonKey}--${vc.key}`}
                  >
                    <span>
                      {formatRelatedCollectionFooterSumVirtual(
                        footerSumsByKey[vc.key] ?? 0,
                        vc.currencySymbol,
                      )}
                    </span>
                  </span>
                )
              ) : null}
            </td>
          )
        })}
        {!hideRelatedRowActions ? (
          <td
            className={cn(
              "px-2 py-2 align-middle",
              "sticky right-0 z-22 overflow-hidden bg-muted",
              RELATED_INLINE_STICKY_ACTIONS_DIM_CLASS,
              RELATED_INLINE_STICKY_ACTIONS_MASK_MUTED,
            )}
            aria-hidden
          />
        ) : null}
      </tr>
    </tfoot>
  )
}
