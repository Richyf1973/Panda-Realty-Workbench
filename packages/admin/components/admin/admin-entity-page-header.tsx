export type AdminEntityPageHeaderProps = {
  title: string
  /** Used to scope data-testid values (e.g. admin entity slug). */
  entitySlug: string
}

/** Page title for admin entity list screens. */
export function AdminEntityPageHeader({
  title,
  entitySlug,
}: AdminEntityPageHeaderProps) {
  return (
    <header
      className="shrink-0"
      data-testid={`admin-entity-page-header--${entitySlug}`}
    >
      <h1
        className="font-heading text-lg font-medium"
        data-testid={`admin-entity-page-title--${entitySlug}`}
      >
        {title}
      </h1>
    </header>
  )
}
