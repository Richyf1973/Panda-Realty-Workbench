"use client"

import * as React from "react"

/**
 * When the table is narrow, the right-hand row-action strip collapses to a single overflow
 * menu so the scrollable data columns keep room. The decision is made once at the table level
 * (a ResizeObserver on the horizontal scroll container) and shared to every row-action cell via
 * this context, so all rows collapse together and nothing re-measures per row.
 */

/**
 * Estimated width (px) of the fully expanded inline action strip (icons + gaps). Measured at ~353px
 * for the panda properties row (11 icon-sm buttons); 340 rounds slightly under so we collapse only
 * once the strip genuinely crowds the data.
 */
export const ROW_ACTIONS_EXPANDED_ESTIMATE_PX = 340
/**
 * Minimum scrollable width (px) to leave for data columns before collapsing — roughly one frozen
 * Street column (~220px). Below this the expanded strip leaves under a column of data visible, which
 * is the squeeze this feature fixes.
 */
export const ROW_ACTIONS_MIN_DATA_WIDTH_PX = 220

const AdminRowActionsCollapseContext = React.createContext<boolean>(false)

export function AdminRowActionsCollapseProvider({
  collapsed,
  children,
}: {
  collapsed: boolean
  children: React.ReactNode
}) {
  return (
    <AdminRowActionsCollapseContext.Provider value={collapsed}>
      {children}
    </AdminRowActionsCollapseContext.Provider>
  )
}

/** True when the row-action strip should collapse to a single overflow menu. Defaults to false. */
export function useAdminRowActionsCollapsed(): boolean {
  return React.useContext(AdminRowActionsCollapseContext)
}

/**
 * Observes a table scroll container and returns whether the row actions should collapse:
 * collapse once the leftover scrollable width (container − frozen-left − expanded strip estimate)
 * drops below {@link ROW_ACTIONS_MIN_DATA_WIDTH_PX}. Driven by the table's own width, so it reacts
 * to the side-filter panel / app sidebar opening, not just the window.
 */
export function useRowActionsCollapse(
  scrollEl: HTMLElement | null,
  frozenLeftWidth: number,
): boolean {
  const [collapsed, setCollapsed] = React.useState(false)

  // useLayoutEffect so the first measure runs before paint (no flash of the full strip on a narrow
  // table). Safe: the table only mounts client-side after data loads (behind the list `!isLoading`
  // guard), so this never runs during SSR.
  React.useLayoutEffect(() => {
    if (!scrollEl) return
    const measure = () => {
      const leftoverData =
        scrollEl.clientWidth - frozenLeftWidth - ROW_ACTIONS_EXPANDED_ESTIMATE_PX
      setCollapsed(leftoverData < ROW_ACTIONS_MIN_DATA_WIDTH_PX)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(scrollEl)
    return () => observer.disconnect()
  }, [scrollEl, frozenLeftWidth])

  return collapsed
}
