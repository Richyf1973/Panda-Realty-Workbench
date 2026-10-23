/** JSON row from `GET /api/admin/property-list-files?propertyListId=` */
export type PropertyDialogAggregateFileRow = {
  kind: "property" | "entity"
  /** `property_list_file_id` or `property_entity_file_id` depending on `kind`. */
  id: number
  propertyListFileId?: number
  propertyEntityFileId?: number
  propertyEntityId?: number
  fileName: string | null
  fileType: string | null
  fileSize: number | null
  fileLink: string | null
  googleDriveFileId: string | null
  /** `"google_drive"` when imported via Drive sync; `null` for manually uploaded files. */
  source: string | null
  createdAt: string | null
  sourceLabel: string
  sharedWithPortal: boolean
  sharedWithSeller: boolean
}
