import { describe, expect, it } from "vitest"

import {
  relationOptionFetchScopeForCrudInline,
} from "./admin-entity-relation-filter-options-query"
import type { AdminEntityDefinition } from "./admin-entity-types"

describe("relationOptionFetchScopeForCrudInline", () => {
  const adminEntities = {
    payrolls: {
      slug: "payrolls",
      crudRelationOptionFiltersFromParentDetail: [
        {
          relatedEntitySlug: "payrolls",
          selections: [
            {
              relatedListFilterColumnKey: "payrollPeriodId",
              parentDetailJsonKey: "payrollPeriodId",
            },
          ],
        },
      ],
    },
  } as unknown as Readonly<Record<string, AdminEntityDefinition>>

  it("returns unscoped when parent has no config", () => {
    expect(
      relationOptionFetchScopeForCrudInline(
        "guards",
        "payrolls",
        { payrollPeriodId: 1 },
        adminEntities,
      ),
    ).toEqual({ mode: "unscoped" })
  })

  it("returns wait without parent detail", () => {
    expect(
      relationOptionFetchScopeForCrudInline(
        "payrolls",
        "payrolls",
        undefined,
        adminEntities,
      ),
    ).toEqual({ mode: "wait" })
  })

  it("returns scoped selections when detail has keys", () => {
    expect(
      relationOptionFetchScopeForCrudInline(
        "payrolls",
        "payrolls",
        { payrollPeriodId: 7 },
        adminEntities,
      ),
    ).toEqual({
      mode: "scoped",
      relationFilterSelections: { payrollPeriodId: "7" },
    })
  })

  it("falls back to parent CRUD form when detail is missing keys", () => {
    const form = {
      getFieldValue: (name: string) =>
        name === "payrollPeriodId" ? "42" : "",
      Subscribe: () => null,
      setFieldValue: () => {},
    }
    expect(
      relationOptionFetchScopeForCrudInline(
        "payrolls",
        "payrolls",
        undefined,
        adminEntities,
        form,
      ),
    ).toEqual({
      mode: "scoped",
      relationFilterSelections: { payrollPeriodId: "42" },
    })
  })

  it("fixedRelationFilterValue scopes without reading parent fields (boolean list filters)", () => {
    const entities = {
      unitsoleInventoryCountDates: {
        slug: "unitsole-inventory-count-dates",
        crudRelationOptionFiltersFromParentDetail: [
          {
            relatedEntitySlug: "inventories",
            selections: [
              {
                relatedListFilterColumnKey: "inventoriableAsUnitsole",
                fixedRelationFilterValue: "true",
              },
            ],
          },
        ],
      },
    } as unknown as Readonly<Record<string, AdminEntityDefinition>>
    expect(
      relationOptionFetchScopeForCrudInline(
        "unitsoleInventoryCountDates",
        "inventories",
        { countDate: "2026-03-31" },
        entities,
      ),
    ).toEqual({
      mode: "scoped",
      relationFilterSelections: { inventoriableAsUnitsole: "true" },
    })
  })

  it("optionalWhenEmpty + whenEmptyRelationFilterValue fills sentinel when parent field blank", () => {
    const entities = {
      payments: {
        slug: "payments",
        crudRelationOptionFiltersFromParentDetail: [
          {
            relatedEntitySlug: "sales",
            selections: [
              {
                relatedListFilterColumnKey: "customerCode",
                parentDetailJsonKey: "customerCode",
              },
              {
                relatedListFilterColumnKey: "paymentCollectionCrScope",
                parentDetailJsonKey: "crNumber",
                optionalWhenEmpty: true,
                whenEmptyRelationFilterValue: "__sentinel__",
              },
            ],
          },
        ],
      },
    } as unknown as Readonly<Record<string, AdminEntityDefinition>>
    const form = {
      getFieldValue: (name: string) =>
        name === "customerCode" ? "CUST1" : "",
      Subscribe: () => null,
      setFieldValue: () => {},
    }
    expect(
      relationOptionFetchScopeForCrudInline(
        "payments",
        "sales",
        undefined,
        entities,
        form,
      ),
    ).toEqual({
      mode: "scoped",
      relationFilterSelections: {
        customerCode: "CUST1",
        paymentCollectionCrScope: "__sentinel__",
      },
    })
  })
})
