/**
 * Per-row imperative handle that lets the collapsible action descriptors (rendered by the shared
 * `AdminEntityRowActions` as inline buttons or overflow-menu items) open the dialogs that live in
 * the always-mounted pinned node. The pinned component binds these methods to its `useState`
 * setters on each render; the descriptors call them on click. Both share the same object via the
 * closure in `renderPropertyListRowActions`, so they stay in sync without a shared parent.
 */
export interface PropertyRowActionControls {
  openNote: () => void
  openMeeting: () => void
  openReminder: () => void
  openOwnerCompose: () => void
  openOwnerInbox: () => void
  openBuyerCompose: () => void
}

const noop = () => undefined

export function createPropertyRowActionControls(): PropertyRowActionControls {
  return {
    openNote: noop,
    openMeeting: noop,
    openReminder: noop,
    openOwnerCompose: noop,
    openOwnerInbox: noop,
    openBuyerCompose: noop,
  }
}
