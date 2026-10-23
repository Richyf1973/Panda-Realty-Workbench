import type { AdminEntityColumn } from "@repo/admin/admin-entity-types"
import { locationColumns } from "./panda-properties-columns-location"
import { metricsColumns } from "./panda-properties-columns-metrics"
import { planningColumns } from "./panda-properties-columns-planning"
import { saleColumns } from "./panda-properties-columns-sale"
import { ownersColumns } from "./panda-properties-columns-owners"
import { vendorsColumns } from "./panda-properties-columns-vendors"
import { pipelineColumns } from "./panda-properties-columns-pipeline"
import { virtualColumns } from "./panda-properties-columns-virtual"

export const pandaPropertiesColumns = [
  ...locationColumns,
  ...metricsColumns,
  ...planningColumns,
  ...saleColumns,
  ...ownersColumns,
  ...vendorsColumns,
  ...pipelineColumns,
  ...virtualColumns,
] as const satisfies readonly AdminEntityColumn[]
