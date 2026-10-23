import Link from "next/link"
import { LayoutGrid, LayoutList } from "lucide-react"

import { Button } from "@repo/ui/button"
import { ButtonGroup } from "@repo/ui/button-group"

export function ViewToggle({
  activeView,
  pipeline,
}: {
  activeView: "list" | "board"
  pipeline: "sellers" | "buyers"
}) {
  return (
    <ButtonGroup segmentStyle="panel">
      <Button
        asChild
        variant={activeView === "list" ? "default" : "ghost"}
        size="sm"
        aria-label="List view"
        aria-pressed={activeView === "list"}
      >
        <Link href={`/admin/properties?view=list&pipeline=${pipeline}`}>
          <LayoutList className="size-4" aria-hidden />
          List
        </Link>
      </Button>
      <Button
        asChild
        variant={activeView === "board" ? "default" : "ghost"}
        size="sm"
        aria-label="Board view"
        aria-pressed={activeView === "board"}
      >
        <Link href={`/admin/properties?pipeline=${pipeline}`}>
          <LayoutGrid className="size-4" aria-hidden />
          Board
        </Link>
      </Button>
    </ButtonGroup>
  )
}
