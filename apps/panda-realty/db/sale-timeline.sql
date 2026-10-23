-- Property Sale Timeline storage (workbench feature).
create table if not exists panda_realty.sale_timeline_docs (
  collection text not null,
  doc_id     text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text,
  primary key (collection, doc_id)
);
create index if not exists sale_timeline_docs_updated_idx on panda_realty.sale_timeline_docs (collection, updated_at desc);
alter table panda_realty.sale_timeline_docs enable row level security;
