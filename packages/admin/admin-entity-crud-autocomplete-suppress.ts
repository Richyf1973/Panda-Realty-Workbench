/**
 * Chrome and other browsers may ignore `autocomplete="off"` when a field resembles identity or
 * contact data (labels such as Name, Address, Email). An arbitrary unknown token is a common
 * workaround while remaining valid HTML.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete
 */
export const ADMIN_ENTITY_CRUD_AUTOCOMPLETE_NOPE = "nope" as const
