"use client"

import { useStore, type Store } from "@tanstack/react-store"
import { Home, Map } from "lucide-react"

import { adminEntityBooleanFormChecked } from "@repo/admin/admin-entity-crud-boolean-form"
import { AdminEntityCrudListRelationSelectControl } from "@repo/admin/components/admin/admin-entity-crud-list-relation-select-control"
import type { AdminEntityCrudListRelationFieldOptions } from "@repo/admin/admin-entity-crud-relation-field-options-types"

import { Button } from "@repo/ui/button"
import { Label } from "@repo/ui/label"
import { Switch } from "@repo/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/tooltip"

import { useAddressConversions } from "@/lib/address-conversions-context"
import { buildRealEstateUrl, buildGoogleMapsUrl } from "@/lib/property-external-links"
import type { FormLike } from "./panda-properties-dialog-form-types"

type FormValues = {
  values?: {
    streetAddress?: string
    suburb?: string
    state?: string
    postcode?: string
    owner1email?: string | null
    owner2email?: string | null
    owner3email?: string | null
    primaryEmailOwnerNum?: number | null
  }
}

export function PandaPropertiesFormTopBar({
  form,
  statusOpts,
}: {
  form: FormLike
  statusOpts: AdminEntityCrudListRelationFieldOptions | undefined
}) {
  const conversions = useAddressConversions()

  const streetAddress = useStore(
    form.store as Store<FormValues>,
    (s) => s.values?.streetAddress ?? "",
  )
  const suburb = useStore(
    form.store as Store<FormValues>,
    (s) => s.values?.suburb ?? "",
  )
  const state = useStore(
    form.store as Store<FormValues>,
    (s) => s.values?.state ?? "",
  )
  const postcode = useStore(
    form.store as Store<FormValues>,
    (s) => s.values?.postcode ?? "",
  )

  const realEstateHref = buildRealEstateUrl(streetAddress, suburb, state, postcode, conversions)
  const googleMapsHref = buildGoogleMapsUrl(streetAddress, suburb, state, postcode)

  return (
    <div className="shrink-0 border-b px-4 py-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-3">
      <div className="flex items-center gap-1">
        <form.Field name="openInRpp">
          {(field) =>
            field.state.value ? (
              <a
                href={field.state.value}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="panda-properties-form-btn--open-in-corelogic"
              >
                <Button type="button" variant="outline" size="sm" className="h-11 sm:h-9">
                  Open in Corelogic
                </Button>
              </a>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11 sm:h-9"
                disabled
                data-testid="panda-properties-form-btn--open-in-corelogic"
              >
                Open in Corelogic
              </Button>
            )
          }
        </form.Field>

        <Tooltip>
          <TooltipTrigger asChild>
            {realEstateHref ? (
              <a
                href={realEstateHref}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="panda-properties-form-btn--realestate"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 sm:h-9 sm:w-9"
                >
                  <Home className="h-4 w-4" />
                  <span className="sr-only">View on realestate.com.au</span>
                </Button>
              </a>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 sm:h-9 sm:w-9"
                disabled
                data-testid="panda-properties-form-btn--realestate"
              >
                <Home className="h-4 w-4" />
                <span className="sr-only">View on realestate.com.au</span>
              </Button>
            )}
          </TooltipTrigger>
          <TooltipContent>View on realestate.com.au</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            {googleMapsHref ? (
              <a
                href={googleMapsHref}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="panda-properties-form-btn--google-maps"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 sm:h-9 sm:w-9"
                >
                  <Map className="h-4 w-4" />
                  <span className="sr-only">Open in Google Maps</span>
                </Button>
              </a>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 sm:h-9 sm:w-9"
                disabled
                data-testid="panda-properties-form-btn--google-maps"
              >
                <Map className="h-4 w-4" />
                <span className="sr-only">Open in Google Maps</span>
              </Button>
            )}
          </TooltipTrigger>
          <TooltipContent>Open in Google Maps</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-center gap-3 sm:items-end sm:flex-none sm:justify-self-end">
        <form.Field name="isFavorite">
          {(field) => (
            <div
              className="grid gap-1.5"
              data-testid="panda-properties-form-field--isFavorite"
            >
              <span className="hidden sm:block invisible select-none text-sm leading-none">&nbsp;</span>
              <div className="flex h-11 sm:h-8 items-center gap-2">
                <Switch
                  id="pp-isFavorite"
                  checked={adminEntityBooleanFormChecked(field.state.value)}
                  onCheckedChange={(checked) =>
                    field.handleChange(checked ? "true" : "false")
                  }
                  onBlur={field.handleBlur}
                  data-testid="panda-properties-form-switch--isFavorite"
                />
                <Label htmlFor="pp-isFavorite">Favorite</Label>
              </div>
            </div>
          )}
        </form.Field>

        <form.Field name="propertyStatusId">
          {(field) => (
            <div
              className="grid min-w-0 flex-1 gap-1.5 sm:min-w-48 sm:max-w-xs sm:flex-none"
              data-testid="panda-properties-form-field--propertyStatusId"
            >
              <Label htmlFor="pp-propertyStatusId">Property Status</Label>
              <AdminEntityCrudListRelationSelectControl
                htmlForId="pp-propertyStatusId"
                data-testid="panda-properties-form-select--propertyStatusId"
                ariaLabel="Property Status"
                required={false}
                value={field.state.value}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
                emptyChoiceLabel="None"
                baseOptions={statusOpts?.options ?? []}
                optionsPending={statusOpts?.optionsPending ?? false}
              />
            </div>
          )}
        </form.Field>
      </div>
    </div>
  )
}
