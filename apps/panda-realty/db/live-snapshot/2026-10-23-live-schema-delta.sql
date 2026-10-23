set search_path = panda_realty, public;
create extension if not exists citext;
create extension if not exists moddatetime;
create sequence if not exists panda_realty.updated_embeddings_id_seq;
-- functions
CREATE OR REPLACE FUNCTION panda_realty.assign_trust_transaction_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'panda_realty'
AS $function$
BEGIN
  IF NEW.transaction_number = 0 THEN
    NEW.transaction_number := CASE NEW.transaction_type
      WHEN 'receipt' THEN nextval('panda_realty.trust_receipt_number_seq')
      WHEN 'payment' THEN nextval('panda_realty.trust_payment_number_seq')
      ELSE NULL
    END;
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.audit_capture_row_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'panda_realty'
AS $function$
DECLARE
  v_operation_id uuid;
  v_operation_id_text text;
  v_actor_user_id uuid;
  v_actor_email text;
  v_source text;
  v_request_id uuid;
  v_action text;
  v_before_row jsonb;
  v_after_row jsonb;
  v_primary_key_columns text[] := string_to_array(TG_ARGV[0], ',');
  v_primary_key_column text;
  v_primary_key_value jsonb;
  v_primary_key jsonb;
  v_changed_columns jsonb;
  v_argument_index integer;
BEGIN
  v_operation_id_text := NULLIF(current_setting('panda.audit_operation_id', true), '');
  IF v_operation_id_text IS NULL THEN
    v_operation_id := gen_random_uuid();
    PERFORM set_config('panda.audit_operation_id', v_operation_id::text, true);
  ELSE
    v_operation_id := v_operation_id_text::uuid;
  END IF;

  v_actor_user_id := NULLIF(current_setting('panda.audit_actor_user_id', true), '')::uuid;
  v_actor_email := NULLIF(current_setting('panda.audit_actor_email', true), '');
  v_source := COALESCE(NULLIF(current_setting('panda.audit_source', true), ''), 'unknown');
  v_request_id := NULLIF(current_setting('panda.audit_request_id', true), '')::uuid;
  v_action := COALESCE(
    NULLIF(current_setting('panda.audit_event_action', true), ''),
    lower(TG_OP)
  );
  IF v_action NOT IN ('insert', 'update', 'delete', 'restore') THEN
    RAISE EXCEPTION 'invalid audit event action %', v_action;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_before_row := NULL;
    v_after_row := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_before_row := to_jsonb(OLD);
    v_after_row := to_jsonb(NEW);
  ELSE
    v_before_row := to_jsonb(OLD);
    v_after_row := NULL;
  END IF;

  IF array_length(TG_ARGV, 1) > 1 THEN
    FOR v_argument_index IN array_lower(TG_ARGV, 1) + 1..array_upper(TG_ARGV, 1) LOOP
      v_before_row := v_before_row - TG_ARGV[v_argument_index];
      v_after_row := v_after_row - TG_ARGV[v_argument_index];
    END LOOP;
  END IF;

  v_primary_key := '{}'::jsonb;
  FOREACH v_primary_key_column IN ARRAY v_primary_key_columns LOOP
    v_primary_key_value := COALESCE(v_after_row, v_before_row) -> v_primary_key_column;
    IF v_primary_key_value IS NULL OR v_primary_key_value = 'null'::jsonb THEN
      RAISE EXCEPTION 'audit trigger % on %.% could not find primary key column %',
        TG_NAME, TG_TABLE_SCHEMA, TG_TABLE_NAME, v_primary_key_column;
    END IF;
    v_primary_key := v_primary_key || jsonb_build_object(v_primary_key_column, v_primary_key_value);
  END LOOP;

  SELECT COALESCE(jsonb_agg(changed.key ORDER BY changed.key), '[]'::jsonb)
  INTO v_changed_columns
  FROM (
    SELECT COALESCE(before_value.key, after_value.key) AS key
    FROM jsonb_each(COALESCE(v_before_row, '{}'::jsonb)) AS before_value
    FULL OUTER JOIN jsonb_each(COALESCE(v_after_row, '{}'::jsonb)) AS after_value
      USING (key)
    WHERE before_value.value IS DISTINCT FROM after_value.value
  ) AS changed;

  INSERT INTO panda_realty.audit_operations (
    audit_operation_id,
    actor_user_id,
    actor_email,
    source,
    request_id
  ) VALUES (
    v_operation_id,
    v_actor_user_id,
    v_actor_email,
    v_source,
    v_request_id
  ) ON CONFLICT (audit_operation_id) DO NOTHING;

  INSERT INTO panda_realty.audit_events (
    audit_operation_id,
    table_name,
    primary_key,
    action,
    before_row,
    after_row,
    changed_columns,
    occurred_at
  ) VALUES (
    v_operation_id,
    TG_TABLE_NAME,
    v_primary_key,
    v_action,
    v_before_row,
    v_after_row,
    v_changed_columns,
    clock_timestamp()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.audit_document_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE before_row jsonb; after_row jsonb; item jsonb;
BEGIN
  IF TG_OP<>'INSERT' THEN before_row:=to_jsonb(OLD)-ARRAY['artifact_bytes','attachment_bytes']; END IF;
  IF TG_OP<>'DELETE' THEN after_row:=to_jsonb(NEW)-ARRAY['artifact_bytes','attachment_bytes']; END IF;
  item:=COALESCE(after_row,before_row);
  INSERT INTO panda_realty.property_timeline_changes(property_list_id,attempt_id,event_key,action,changed_by,before_state,after_state)
  VALUES((item->>'property_list_id')::bigint,(item->>'attempt_id')::uuid,item->>'event_key',TG_TABLE_NAME||':'||TG_OP,
    COALESCE(NULLIF(current_setting('panda.audit_actor_user_id',true),''),item->>'changed_by'),before_row,after_row);
  RETURN NULL;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.audit_invoice_artifact_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO panda_realty.property_timeline_changes(property_list_id,attempt_id,event_key,action,changed_by,after_state)
    VALUES(NEW.property_list_id,NEW.attempt_id,NEW.event_key,TG_TABLE_NAME||':'||TG_OP,NEW.changed_by,to_jsonb(NEW)-'pdf_bytes');
  RETURN NULL;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.audit_property_timeline_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE old_row jsonb; new_row jsonb; item jsonb;
BEGIN
  IF TG_OP<>'INSERT' THEN old_row:=to_jsonb(OLD); END IF;
  IF TG_OP<>'DELETE' THEN new_row:=to_jsonb(NEW); END IF;
  item:=COALESCE(new_row,old_row);
  IF EXISTS(SELECT 1 FROM panda_realty.panda_properties WHERE property_list_id=(item->>'property_list_id')::bigint) THEN
    INSERT INTO panda_realty.property_timeline_changes(property_list_id,attempt_id,event_key,action,changed_by,before_state,after_state)
      VALUES((item->>'property_list_id')::bigint,(item->>'attempt_id')::uuid,item->>'event_key',TG_TABLE_NAME||':'||TG_OP,
      CASE WHEN TG_OP='DELETE' THEN NULLIF(current_setting('panda.audit_actor_user_id',true),'') ELSE COALESCE(NULLIF(current_setting('panda.audit_actor_user_id',true),''),item->>'changed_by',item->>'linked_by') END,old_row,new_row);
  END IF;
  RETURN NULL;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.audit_reject_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'panda_realty'
AS $function$
BEGIN
  RAISE EXCEPTION 'panda_realty audit ledger is append-only';
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.audit_timeline_listing_preparation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE old_row jsonb;
BEGIN
  IF TG_OP='UPDATE' THEN old_row:=to_jsonb(OLD); END IF;
  INSERT INTO panda_realty.property_timeline_changes(property_list_id,event_key,action,changed_by,before_state,after_state)
    VALUES(NEW.property_list_id,'listing-preparation-review',TG_TABLE_NAME||':'||TG_OP,
      NULLIF(current_setting('panda.audit_actor_user_id',true),''),old_row,to_jsonb(NEW));
  RETURN NULL;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.capture_property_timeline_attempt()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE p_id bigint; party_id bigint; offer_id bigint; old_accepted boolean := false; new_accepted boolean := false;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_accepted := COALESCE(OLD.is_accepted,false); END IF;
  IF TG_OP <> 'DELETE' THEN new_accepted := COALESCE(NEW.is_accepted,false); END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT property_list_id,entity_id INTO p_id,party_id FROM panda_realty.property_entities WHERE property_entity_id=NEW.property_entity_id;
    offer_id := NEW.buyer_offer_id;
  ELSE
    SELECT property_list_id,entity_id INTO p_id,party_id FROM panda_realty.property_entities WHERE property_entity_id=OLD.property_entity_id;
    offer_id := OLD.buyer_offer_id;
  END IF;
  IF old_accepted AND (NOT new_accepted OR TG_OP='UPDATE' AND (NEW.property_entity_id IS DISTINCT FROM OLD.property_entity_id OR NEW.accepted_property_id IS DISTINCT FROM OLD.accepted_property_id)) THEN
    UPDATE panda_realty.property_timeline_attempts SET ended_at=now(),offer_snapshot=to_jsonb(OLD),
      property_snapshot=(SELECT jsonb_build_object('contract_date',contract_date,'disclosure_date',disclosure_date,'settlement_date',settlement_date,'property_type',property_type,'due_highlight_cleared_at',due_highlight_cleared_at) FROM panda_realty.panda_properties WHERE property_list_id=property_timeline_attempts.property_list_id),
      condition_snapshot=COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM panda_realty.condition_completions c WHERE c.buyer_offer_id=OLD.buyer_offer_id),'[]')
      WHERE buyer_offer_id=OLD.buyer_offer_id AND ended_at IS NULL;
  END IF;
  IF new_accepted AND (NOT old_accepted OR TG_OP='UPDATE' AND (NEW.property_entity_id IS DISTINCT FROM OLD.property_entity_id OR NEW.accepted_property_id IS DISTINCT FROM OLD.accepted_property_id)) AND p_id IS NOT NULL THEN
    INSERT INTO panda_realty.property_timeline_attempts(property_list_id,buyer_offer_id,buyer_entity_id) VALUES(p_id,offer_id,party_id);
    -- The previous attempt retains its snapshot. A newly accepted cycle starts fresh.
    DELETE FROM panda_realty.condition_completions WHERE buyer_offer_id=offer_id;
    UPDATE panda_realty.panda_properties SET due_highlight_cleared_at=NULL WHERE property_list_id=p_id;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.capture_timeline_listing_preparation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE old_completed boolean; new_completed boolean; new_current boolean;
BEGIN
  SELECT lower(btrim(property_status_code))='sold recently my panda' INTO old_completed
    FROM panda_realty.property_status WHERE property_status_id=OLD.property_status_id;
  SELECT lower(btrim(property_status_code))='sold recently my panda',
    NULLIF(property_status_code,'') IS NOT NULL AND pipeline='sellers'
    INTO new_completed,new_current FROM panda_realty.property_status WHERE property_status_id=NEW.property_status_id;
  new_current := COALESCE(new_current,false) AND NOT COALESCE(new_completed,false)
    AND (NOT EXISTS (SELECT 1 FROM panda_realty.property_status ds WHERE ds.property_status_id=NEW.deal_stage_status_id AND COALESCE(ds.property_status_code,'')<>'') OR EXISTS (
      SELECT 1 FROM panda_realty.buyer_offers bo JOIN panda_realty.property_entities pe USING(property_entity_id)
      WHERE pe.property_list_id=NEW.property_list_id AND bo.is_accepted=true
    ));
  IF COALESCE(old_completed,false) AND NOT COALESCE(new_completed,false) THEN
    INSERT INTO panda_realty.property_timeline_listing_state(property_list_id,pending_relist)
      VALUES(NEW.property_list_id,true)
      ON CONFLICT(property_list_id) DO UPDATE SET pending_relist=true,changed_at=now();
  END IF;
  IF new_current THEN
    UPDATE panda_realty.property_timeline_listing_state
      SET listing_id=gen_random_uuid(),pending_relist=false,changed_at=now()
      WHERE property_list_id=NEW.property_list_id AND pending_relist=true;
  END IF;
  RETURN NULL;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.check_buyer_offer_accepted_unique()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'panda_realty'
AS $function$
DECLARE v_property bigint;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.is_accepted
    AND NEW.buyer_offer_id <> OLD.buyer_offer_id THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'buyer_offers_accepted_withdraw_first',
      MESSAGE = 'Withdraw the accepted offer before replacing its identity.';
  END IF;
  IF NEW.is_accepted THEN
    SELECT property_list_id INTO v_property FROM panda_realty.property_entities
      WHERE property_entity_id = NEW.property_entity_id FOR KEY SHARE;
    IF v_property IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        CONSTRAINT = 'buyer_offers_accepted_property_required',
        MESSAGE = 'Save a property before accepting an offer.';
    END IF;
    NEW.accepted_property_id := v_property;
  ELSE
    NEW.accepted_property_id := NULL;
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.deposit_contract_source(kind text, source_id bigint, property_id bigint, buyer_id bigint)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE fingerprint text;
BEGIN
  IF source_id IS NULL THEN RETURN NULL; END IF;
  IF kind='property-file' THEN
    SELECT md5(to_jsonb(f)::text) INTO fingerprint FROM panda_realty.property_list_files f
      WHERE f.property_list_file_id=source_id AND f.property_list_id=property_id AND f.hidden_at IS NULL;
  ELSIF kind='entity-file' THEN
    SELECT md5(to_jsonb(f)::text) INTO fingerprint FROM panda_realty.property_entity_files f
      JOIN panda_realty.property_entities pe USING(property_entity_id)
      WHERE f.property_entity_file_id=source_id AND pe.property_list_id=property_id AND pe.entity_id=buyer_id AND f.hidden_at IS NULL;
  END IF;
  RETURN fingerprint;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.guard_accepted_buyer_identity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.entity_id IS DISTINCT FROM OLD.entity_id THEN
    PERFORM 1 FROM panda_realty.panda_properties WHERE property_list_id=OLD.property_list_id FOR NO KEY UPDATE;
    IF EXISTS(SELECT 1 FROM panda_realty.buyer_offers WHERE property_entity_id=OLD.property_entity_id AND is_accepted=true) THEN
      RAISE EXCEPTION 'Withdraw the accepted offer before changing its buyer identity'
        USING ERRCODE='23514', CONSTRAINT='property_entities_accepted_identity_withdraw_first';
    END IF;
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.guard_accepted_offer_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'panda_realty'
AS $function$
BEGIN
  IF OLD.is_accepted THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'buyer_offers_accepted_withdraw_first',
      MESSAGE = 'Withdraw the accepted offer before deleting it or its buyer/property link.';
  END IF;
  RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.guard_accepted_property_link_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'panda_realty'
AS $function$
DECLARE v_destination bigint;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_destination := NEW.property_list_id;
    IF NEW.property_list_id IS NOT DISTINCT FROM OLD.property_list_id
      AND NEW.property_entity_id = OLD.property_entity_id THEN RETURN NEW; END IF;
  END IF;
  -- Explicit moves lock both properties in ascending order. NO KEY UPDATE
  -- remains compatible with FK KEY SHARE held by newly inserted buyer links.
  PERFORM property_list_id FROM panda_realty.panda_properties
    WHERE property_list_id IN (OLD.property_list_id, v_destination)
    ORDER BY property_list_id FOR NO KEY UPDATE;
  IF (TG_OP = 'DELETE' OR v_destination IS NULL OR NEW.property_entity_id <> OLD.property_entity_id)
    AND EXISTS (SELECT 1 FROM panda_realty.buyer_offers
      WHERE property_entity_id = OLD.property_entity_id AND is_accepted) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'buyer_offers_accepted_withdraw_first',
      MESSAGE = 'Withdraw the accepted offer before deleting or detaching its buyer/property link.';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  -- The composite FK cascades the derived key on a saved-property move. The
  -- immediate unique constraint rejects any destination with another acceptance.
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.guard_document_delivery_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Retained document delivery records cannot be deleted' USING ERRCODE='23514'; END IF;
  IF TG_TABLE_NAME IN ('property_document_preparations','property_document_acknowledgements') OR
    (to_jsonb(NEW)-ARRAY['status','message_id','thread_id','error','changed_by','updated_at']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['status','message_id','thread_id','error','changed_by','updated_at']) THEN
    RAISE EXCEPTION 'Original document content and scope are immutable' USING ERRCODE='23514';
  END IF;
  IF OLD.status IN ('sent','failed') THEN RAISE EXCEPTION 'Terminal delivery outcomes are immutable' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.guard_finance_due_identity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Retain finance due history; cancel the item instead' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' AND ((NEW.property_list_id,NEW.attempt_id,NEW.listing_id,NEW.target_kind,NEW.target_id)
    IS DISTINCT FROM (OLD.property_list_id,OLD.attempt_id,OLD.listing_id,OLD.target_kind,OLD.target_id)
    OR NEW.revision<>OLD.revision+1) THEN
    RAISE EXCEPTION 'Finance due identity is immutable and revisions must advance once' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.invalidate_deposit_contract_review()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.contract_date IS DISTINCT FROM OLD.contract_date THEN
    UPDATE panda_realty.property_deposit_contract_reviews SET confirmed_at=NULL,revision=revision+1,
      changed_by=COALESCE(NULLIF(current_setting('panda.audit_actor_user_id',true),''),'contract-source-change')
      WHERE property_list_id=NEW.property_list_id AND confirmed_at IS NOT NULL
      AND attempt_id IN (SELECT attempt_id FROM panda_realty.property_timeline_attempts WHERE property_list_id=NEW.property_list_id AND ended_at IS NULL);
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.invalidate_deposit_supporting_source()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE item jsonb; kind text; changed_source_id bigint;
BEGIN
  item:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  kind:=CASE WHEN TG_TABLE_NAME='property_list_files' THEN 'property-file' ELSE 'entity-file' END;
  changed_source_id:=CASE WHEN kind='property-file' THEN (item->>'property_list_file_id')::bigint ELSE (item->>'property_entity_file_id')::bigint END;
  IF TG_OP='DELETE' OR to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN
    UPDATE panda_realty.property_deposit_contract_reviews r SET confirmed_at=NULL,revision=revision+1,
      changed_by=COALESCE(NULLIF(current_setting('panda.audit_actor_user_id',true),''),'contract-document-change')
      WHERE r.source_kind=kind AND r.source_id=changed_source_id AND r.confirmed_at IS NOT NULL;
  END IF;
  RETURN NULL;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.invalidate_trust_deposit_context()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF ROW(NEW.property_list_id,NEW.transaction_type,NEW.details,NEW.transaction_date,NEW.counterparty_entity_id,NEW.counterparty_name)
    IS DISTINCT FROM ROW(OLD.property_list_id,OLD.transaction_type,OLD.details,OLD.transaction_date,OLD.counterparty_entity_id,OLD.counterparty_name) THEN
    UPDATE panda_realty.trust_deposit_contexts SET needs_review=true,revision=revision+1,changed_at=now(),
      changed_by=COALESCE(NULLIF(current_setting('panda.audit_actor_user_id',true),''),'receipt-source-change')
      WHERE trust_transaction_id=NEW.trust_transaction_id;
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.panda_street_key(addr text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$
  SELECT panda_realty.panda_street_norm(
    regexp_replace(addr, '^\s*(lot\s+)?(\S*[0-9]\S*)\s+', '', 'i')
  )
$function$;
CREATE OR REPLACE FUNCTION panda_realty.panda_street_norm(s text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$
  SELECT btrim(regexp_replace(lower(s), '\s+', ' ', 'g'))
$function$;
CREATE OR REPLACE FUNCTION panda_realty.property_rp_identity(value text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE STRICT
AS $function$
DECLARE parts text[]; entry text; key text; candidate text; identities text[] := '{}'; path_id text;
BEGIN
  parts := regexp_match(btrim(value), '^https?://(?:[^/?#@]*@)?rpp\.(?:rpdata\.com|corelogic\.com\.au)(?::[0-9]+)?([^?#]*)(?:\?([^#]*))?(?:#.*)?$', 'i');
  IF parts IS NULL THEN RETURN NULL; END IF;
  path_id := substring(parts[1] from '^/property/[^/]+/([0-9]+)/?$');
  IF path_id IS NOT NULL THEN identities := array_append(identities,path_id); END IF;
  FOREACH entry IN ARRAY string_to_array(coalesce(parts[2],''),'&') LOOP
    key := panda_realty.property_rp_query_decode(split_part(entry,'=',1));
    IF lower(key)='propertyid' THEN
      candidate := panda_realty.property_rp_query_decode(substr(entry,strpos(entry,'=')+1));
      IF strpos(entry,'=')=0 OR candidate IS NULL OR candidate !~ '^[0-9]+$' THEN RETURN NULL; END IF;
      identities := array_append(identities,candidate);
    END IF;
  END LOOP;
  IF cardinality(identities)=0 THEN RETURN NULL; END IF;
  candidate := NULL;
  FOREACH entry IN ARRAY identities LOOP
    entry := coalesce(nullif(ltrim(entry,'0'),''),'0');
    IF entry='0' OR (candidate IS NOT NULL AND candidate<>entry) THEN RETURN NULL; END IF;
    candidate := entry;
  END LOOP;
  RETURN candidate;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.property_rp_query_decode(value text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE STRICT
AS $function$
DECLARE result bytea := ''::bytea; i int := 1; c text;
BEGIN
  WHILE i <= length(value) LOOP
    c := substr(value,i,1);
    IF c = '%' THEN
      IF substr(value,i+1,2) !~ '^[0-9a-fA-F]{2}$' THEN RETURN NULL; END IF;
      result := result || decode(substr(value,i+1,2),'hex'); i := i+3;
    ELSE
      result := result || convert_to(CASE WHEN c='+' THEN ' ' ELSE c END,'UTF8'); i := i+1;
    END IF;
  END LOOP;
  RETURN convert_from(result,'UTF8');
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.reject_accepted_property_truncate()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'panda_realty'
AS $function$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514',
    CONSTRAINT = 'buyer_offers_accepted_withdraw_first',
    MESSAGE = 'Bulk truncation is disabled. Withdraw accepted offers and use explicit row deletion.';
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.reject_invoice_history_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN RAISE EXCEPTION 'Financial version and operation history is append only' USING ERRCODE='23514'; END $function$;
CREATE OR REPLACE FUNCTION panda_realty.set_updated_at_on_buyer_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.buyer_pipeline_status_id IS DISTINCT FROM OLD.buyer_pipeline_status_id
     AND NEW.updated_at IS NULL
  THEN
    NEW.updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_buyer_offers()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.buyer_offer_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_buyer_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.buyer_status_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_contact_categories()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.contact_category_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_entities()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.entity_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_entity_categories()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.entity_category_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_entity_members()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.entity_member_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_event_timelines()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.event_timeline_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_events()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.event_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_lead_sources()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.lead_source_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_panda_properties()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.property_list_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_property_entities()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.property_entity_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_property_entity_files()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.property_entity_file_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_property_entity_notes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.entity_note_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_property_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.property_status_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_records()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Retrieve the primary key field name from the configuration table
    DECLARE
        vpk_field TEXT;
        old_record JSONB;
    BEGIN
        old_record := row_to_jsonb(OLD.*);
        SELECT pk_field INTO vpk_field FROM panda_realty.table_definitions WHERE table_name = TG_TABLE_NAME;
        EXECUTE format('INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (%L, OLD.%I, %L)', TG_TABLE_NAME, vpk_field, old_record);
        RETURN OLD;
    END;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_suburbs()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.suburb, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.trust_deposit_context(transaction_id bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  SELECT jsonb_build_object('attemptId',c.attempt_id,'beneficiaryId',c.beneficiary_entity_id::float8,
    'method',c.method,'revision',c.revision,'reason',c.reason,'valid',
    NOT c.needs_review AND c.method<>'unassigned' AND r.confirmed_at IS NOT NULL AND r.revision=c.review_revision
    AND r.source_fingerprint=panda_realty.deposit_contract_source(r.source_kind,r.source_id,c.property_list_id,c.beneficiary_entity_id)
    AND r.source_date=CASE WHEN a.ended_at IS NULL THEN p.contract_date::date ELSE (a.property_snapshot->>'contract_date')::date END AND a.property_list_id=t.property_list_id
    AND a.buyer_entity_id=c.beneficiary_entity_id AND t.transaction_type='receipt' AND t.amount>0
    AND t.transaction_date<= (now() AT TIME ZONE 'Australia/Brisbane')::date
    AND lower(btrim(t.details))=CASE c.event_key WHEN 'initial-deposit-received' THEN 'initial deposit' ELSE 'balance deposit' END
    AND EXISTS(SELECT 1 FROM panda_realty.property_entities pe WHERE pe.property_list_id=t.property_list_id AND pe.entity_id=t.counterparty_entity_id)
    AND (c.method='review' OR (t.transaction_date>=r.source_date AND NOT EXISTS(
      SELECT 1 FROM panda_realty.property_timeline_attempts prior WHERE prior.property_list_id=c.property_list_id AND prior.attempt_id<>c.attempt_id AND prior.started_at<=a.started_at))))
  FROM panda_realty.trust_deposit_contexts c JOIN panda_realty.trust_transactions t USING(trust_transaction_id)
  JOIN panda_realty.property_timeline_attempts a ON a.attempt_id=c.attempt_id
  JOIN panda_realty.panda_properties p ON p.property_list_id=c.property_list_id
  LEFT JOIN panda_realty.property_deposit_contract_reviews r ON r.attempt_id=c.attempt_id
  WHERE c.trust_transaction_id=transaction_id
$function$;
CREATE OR REPLACE FUNCTION panda_realty.validate_deposit_metadata_scope()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM panda_realty.property_timeline_attempts a
    WHERE a.attempt_id=NEW.attempt_id AND a.property_list_id=NEW.property_list_id
      AND (a.ended_at IS NULL OR (TG_OP='UPDATE' AND OLD.attempt_id=NEW.attempt_id)))
    THEN RAISE EXCEPTION 'Deposit context belongs to another or ended sale' USING ERRCODE='23514'; END IF;
  IF TG_TABLE_NAME='trust_deposit_contexts' THEN
    IF NOT EXISTS (SELECT 1 FROM panda_realty.trust_transactions t JOIN panda_realty.property_timeline_attempts a ON a.attempt_id=NEW.attempt_id
      WHERE t.trust_transaction_id=NEW.trust_transaction_id AND t.property_list_id=NEW.property_list_id AND a.buyer_entity_id=NEW.beneficiary_entity_id)
      THEN RAISE EXCEPTION 'Deposit payer context has a different property or beneficiary' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.validate_document_delivery_scope()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_TABLE_NAME='property_document_acknowledgements' THEN
    IF NOT EXISTS(SELECT 1 FROM panda_realty.property_document_sends s WHERE s.send_id=NEW.send_id AND s.property_list_id=NEW.property_list_id
      AND s.status='sent' AND s.attempt_id IS NOT DISTINCT FROM NEW.attempt_id AND s.listing_id IS NOT DISTINCT FROM NEW.listing_id)
      THEN RAISE EXCEPTION 'Acknowledgement original scope differs' USING ERRCODE='23514'; END IF;
  ELSIF TG_TABLE_NAME='property_document_preparations' THEN
    IF NOT EXISTS(SELECT 1 FROM panda_realty.trust_transactions t WHERE t.trust_transaction_id=NEW.receipt_id AND t.property_list_id=NEW.property_list_id)
      THEN RAISE EXCEPTION 'Prepared document receipt scope differs' USING ERRCODE='23514'; END IF;
  ELSIF NEW.kind='payment_request' THEN
    IF NOT EXISTS(SELECT 1 FROM panda_realty.property_payment_requests r WHERE r.request_id=NEW.request_id AND r.property_list_id=NEW.property_list_id
      AND r.attempt_id IS NOT DISTINCT FROM NEW.attempt_id AND r.listing_id IS NOT DISTINCT FROM NEW.listing_id)
      THEN RAISE EXCEPTION 'Document request scope differs' USING ERRCODE='23514'; END IF;
  ELSIF NEW.kind='solicitor_letter' THEN
    IF NOT EXISTS(SELECT 1 FROM panda_realty.property_document_preparations p WHERE p.preparation_id=NEW.preparation_id AND p.property_list_id=NEW.property_list_id
      AND p.attempt_id IS NOT DISTINCT FROM NEW.attempt_id AND p.listing_id IS NOT DISTINCT FROM NEW.listing_id)
      THEN RAISE EXCEPTION 'Prepared document scope differs' USING ERRCODE='23514'; END IF;
  ELSIF NEW.kind='issued_invoice' THEN
    IF NOT EXISTS(SELECT 1 FROM panda_realty.property_invoice_issues i JOIN panda_realty.property_invoice_artifacts a USING(issue_id)
      WHERE i.issue_id=(NEW.context_snapshot->>'issueId')::uuid AND a.artifact_id=(NEW.context_snapshot->>'artifactId')::uuid
      AND a.kind='original' AND i.property_list_id=NEW.property_list_id AND a.property_list_id=NEW.property_list_id
      AND i.attempt_id IS NOT DISTINCT FROM NEW.attempt_id AND i.listing_id IS NOT DISTINCT FROM NEW.listing_id
      AND NOT EXISTS(SELECT 1 FROM panda_realty.property_invoice_issue_events e WHERE e.issue_id=i.issue_id))
      THEN RAISE EXCEPTION 'Issued original document scope differs' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.validate_invoice_document_scope()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE original panda_realty.property_invoice_issues; draft panda_realty.property_invoice_draft_versions;
BEGIN
  IF TG_TABLE_NAME='property_invoice_file_references' THEN
    IF NOT EXISTS(SELECT 1 FROM panda_realty.property_invoice_issues i JOIN panda_realty.property_list_files f ON f.property_list_id=i.property_list_id WHERE i.issue_id=NEW.issue_id AND f.property_list_file_id=NEW.file_id)
      THEN RAISE EXCEPTION 'Invoice file reference differs in property' USING ERRCODE='23514'; END IF;
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME IN('property_invoice_issues','property_invoice_artifacts') THEN
    SELECT * INTO draft FROM panda_realty.property_invoice_draft_versions WHERE draft_id=NEW.draft_id AND revision=NEW.draft_revision;
    IF NOT FOUND OR draft.property_list_id<>NEW.property_list_id OR draft.attempt_id<>NEW.attempt_id OR draft.listing_id IS DISTINCT FROM NEW.listing_id
      THEN RAISE EXCEPTION 'Invoice draft scope differs' USING ERRCODE='23514'; END IF;
    IF TG_TABLE_NAME='property_invoice_issues' THEN
      IF draft.operation<>'reviewed' THEN RAISE EXCEPTION 'Invoice source must be reviewed' USING ERRCODE='23514'; END IF;
    END IF;
  END IF;
  IF TG_TABLE_NAME='property_invoice_issues' THEN
    IF NEW.replaces_issue_id IS NULL THEN RETURN NEW; END IF;
    SELECT * INTO original FROM panda_realty.property_invoice_issues WHERE issue_id=NEW.replaces_issue_id;
  ELSE
    IF NEW.issue_id IS NULL THEN RETURN NEW; END IF;
    SELECT * INTO original FROM panda_realty.property_invoice_issues WHERE issue_id=NEW.issue_id;
  END IF;
  IF NOT FOUND OR original.property_list_id<>NEW.property_list_id OR original.attempt_id<>NEW.attempt_id OR original.listing_id IS DISTINCT FROM NEW.listing_id
    THEN RAISE EXCEPTION 'Invoice issue scope differs' USING ERRCODE='23514'; END IF;
  IF TG_TABLE_NAME='property_invoice_artifacts' THEN
    IF original.draft_id<>NEW.draft_id OR original.draft_revision<>NEW.draft_revision
      THEN RAISE EXCEPTION 'Invoice artifact revision differs' USING ERRCODE='23514'; END IF;
  END IF;
  IF TG_TABLE_NAME='property_invoice_issue_events' THEN
    IF NEW.replacement_issue_id IS NOT NULL AND NOT EXISTS(
      SELECT 1 FROM panda_realty.property_invoice_issues i WHERE i.issue_id=NEW.replacement_issue_id AND i.replaces_issue_id=NEW.issue_id)
      THEN RAISE EXCEPTION 'Replacement linkage differs' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.validate_invoice_metadata_scope()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_TABLE_NAME='property_finance_evidence' THEN
    IF NEW.trust_transaction_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM panda_realty.trust_transactions t WHERE t.trust_transaction_id=NEW.trust_transaction_id AND t.property_list_id=NEW.property_list_id)
      THEN RAISE EXCEPTION 'Financial evidence belongs to another property' USING ERRCODE='23514'; END IF;
    IF NEW.file_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM panda_realty.property_list_files f WHERE f.property_list_file_id=NEW.file_id AND f.property_list_id=NEW.property_list_id AND f.hidden_at IS NULL)
      THEN RAISE EXCEPTION 'Financial source file belongs to another property' USING ERRCODE='23514'; END IF;
  ELSIF TG_TABLE_NAME='property_finance_allocations' THEN
    IF NOT EXISTS(SELECT 1 FROM panda_realty.property_finance_evidence e WHERE e.evidence_id=NEW.evidence_id AND e.property_list_id=NEW.property_list_id
      AND e.attempt_id IS NOT DISTINCT FROM NEW.attempt_id AND e.listing_id IS NOT DISTINCT FROM NEW.listing_id)
      THEN RAISE EXCEPTION 'Allocation source scope differs' USING ERRCODE='23514'; END IF;
    IF NEW.expense_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM panda_realty.property_expenses e WHERE e.expense_id=NEW.expense_id AND e.property_list_id=NEW.property_list_id
      AND (e.attempt_id IS NULL OR e.attempt_id=NEW.attempt_id) AND e.listing_id IS NOT DISTINCT FROM NEW.listing_id)
      THEN RAISE EXCEPTION 'Allocation expense scope differs' USING ERRCODE='23514'; END IF;
    IF NEW.paired_allocation_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM panda_realty.property_finance_allocations a WHERE a.allocation_id=NEW.paired_allocation_id AND a.property_list_id=NEW.property_list_id
      AND a.expense_id=NEW.expense_id AND a.attempt_id IS NOT DISTINCT FROM NEW.attempt_id AND a.listing_id IS NOT DISTINCT FROM NEW.listing_id AND a.role='seller_funding' AND NEW.role='agency_funding' AND NOT a.voided)
      THEN RAISE EXCEPTION 'Funding pairing scope differs' USING ERRCODE='23514'; END IF;
  ELSIF TG_TABLE_NAME='property_invoice_draft_versions' THEN
    IF NOT EXISTS(SELECT 1 FROM panda_realty.property_invoice_drafts d WHERE d.draft_id=NEW.draft_id AND d.property_list_id=NEW.property_list_id AND d.attempt_id=NEW.attempt_id AND d.listing_id IS NOT DISTINCT FROM NEW.listing_id)
      THEN RAISE EXCEPTION 'Invoice history scope differs' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.validate_payment_lifecycle_scope()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE parent jsonb; source jsonb;
BEGIN
  IF TG_TABLE_NAME='property_payment_obligations' THEN
    IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Retain payment authority history' USING ERRCODE='23514'; END IF;
    IF TG_OP='INSERT' AND NOT EXISTS(SELECT 1 FROM panda_realty.property_entities pe WHERE pe.property_list_id=NEW.property_list_id AND pe.entity_id=NEW.party_entity_id) THEN
      RAISE EXCEPTION 'Payment authority party belongs to another property' USING ERRCODE='23514'; END IF;
    IF TG_OP='UPDATE' AND (to_jsonb(NEW)-ARRAY['current_revision','changed_by','updated_at']) IS DISTINCT FROM
      (to_jsonb(OLD)-ARRAY['current_revision','changed_by','updated_at']) THEN
      RAISE EXCEPTION 'Payment obligation identity and original scope are immutable' USING ERRCODE='23514'; END IF;
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME IN ('property_payment_obligation_versions','property_payment_attributions') THEN
    SELECT to_jsonb(o) INTO parent FROM panda_realty.property_payment_obligations o WHERE o.obligation_id=NEW.obligation_id;
  ELSIF TG_TABLE_NAME='property_buyer_receipt_consumptions' THEN
    SELECT to_jsonb(e) INTO parent FROM panda_realty.property_finance_evidence e WHERE e.evidence_id=NEW.payment_evidence_id;
    IF NOT EXISTS(SELECT 1 FROM panda_realty.trust_transactions t WHERE t.trust_transaction_id=NEW.receipt_transaction_id
      AND t.property_list_id=NEW.property_list_id AND t.transaction_type='receipt') THEN
      RAISE EXCEPTION 'Buyer receipt scope or owner differs' USING ERRCODE='23514'; END IF;
    IF NOT EXISTS(SELECT 1 FROM panda_realty.property_timeline_attempts a WHERE a.attempt_id=NEW.attempt_id
      AND a.property_list_id=NEW.property_list_id AND a.buyer_entity_id=NEW.buyer_entity_id) THEN
      RAISE EXCEPTION 'Receipt retains its original buyer and sale' USING ERRCODE='23514'; END IF;
    IF NEW.kind='reversal' AND NOT EXISTS(SELECT 1 FROM panda_realty.property_buyer_receipt_consumptions c WHERE c.consumption_id=NEW.reverses_id
      AND c.kind='consumption' AND c.receipt_transaction_id=NEW.receipt_transaction_id AND c.buyer_entity_id=NEW.buyer_entity_id
      AND c.attempt_id=NEW.attempt_id AND c.property_list_id=NEW.property_list_id AND c.listing_id IS NOT DISTINCT FROM NEW.listing_id
      AND c.payment_evidence_id<>NEW.payment_evidence_id) THEN
      RAISE EXCEPTION 'Consumption reversal must retain its original receipt and buyer' USING ERRCODE='23514'; END IF;
  ELSE
    IF NEW.attribution_id IS NOT NULL THEN
      SELECT to_jsonb(a) INTO parent FROM panda_realty.property_payment_attributions a WHERE a.attribution_id=NEW.attribution_id;
    ELSE
      SELECT to_jsonb(c) INTO parent FROM panda_realty.property_buyer_receipt_consumptions c WHERE c.consumption_id=NEW.consumption_id;
    END IF;
  END IF;
  IF parent IS NULL OR parent->>'property_list_id' IS DISTINCT FROM NEW.property_list_id::text OR
    parent->>'attempt_id' IS DISTINCT FROM NEW.attempt_id::text OR parent->>'listing_id' IS DISTINCT FROM NEW.listing_id::text THEN
    RAISE EXCEPTION 'Payment lifecycle scope differs' USING ERRCODE='23514'; END IF;
  IF TG_TABLE_NAME='property_payment_attributions' THEN
    SELECT to_jsonb(e) INTO source FROM panda_realty.property_finance_evidence e WHERE e.evidence_id=NEW.evidence_id;
    IF source IS NULL OR source->>'property_list_id' IS DISTINCT FROM NEW.property_list_id::text OR
      source->>'attempt_id' IS DISTINCT FROM NEW.attempt_id::text OR source->>'listing_id' IS DISTINCT FROM NEW.listing_id::text THEN
      RAISE EXCEPTION 'Payment evidence scope differs' USING ERRCODE='23514'; END IF;
    IF NEW.kind='payment' AND NOT EXISTS(SELECT 1 FROM panda_realty.property_finance_allocations a WHERE a.allocation_id=NEW.allocation_id
      AND a.evidence_id=NEW.evidence_id AND a.property_list_id=NEW.property_list_id AND a.attempt_id=NEW.attempt_id
      AND a.listing_id IS NOT DISTINCT FROM NEW.listing_id AND a.amount=NEW.amount AND NOT a.voided
      AND a.role=CASE WHEN parent->>'purpose'='commission' THEN 'commission_payment' ELSE 'seller_proceeds_payment' END) THEN
      RAISE EXCEPTION 'Actual attribution requires the exact existing allocation' USING ERRCODE='23514'; END IF;
    IF NEW.kind='reversal' AND NOT EXISTS(SELECT 1 FROM panda_realty.property_payment_attributions a WHERE a.attribution_id=NEW.reverses_id
      AND a.kind='payment' AND a.obligation_id=NEW.obligation_id AND a.leg=NEW.leg AND a.evidence_id<>NEW.evidence_id) THEN
      RAISE EXCEPTION 'Reversal must retain original obligation and payment leg' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.validate_property_timeline_scope()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.attempt_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM panda_realty.property_timeline_attempts a WHERE a.attempt_id=NEW.attempt_id AND a.property_list_id=NEW.property_list_id AND a.ended_at IS NULL
  ) THEN RAISE EXCEPTION 'Timeline sale attempt is not current for this property' USING ERRCODE='23514'; END IF;
  IF TG_TABLE_NAME='property_timeline_evidence' THEN
    IF NOT EXISTS (SELECT 1 FROM panda_realty.trust_transactions t WHERE t.trust_transaction_id=NEW.trust_transaction_id AND t.property_list_id=NEW.property_list_id)
    THEN RAISE EXCEPTION 'Trust evidence belongs to another property' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.validate_timeline_preparation_receipt()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM panda_realty.trust_transactions t WHERE t.trust_transaction_id=NEW.trust_transaction_id
    AND t.property_list_id=NEW.property_list_id AND t.transaction_type='receipt'
    AND NEW.event_key=CASE lower(trim(t.details)) WHEN 'initial deposit' THEN 'initial-receipt-sent' WHEN 'balance deposit' THEN 'balance-receipt-sent' END)
  THEN RAISE EXCEPTION 'Preparation receipt scope does not match' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $function$;
create table panda_realty."admin_html_files" (
  "html_file_id" bigint generated by default as identity not null,
  "user_email" citext not null,
  "name" citext not null,
  "filename" text not null,
  "html_content" text not null,
  "created_at" timestamp without time zone default now(),
  PRIMARY KEY (html_file_id)
);
create table panda_realty."admin_web_links" (
  "web_link_id" bigint generated by default as identity not null,
  "user_email" citext not null,
  "name" citext not null,
  "url" text not null,
  "sort_order" integer not null default 0,
  "created_at" timestamp without time zone default now(),
  PRIMARY KEY (web_link_id)
);
create table panda_realty."audit_events" (
  "audit_event_id" bigint generated by default as identity not null,
  "audit_operation_id" uuid not null,
  "table_name" text not null,
  "primary_key" jsonb not null,
  "action" text not null,
  "before_row" jsonb,
  "after_row" jsonb,
  "changed_columns" jsonb,
  "legacy_fingerprint" text,
  "occurred_at" timestamp with time zone not null default now(),
  PRIMARY KEY (audit_event_id)
);
create table panda_realty."audit_operations" (
  "audit_operation_id" uuid not null default gen_random_uuid(),
  "actor_user_id" uuid,
  "actor_email" text,
  "source" text not null,
  "request_id" uuid,
  "is_legacy" boolean not null default false,
  "created_at" timestamp with time zone not null default now(),
  PRIMARY KEY (audit_operation_id)
);
create table panda_realty."booking_requests" (
  "booking_request_id" bigint generated by default as identity not null,
  "property_list_id" bigint not null,
  "property_entity_id" bigint not null,
  "status" text not null default 'pending'::text,
  "confirmed_slot_id" bigint,
  "confirmed_meeting_id" bigint,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone,
  PRIMARY KEY (booking_request_id)
);
create table panda_realty."booking_response_slots" (
  "booking_response_slot_id" bigint generated by default as identity not null,
  "booking_response_id" bigint not null,
  "slot_id" bigint not null,
  "created_at" timestamp with time zone default now(),
  PRIMARY KEY (booking_response_slot_id)
);
create table panda_realty."booking_responses" (
  "booking_response_id" bigint generated by default as identity not null,
  "booking_request_id" bigint not null,
  "party" text not null,
  "slot_id" bigint,
  "find_another" boolean not null default false,
  "responded_at" timestamp with time zone default now(),
  PRIMARY KEY (booking_response_id)
);
create table panda_realty."booking_slots" (
  "booking_slot_id" bigint generated by default as identity not null,
  "booking_request_id" bigint not null,
  "scheduled_at" timestamp with time zone not null,
  "duration_minutes" integer,
  "created_at" timestamp with time zone default now(),
  PRIMARY KEY (booking_slot_id)
);
create table panda_realty."condition_channel_settings" (
  "property_list_id" bigint generated by default as identity not null,
  "channels" jsonb not null,
  "updated_at" timestamp with time zone not null default now(),
  "consent_digests" jsonb,
  PRIMARY KEY (property_list_id)
);
create table panda_realty."condition_completions" (
  "buyer_offer_id" bigint not null,
  "condition_key" text not null,
  "completed_at" timestamp with time zone,
  "changed_by" text,
  "updated_at" timestamp with time zone not null default now(),
  PRIMARY KEY (buyer_offer_id, condition_key)
);
create table panda_realty."condition_delivery_attempts" (
  "attempt_id" text not null,
  "delivery_key" text not null,
  "channel" text not null,
  "recipient" text not null,
  "outcome" text not null default 'pending'::text,
  "provider_reference" text,
  "provider_message_id" text,
  "rfc_message_id" text,
  "created_at" timestamp with time zone not null default now(),
  "outcome_at" timestamp with time zone,
  "checked_at" timestamp with time zone,
  "error" text,
  "total_parts" integer not null default 1,
  "parts" jsonb not null default '{}'::jsonb,
  "aggregate_delivered_at" timestamp with time zone,
  PRIMARY KEY (attempt_id)
);
create table panda_realty."condition_delivery_events" (
  "event_key" text not null,
  "attempt_id" text not null,
  "provider_reference" text not null,
  "status" text not null,
  "event_at" timestamp with time zone not null,
  "part" integer not null,
  "total_parts" integer not null,
  "received_at" timestamp with time zone not null default now(),
  PRIMARY KEY (event_key)
);
create table panda_realty."condition_reminder_deliveries" (
  "delivery_key" text not null,
  "property_list_id" bigint not null,
  "buyer_offer_id" bigint not null,
  "condition_key" text not null,
  "due_date" date not null,
  "recipient" text not null,
  "attempts" integer not null default 0,
  "last_attempt_at" timestamp with time zone,
  "sent_at" timestamp with time zone,
  "gmail_thread_id" text,
  "last_error" text,
  "channel" text not null default 'email'::text,
  "audience" text not null default 'agent'::text,
  "state" text not null default 'pending'::text,
  "claim_id" text,
  "claimed_at" timestamp with time zone,
  "provider_reference" text,
  "payload" jsonb,
  PRIMARY KEY (delivery_key)
);
create table panda_realty."condition_reminder_incidents" (
  "incident_key" text not null,
  "message" text not null,
  "opened_at" timestamp with time zone not null default now(),
  "resolved_at" timestamp with time zone,
  "alerted_at" timestamp with time zone,
  "alert_error" text,
  PRIMARY KEY (incident_key)
);
create table panda_realty."condition_reminder_runs" (
  "run_id" uuid not null default gen_random_uuid(),
  "started_at" timestamp with time zone not null default now(),
  "finished_at" timestamp with time zone,
  "state" text not null default 'running'::text,
  "sent" integer not null default 0,
  "failed" integer not null default 0,
  "skipped" integer not null default 0,
  "error" text,
  "kind" text not null default 'scheduled'::text,
  PRIMARY KEY (run_id)
);
create table panda_realty."condition_retention_runs" (
  "retention_run_id" uuid not null default gen_random_uuid(),
  "applied_at" timestamp with time zone not null default now(),
  "applied_by" text not null,
  "as_of" timestamp with time zone not null,
  "counts" jsonb not null,
  PRIMARY KEY (retention_run_id)
);
create table panda_realty."deleted_records" (
  "table_name" character varying not null,
  "created_at" timestamp without time zone not null default CURRENT_TIMESTAMP,
  "pk_value" character varying not null,
  "json_row" json
);
create table panda_realty."email_templates" (
  "email_template_id" bigint generated by default as identity not null,
  "name" citext not null,
  "subject" text not null default ''::text,
  "html_content" text not null default ''::text,
  "created_at" timestamp without time zone default now(),
  "updated_at" timestamp without time zone,
  PRIMARY KEY (email_template_id)
);
create table panda_realty."grouped_embeddings" (
  "table_name" character varying,
  "record_id" character varying
);
create table panda_realty."invoice_document_profiles" (
  "revision" integer generated by default as identity not null,
  "profile" jsonb not null,
  "changed_by" text not null,
  "created_at" timestamp with time zone not null default now(),
  PRIMARY KEY (revision)
);
create table panda_realty."note_category_colors" (
  "category_key" text not null,
  "note_color" text not null,
  "updated_at" timestamp without time zone not null default now(),
  PRIMARY KEY (category_key)
);
create table panda_realty."property_buyer_receipt_consumptions" (
  "consumption_id" uuid not null default gen_random_uuid(),
  "property_list_id" bigint not null,
  "attempt_id" uuid not null,
  "listing_id" uuid,
  "event_key" text not null default 'buyer-receipt-consumption'::text,
  "receipt_transaction_id" bigint not null,
  "kind" text not null default 'consumption'::text,
  "reverses_id" uuid,
  "payment_evidence_id" uuid not null,
  "buyer_entity_id" bigint not null,
  "amount" numeric not null,
  "receipt_revision" text not null,
  "payment_revision" text not null,
  "authority_ref" jsonb not null,
  "authority_snapshot" jsonb not null,
  "authority_revision" text not null,
  "reason" text not null,
  "changed_by" text not null,
  "created_at" timestamp with time zone not null default now(),
  PRIMARY KEY (consumption_id)
);
create table panda_realty."property_deposit_contract_reviews" (
  "attempt_id" uuid not null,
  "property_list_id" bigint not null,
  "event_key" text not null default 'deposit-contract-review'::text,
  "source_date" date not null,
  "source_reference" text not null,
  "source_kind" text not null,
  "source_id" bigint not null,
  "source_fingerprint" text not null,
  "confirmed_at" timestamp with time zone,
  "changed_by" text not null,
  "revision" integer not null default 1,
  PRIMARY KEY (attempt_id)
);
create table panda_realty."property_document_acknowledgements" (
  "acknowledgement_id" uuid not null default gen_random_uuid(),
  "send_id" uuid not null,
  "property_list_id" bigint not null,
  "attempt_id" uuid,
  "listing_id" uuid,
  "event_key" text not null default 'financial-document-acknowledgement'::text,
  "request_nonce" uuid not null,
  "request_revision" text not null,
  "evidence_ref" jsonb not null,
  "source_snapshot" jsonb not null,
  "note" text not null,
  "changed_by" text not null,
  "created_at" timestamp with time zone not null default now(),
  PRIMARY KEY (acknowledgement_id)
);
create table panda_realty."property_document_preparations" (
  "preparation_id" uuid not null default gen_random_uuid(),
  "property_list_id" bigint not null,
  "attempt_id" uuid,
  "listing_id" uuid,
  "event_key" text not null default 'financial-document-preparation'::text,
  "receipt_id" bigint not null,
  "source_revision" text not null,
  "source_snapshot" jsonb not null,
  "name" text not null,
  "mime_type" text not null,
  "digest" text not null,
  "size" integer not null,
  "artifact_bytes" bytea not null,
  "changed_by" text not null,
  "created_at" timestamp with time zone not null default now(),
  PRIMARY KEY (preparation_id)
);
create table panda_realty."property_document_sends" (
  "send_id" uuid not null,
  "property_list_id" bigint not null,
  "attempt_id" uuid,
  "listing_id" uuid,
  "event_key" text not null default 'financial-document-send'::text,
  "kind" text not null,
  "document_key" text not null,
  "context_snapshot" jsonb not null,
  "source_snapshot" jsonb not null,
  "preparation_id" uuid,
  "request_id" uuid,
  "content_snapshot" jsonb not null,
  "content_revision" text not null,
  "attachment_bytes" bytea[] not null default '{}'::bytea[],
  "status" text not null,
  "message_id" text,
  "thread_id" text,
  "rfc_message_id" text not null,
  "error" text,
  "changed_by" text not null,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  PRIMARY KEY (send_id)
);
create table panda_realty."property_events" (
  "property_event_id" bigint generated by default as identity not null,
  "property_list_id" bigint not null,
  "event_type" text not null default 'viewing'::text,
  "occurred_at" timestamp with time zone not null,
  "outcome" text,
  "created_at" timestamp without time zone default now(),
  "updated_at" timestamp without time zone,
  PRIMARY KEY (property_event_id)
);
create table panda_realty."property_expense_payments" (
  "link_id" uuid not null default gen_random_uuid(),
  "expense_id" uuid not null,
  "property_list_id" bigint not null,
  "attempt_id" uuid,
  "event_key" text not null default 'financial-expense'::text,
  "trust_transaction_id" bigint,
  "source_transaction_id" bigint not null,
  "source_snapshot" jsonb not null,
  "source_revision" text not null,
  "changed_by" text not null,
  "updated_at" timestamp with time zone not null default now(),
  PRIMARY KEY (link_id)
);
create table panda_realty."property_expenses" (
  "expense_id" uuid not null default gen_random_uuid(),
  "property_list_id" bigint not null,
  "attempt_id" uuid,
  "listing_id" uuid,
  "event_key" text not null default 'financial-expense'::text,
  "supplier_entity_id" bigint not null,
  "supplier_name" text not null,
  "description" text not null,
  "cost_kind" text not null,
  "amount" numeric,
  "source_date" date,
  "file_id" bigint,
  "approval_file_id" bigint,
  "account_context" text not null,
  "notes" text not null default ''::text,
  "cancelled" boolean not null default false,
  "revision" integer not null default 1,
  "changed_by" text not null,
  "updated_at" timestamp with time zone not null default now(),
  "financial_terms" jsonb,
  PRIMARY KEY (expense_id)
);
create table panda_realty."property_finance_allocations" (
  "allocation_id" uuid not null default gen_random_uuid(),
  "evidence_id" uuid not null,
  "property_list_id" bigint not null,
  "attempt_id" uuid,
  "listing_id" uuid,
  "event_key" text not null default 'financial-allocation'::text,
  "expense_id" uuid,
  "role" text not null,
  "amount" numeric not null,
  "paired_allocation_id" uuid,
  "source_revision" text not null,
  "revision" integer not null default 1,
  "voided" boolean not null default false,
  "reason" text not null default ''::text,
  "changed_by" text not null,
  "updated_at" timestamp with time zone not null default now(),
  PRIMARY KEY (allocation_id)
);
create table panda_realty."property_finance_due_work" (
  "due_id" uuid not null default gen_random_uuid(),
  "property_list_id" bigint not null,
  "attempt_id" uuid,
  "listing_id" uuid,
  "event_key" text not null default 'financial-due-work'::text,
  "target_kind" text not null,
  "target_id" uuid not null,
  "title" text not null,
  "due_date" date,
  "owner_agent_id" bigint,
  "source_revision" text not null,
  "revision" integer not null default 1,
  "cancelled" boolean not null default false,
  "notes" text not null default ''::text,
  "changed_by" text not null,
  "updated_at" timestamp with time zone not null default now(),
  PRIMARY KEY (due_id)
);
create table panda_realty."property_finance_evidence" (
  "evidence_id" uuid not null default gen_random_uuid(),
  "property_list_id" bigint not null,
  "attempt_id" uuid,
  "listing_id" uuid,
  "event_key" text not null default 'financial-evidence'::text,
  "source_kind" text not null,
  "trust_transaction_id" bigint,
  "source_transaction_id" bigint,
  "source_snapshot" jsonb not null,
  "source_revision" text not null,
  "direction" text not null,
  "purpose" text not null,
  "account_context" text not null,
  "account_ref" text not null default ''::text,
  "party_entity_id" bigint,
  "party_name" text not null,
  "source_date" date,
  "file_id" bigint,
  "source_ref" jsonb,
  "amount" numeric,
  "currency" text not null default 'AUD'::text,
  "verification" text not null,
  "external_identity_key" text,
  "external_provider_key" text,
  "revision" integer not null default 1,
  "voided" boolean not null default false,
  "reason" text not null default ''::text,
  "changed_by" text not null,
  "updated_at" timestamp with time zone not null default now(),
  PRIMARY KEY (evidence_id)
);
create table panda_realty."property_finance_operations" (
  "property_list_id" bigint not null,
  "attempt_id" uuid,
  "listing_id" uuid,
  "event_key" text not null default 'financial-operation'::text,
  "request_nonce" uuid not null,
  "request_digest" text not null,
  "response" jsonb not null,
  "changed_by" text not null,
  "created_at" timestamp with time zone not null default now(),
  PRIMARY KEY (property_list_id, request_nonce)
);
create table panda_realty."property_form_recipient_prefs" (
  "property_list_id" bigint not null,
  "property_form_id" bigint not null,
  "buyer_enabled" boolean not null,
  "seller_enabled" boolean not null,
  "updated_at" timestamp with time zone not null default now(),
  PRIMARY KEY (property_list_id, property_form_id)
);
create table panda_realty."property_form_sign_requests" (
  "id" bigint generated by default as identity not null,
  "property_form_send_id" bigint not null,
  "property_list_id" bigint not null,
  "file_id" text not null,
  "adobe_sign_agreement_id" text,
  "signature_status" text not null,
  "signer_email" text not null,
  "signed_file_id" text,
  "created_at" timestamp with time zone not null default now(),
  "signed_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "provider" text not null default 'adobe'::text,
  "provider_envelope_id" text,
  "provider_recipient_id" text,
  PRIMARY KEY (id)
);
create table panda_realty."property_import_action_rows" (
  "import_action_row_id" bigint generated by default as identity not null,
  "import_action_id" uuid not null,
  "import_row_id" bigint not null,
  "target_property_list_id" bigint,
  "outcome" text not null,
  "failure_reason" text,
  "before_values" jsonb,
  "after_values" jsonb,
  "created_at" timestamp with time zone not null default now(),
  "expected_updated_at" timestamp with time zone,
  PRIMARY KEY (import_action_row_id)
);
create table panda_realty."property_import_actions" (
  "import_action_id" uuid not null default gen_random_uuid(),
  "import_run_id" uuid not null,
  "action" text not null,
  "status" text not null default 'running'::text,
  "performed_by_user_id" uuid not null,
  "performed_by_email" text,
  "inserted_count" integer not null default 0,
  "updated_count" integer not null default 0,
  "deleted_count" integer not null default 0,
  "failed_count" integer not null default 0,
  "error" text,
  "created_at" timestamp with time zone not null default now(),
  "completed_at" timestamp with time zone,
  "attempts" integer not null default 0,
  "started_at" timestamp with time zone,
  "processed_rows" integer not null default 0,
  "total_rows" integer not null default 0,
  "source_action_id" uuid,
  PRIMARY KEY (import_action_id)
);
create table panda_realty."property_import_job_chunks" (
  "import_job_chunk_id" bigint generated by default as identity not null,
  "import_run_id" uuid not null,
  "chunk_index" integer not null,
  "chunk_offset" integer not null,
  "rows" jsonb not null,
  "status" text not null default 'queued'::text,
  "attempts" integer not null default 0,
  "error" text,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "phase" text not null default 'stage'::text,
  PRIMARY KEY (import_job_chunk_id)
);
create table panda_realty."property_import_rows" (
  "import_row_id" bigint generated by default as identity not null,
  "import_run_id" uuid not null,
  "source_row_index" integer not null,
  "property_list_id" bigint,
  "outcome" text not null,
  "failure_reason" text,
  "before_values" jsonb,
  "after_values" jsonb,
  "field_changes" jsonb,
  "created_at" timestamp with time zone not null default now(),
  PRIMARY KEY (import_row_id)
);
create table panda_realty."property_import_runs" (
  "import_run_id" uuid not null default gen_random_uuid(),
  "mode" text not null,
  "status" text not null default 'collecting'::text,
  "source_file_name" text not null,
  "source_file_mime_type" text not null,
  "source_file_size" bigint not null,
  "source_file_bytes" bytea,
  "source_drive_file_id" text,
  "source_drive_web_view_link" text,
  "source_drive_status" text not null default 'pending'::text,
  "source_drive_error" text,
  "imported_by_user_id" uuid not null,
  "imported_by_email" text,
  "total_rows" integer not null default 0,
  "inserted_count" integer not null default 0,
  "updated_count" integer not null default 0,
  "skipped_count" integer not null default 0,
  "failed_count" integer not null default 0,
  "audit_attempts" integer not null default 0,
  "audit_error" text,
  "retention_expires_at" timestamp with time zone not null,
  "audit_completed_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "completed_at" timestamp with time zone,
  "updated_at" timestamp with time zone not null default now(),
  "processed_rows" integer not null default 0,
  "skipped_source_rows" integer not null default 0,
  "processing_started_at" timestamp with time zone,
  "processing_error" text,
  "notification_status" text not null default 'pending'::text,
  "notification_error" text,
  "notification_sent_at" timestamp with time zone,
  "staged_inserted_count" integer not null default 0,
  "staged_updated_count" integer not null default 0,
  "staged_skipped_count" integer not null default 0,
  "staged_failed_count" integer not null default 0,
  "staging_expires_at" timestamp with time zone,
  "property_change_revision" integer not null default 0,
  PRIMARY KEY (import_run_id)
);
create table panda_realty."property_import_staged_rows" (
  "property_import_staged_row_id" bigint generated by default as identity not null,
  "import_run_id" uuid not null,
  "source_row_index" integer not null,
  "row_data" jsonb not null,
  "image_drive_file_id" text,
  "outcome" text not null,
  "failure_reason" text,
  "before_values" jsonb,
  "field_changes" jsonb,
  "created_at" timestamp with time zone not null default now(),
  "image_error" text,
  PRIMARY KEY (property_import_staged_row_id)
);
create table panda_realty."property_invoice_artifacts" (
  "artifact_id" uuid not null default gen_random_uuid(),
  "property_list_id" bigint not null,
  "attempt_id" uuid not null,
  "listing_id" uuid,
  "issue_id" uuid,
  "draft_id" uuid not null,
  "draft_revision" integer not null,
  "kind" text not null,
  "format_version" integer not null,
  "sha256" text not null,
  "byte_size" integer not null,
  "pdf_bytes" bytea not null,
  "file_name" text not null,
  "event_key" text not null default 'financial-invoice-artifact'::text,
  "changed_by" text not null,
  "created_at" timestamp with time zone not null default now(),
  PRIMARY KEY (artifact_id)
);
create table panda_realty."property_invoice_draft_versions" (
  "draft_id" uuid not null,
  "revision" integer not null,
  "property_list_id" bigint not null,
  "attempt_id" uuid not null,
  "listing_id" uuid,
  "event_key" text not null default 'financial-invoice-draft'::text,
  "operation" text not null,
  "request_nonce" uuid not null,
  "request_digest" text not null,
  "inputs" jsonb not null,
  "calculation_snapshot" jsonb not null,
  "source_revision" text not null,
  "calculation_version" integer not null,
  "reason" text not null default ''::text,
  "changed_by" text not null,
  "created_at" timestamp with time zone not null default now(),
  PRIMARY KEY (draft_id, revision)
);
create table panda_realty."property_invoice_drafts" (
  "draft_id" uuid not null default gen_random_uuid(),
  "property_list_id" bigint not null,
  "attempt_id" uuid not null,
  "listing_id" uuid,
  "event_key" text not null default 'financial-invoice-draft'::text,
  "current_revision" integer not null,
  "changed_by" text not null,
  "updated_at" timestamp with time zone not null default now(),
  PRIMARY KEY (draft_id)
);
create table panda_realty."property_invoice_file_references" (
  "issue_id" uuid not null,
  "file_id" bigint not null,
  PRIMARY KEY (issue_id, file_id)
);
create table panda_realty."property_invoice_issue_events" (
  "event_id" uuid not null default gen_random_uuid(),
  "issue_id" uuid not null,
  "property_list_id" bigint not null,
  "attempt_id" uuid not null,
  "listing_id" uuid,
  "operation" text not null,
  "request_nonce" uuid not null,
  "reason" text not null,
  "replacement_issue_id" uuid,
  "event_key" text not null default 'financial-invoice-issue'::text,
  "changed_by" text not null,
  "created_at" timestamp with time zone not null default now(),
  PRIMARY KEY (event_id)
);
create table panda_realty."property_invoice_issues" (
  "issue_id" uuid not null default gen_random_uuid(),
  "property_list_id" bigint not null,
  "attempt_id" uuid not null,
  "listing_id" uuid,
  "draft_id" uuid not null,
  "draft_revision" integer not null,
  "profile_revision" integer not null,
  "invoice_number" text not null,
  "sequence_number" integer not null,
  "source_revision" text not null,
  "contact_revision" text not null,
  "request_nonce" uuid not null,
  "request_digest" text not null,
  "replaces_issue_id" uuid,
  "issue_snapshot" jsonb not null,
  "event_key" text not null default 'financial-invoice-issue'::text,
  "changed_by" text not null,
  "created_at" timestamp with time zone not null default now(),
  PRIMARY KEY (issue_id)
);
create table panda_realty."property_payment_attributions" (
  "attribution_id" uuid not null default gen_random_uuid(),
  "property_list_id" bigint not null,
  "attempt_id" uuid not null,
  "listing_id" uuid,
  "event_key" text not null default 'payment-attribution'::text,
  "obligation_id" uuid not null,
  "obligation_revision" integer not null,
  "leg" text not null,
  "kind" text not null,
  "reverses_id" uuid,
  "evidence_id" uuid not null,
  "allocation_id" uuid,
  "amount" numeric not null,
  "source_revision" text not null,
  "reason" text not null,
  "changed_by" text not null,
  "created_at" timestamp with time zone not null default now(),
  PRIMARY KEY (attribution_id)
);
create table panda_realty."property_payment_obligation_versions" (
  "obligation_id" uuid not null,
  "revision" integer not null,
  "property_list_id" bigint not null,
  "attempt_id" uuid not null,
  "listing_id" uuid,
  "event_key" text not null default 'payment-obligation'::text,
  "trust_amount" numeric not null,
  "outside_amount" numeric not null,
  "authority_ref" jsonb not null,
  "authority_snapshot" jsonb not null,
  "authority_revision" text not null,
  "status" text not null,
  "reason" text not null,
  "changed_by" text not null,
  "created_at" timestamp with time zone not null default now(),
  PRIMARY KEY (obligation_id, revision)
);
create table panda_realty."property_payment_obligations" (
  "obligation_id" uuid not null default gen_random_uuid(),
  "property_list_id" bigint not null,
  "attempt_id" uuid not null,
  "listing_id" uuid,
  "event_key" text not null default 'payment-obligation'::text,
  "purpose" text not null,
  "party_entity_id" bigint not null,
  "party_name" text not null,
  "currency" text not null,
  "current_revision" integer not null,
  "changed_by" text not null,
  "updated_at" timestamp with time zone not null default now(),
  PRIMARY KEY (obligation_id)
);
create table panda_realty."property_payment_request_sends" (
  "send_id" uuid not null,
  "request_id" uuid not null,
  "property_list_id" bigint not null,
  "attempt_id" uuid,
  "event_key" text not null default 'financial-request-send'::text,
  "request_revision" integer not null,
  "source_snapshot" jsonb not null,
  "content_snapshot" jsonb not null,
  "content_revision" text not null,
  "status" text not null,
  "message_id" text,
  "thread_id" text,
  "rfc_message_id" text not null,
  "error" text,
  "changed_by" text not null,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  PRIMARY KEY (send_id)
);
create table panda_realty."property_payment_requests" (
  "request_id" uuid not null default gen_random_uuid(),
  "property_list_id" bigint not null,
  "attempt_id" uuid,
  "listing_id" uuid,
  "event_key" text not null,
  "expense_id" uuid,
  "party_entity_id" bigint,
  "party_name" text not null,
  "source_revision" text not null,
  "source_snapshot" jsonb not null,
  "due_date" date,
  "notes" text not null default ''::text,
  "cancelled" boolean not null default false,
  "revision" integer not null default 1,
  "changed_by" text not null,
  "updated_at" timestamp with time zone not null default now(),
  PRIMARY KEY (request_id)
);
create table panda_realty."property_payment_reviews" (
  "review_id" uuid not null default gen_random_uuid(),
  "property_list_id" bigint not null,
  "attempt_id" uuid not null,
  "listing_id" uuid,
  "event_key" text not null default 'payment-review'::text,
  "attribution_id" uuid,
  "consumption_id" uuid,
  "reviewed_snapshot" jsonb not null,
  "reason" text not null,
  "changed_by" text not null,
  "created_at" timestamp with time zone not null default now(),
  PRIMARY KEY (review_id)
);
create table panda_realty."property_timeline_acknowledgements" (
  "acknowledgement_id" bigint generated by default as identity not null,
  "property_list_id" bigint not null,
  "attempt_id" uuid,
  "event_key" text not null,
  "completed_at" timestamp with time zone,
  "due_date" date,
  "notes" text not null default ''::text,
  "changed_by" text not null,
  "revision" integer not null default 1,
  "updated_at" timestamp with time zone not null default now(),
  "not_required" boolean not null default false,
  "maintenance_tasks" jsonb not null default '[]'::jsonb,
  "preparation_listing_id" uuid,
  "reviewed_listing_id" uuid,
  PRIMARY KEY (acknowledgement_id)
);
create table panda_realty."property_timeline_attempts" (
  "attempt_id" uuid not null default gen_random_uuid(),
  "property_list_id" bigint not null,
  "buyer_offer_id" bigint not null,
  "buyer_entity_id" bigint,
  "started_at" timestamp with time zone not null default now(),
  "ended_at" timestamp with time zone,
  "offer_snapshot" jsonb not null default '{}'::jsonb,
  "property_snapshot" jsonb not null default '{}'::jsonb,
  "condition_snapshot" jsonb not null default '[]'::jsonb,
  PRIMARY KEY (attempt_id)
);
create table panda_realty."property_timeline_changes" (
  "change_id" bigint generated by default as identity not null,
  "property_list_id" bigint not null,
  "attempt_id" uuid,
  "event_key" text not null,
  "action" text not null,
  "changed_by" text,
  "changed_at" timestamp with time zone not null default now(),
  "before_state" jsonb,
  "after_state" jsonb,
  PRIMARY KEY (change_id)
);
create table panda_realty."property_timeline_evidence" (
  "trust_transaction_id" bigint generated by default as identity not null,
  "property_list_id" bigint not null,
  "attempt_id" uuid,
  "event_key" text not null,
  "linked_by" text not null,
  "linked_at" timestamp with time zone not null default now(),
  PRIMARY KEY (trust_transaction_id)
);
create table panda_realty."property_timeline_listing_state" (
  "property_list_id" bigint generated by default as identity not null,
  "listing_id" uuid,
  "pending_relist" boolean not null default true,
  "changed_at" timestamp with time zone not null default now(),
  PRIMARY KEY (property_list_id)
);
create table panda_realty."property_timeline_record_links" (
  "record_link_id" bigint generated by default as identity not null,
  "property_list_id" bigint not null,
  "attempt_id" uuid,
  "event_key" text not null,
  "record_kind" text not null,
  "record_id" bigint not null,
  "linked_by" text not null,
  "linked_at" timestamp with time zone not null default now(),
  PRIMARY KEY (record_link_id)
);
create table panda_realty."property_timeline_solicitor_preparations" (
  "trust_transaction_id" bigint generated by default as identity not null,
  "property_list_id" bigint not null,
  "attempt_id" uuid,
  "event_key" text not null,
  "source_revision" text not null,
  "format_version" integer not null,
  "status" text not null,
  "failure_message" text,
  "prepared_at" timestamp with time zone,
  "changed_by" text not null,
  "revision" integer not null default 1,
  "updated_at" timestamp with time zone not null default now(),
  PRIMARY KEY (trust_transaction_id)
);
create table panda_realty."public_offer_form_tokens" (
  "public_offer_form_token_id" bigint generated by default as identity not null,
  "property_list_id" bigint not null,
  "token" text not null,
  "created_at" timestamp without time zone default now(),
  PRIMARY KEY (public_offer_form_token_id)
);
create table panda_realty."table_definitions" (
  "table_name" character varying not null,
  "created_at" timestamp without time zone not null default CURRENT_TIMESTAMP,
  "pk_field" character varying not null
);
create table panda_realty."trust_bank_reference_reviews" (
  "trust_transaction_id" bigint generated by default as identity not null,
  "status" text not null,
  "fingerprint" text not null,
  "revision" integer not null default 1,
  "updated_by" text not null,
  "updated_at" timestamp with time zone not null default now(),
  PRIMARY KEY (trust_transaction_id)
);
create table panda_realty."trust_bank_reference_settings" (
  "id" integer not null default 1,
  "opening_date" date not null,
  "opening_balance" numeric not null,
  "provisional" boolean not null default true,
  "revision" integer not null default 1,
  "updated_by" text not null,
  "updated_at" timestamp with time zone not null default now(),
  PRIMARY KEY (id)
);
create table panda_realty."trust_deposit_contexts" (
  "trust_transaction_id" bigint generated by default as identity not null,
  "property_list_id" bigint not null,
  "attempt_id" uuid not null,
  "beneficiary_entity_id" bigint not null,
  "event_key" text not null,
  "method" text not null,
  "review_revision" integer not null,
  "reason" text not null default ''::text,
  "needs_review" boolean not null default false,
  "changed_by" text not null,
  "revision" integer not null default 1,
  "changed_at" timestamp with time zone not null default now(),
  PRIMARY KEY (trust_transaction_id)
);
create table panda_realty."trust_property_sync_run_properties" (
  "trust_property_sync_run_property_id" bigint generated by default as identity not null,
  "trust_property_sync_run_id" bigint not null,
  "legacy_property_id" bigint not null,
  "legacy_address" text not null,
  "action" text not null,
  "panda_property_list_id" bigint,
  "match_status" text,
  "match_confidence" text,
  "match_rules" jsonb not null default '[]'::jsonb,
  "selection_reason" text,
  "candidate_property_list_ids" jsonb not null default '[]'::jsonb,
  "payload" jsonb not null,
  PRIMARY KEY (trust_property_sync_run_property_id)
);
create table panda_realty."trust_property_sync_runs" (
  "trust_property_sync_run_id" bigint generated by default as identity not null,
  "status" text not null,
  "source_file_name" text,
  "initiated_by" citext,
  "summary" jsonb not null default '{}'::jsonb,
  "error" text,
  "started_at" timestamp with time zone not null default now(),
  "completed_at" timestamp with time zone,
  PRIMARY KEY (trust_property_sync_run_id)
);
create table panda_realty."trust_receipt_settings" (
  "trust_receipt_settings_id" integer not null default 1,
  "header_text" text not null default 'Agents Financial Administration Act 2014 Trust account receipt\nMy Panda Realty\nLicense No. 4300986'::text,
  "email_template_id" bigint,
  "digital_signature_url" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  PRIMARY KEY (trust_receipt_settings_id)
);
create table panda_realty."trust_reconciliation_outstanding_items" (
  "trust_reconciliation_outstanding_item_id" bigint generated by default as identity not null,
  "trust_reconciliation_id" bigint not null,
  "item_type" text not null,
  "description" text not null,
  "amount" numeric not null,
  "display_order" integer not null default 0,
  PRIMARY KEY (trust_reconciliation_outstanding_item_id)
);
create table panda_realty."trust_reconciliations" (
  "trust_reconciliation_id" bigint generated by default as identity not null,
  "period" date not null,
  "bank_ending_balance" numeric not null default 0,
  "status" text not null default 'draft'::text,
  "summary" jsonb not null default '{}'::jsonb,
  "published_by" citext,
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  PRIMARY KEY (trust_reconciliation_id)
);
create table panda_realty."trust_transaction_imports" (
  "trust_transaction_import_id" bigint generated by default as identity not null,
  "source_table" text not null,
  "source_id" bigint not null,
  "trust_transaction_id" bigint,
  "trust_transaction_sync_run_id" bigint,
  "source_payload" jsonb not null,
  "imported_at" timestamp with time zone not null default now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" citext,
  PRIMARY KEY (trust_transaction_import_id)
);
create table panda_realty."trust_transaction_sync_run_rows" (
  "trust_transaction_sync_run_row_id" bigint generated by default as identity not null,
  "trust_transaction_sync_run_id" bigint not null,
  "source_table" text not null,
  "source_id" bigint not null,
  "transaction_type" text not null,
  "action" text not null,
  "trust_transaction_id" bigint,
  "panda_property_list_id" bigint,
  "property_match_status" text,
  "property_selection_reason" text,
  "counterparty_entity_id" bigint,
  "counterparty_match_status" text,
  "counterparty_match_reason" text,
  "counterparty_name" text not null,
  "payload" jsonb not null,
  PRIMARY KEY (trust_transaction_sync_run_row_id)
);
create table panda_realty."trust_transaction_sync_runs" (
  "trust_transaction_sync_run_id" bigint generated by default as identity not null,
  "status" text not null,
  "source_file_name" text,
  "initiated_by" citext,
  "summary" jsonb not null default '{}'::jsonb,
  "error" text,
  "started_at" timestamp with time zone not null default now(),
  "completed_at" timestamp with time zone,
  PRIMARY KEY (trust_transaction_sync_run_id)
);
create table panda_realty."trust_transactions" (
  "trust_transaction_id" bigint generated by default as identity not null,
  "transaction_type" text not null,
  "transaction_number" integer not null default 0,
  "property_list_id" bigint not null,
  "counterparty_entity_id" bigint,
  "counterparty_name" citext not null,
  "transaction_date" date not null,
  "completed_date" date not null,
  "amount" numeric not null,
  "method" citext not null default 'EFT'::citext,
  "details" citext not null,
  "reference_number" citext,
  "completed_by" citext,
  "comments" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  PRIMARY KEY (trust_transaction_id)
);
create table panda_realty."updated_embeddings" (
  "id" integer not null default nextval('panda_realty.updated_embeddings_id_seq'::regclass),
  "table_name" character varying not null,
  "record_id" character varying not null,
  "created_at" timestamp without time zone not null default CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
alter table panda_realty."buyer_offers" add column "sale_simultaneous_settlement" boolean;
alter table panda_realty."buyer_offers" add column "due_diligence_calendar_event_id" text;
alter table panda_realty."buyer_offers" add column "accepted_property_id" bigint;
alter table panda_realty."entities" add column "is_property_seller_shadow" boolean not null default false;
alter table panda_realty."entities" add column "alias" citext;
alter table panda_realty."entity_members" add column "is_sellers_representative" boolean not null default false;
alter table panda_realty."entity_members" add column "member_alias" citext;
alter table panda_realty."offer_form_submissions" add column "sale_simultaneous_settlement" boolean;
alter table panda_realty."panda_properties" add column "cooling_off_date" timestamp without time zone;
alter table panda_realty."panda_properties" add column "bpi_due_date" timestamp without time zone;
alter table panda_realty."panda_properties" add column "finance_due_date" timestamp without time zone;
alter table panda_realty."panda_properties" add column "searches_date" timestamp without time zone;
alter table panda_realty."panda_properties" add column "balance_deposit_due_date" timestamp without time zone;
alter table panda_realty."panda_properties" add column "realestate_url" citext;
alter table panda_realty."panda_properties" add column "owner1alias" citext;
alter table panda_realty."panda_properties" add column "owner2alias" citext;
alter table panda_realty."panda_properties" add column "owner3alias" citext;
alter table panda_realty."portal_file_sign_requests" add column "provider" text not null default 'adobe'::text;
alter table panda_realty."portal_file_sign_requests" add column "provider_envelope_id" text;
alter table panda_realty."portal_file_sign_requests" add column "provider_recipient_id" text;
alter table panda_realty."portal_messages" add column "read_ack_at" timestamp without time zone;
alter table panda_realty."portal_messages" add column "source" text not null default 'portal'::text;
alter table panda_realty."portal_messages" add column "inbound_email_message_id" text;
alter table panda_realty."portal_tokens" add column "open_count" integer not null default 0;
alter table panda_realty."portal_tokens" add column "notification_settings" jsonb not null default '{}'::jsonb;
alter table panda_realty."portal_tokens" add column "access_scope_id" uuid;
alter table panda_realty."property_entity_files" add column "entity_file_link" text;
alter table panda_realty."property_entity_files" add column "entity_file_name" text;
alter table panda_realty."property_entity_files" add column "entity_file_size" bigint;
alter table panda_realty."property_entity_files" add column "hidden_at" timestamp with time zone;
alter table panda_realty."property_entity_notes" add column "shared_with_portal" boolean not null default false;
alter table panda_realty."property_entity_notes" add column "shared_with_seller" boolean not null default false;
alter table panda_realty."property_entity_notes" add column "viewed_at" timestamp without time zone;
alter table panda_realty."property_entity_notes" add column "note_color" text;
alter table panda_realty."property_entity_notes" add column "is_important" boolean not null default false;
alter table panda_realty."property_form_sends" add column "google_drive_file_id" text;
alter table panda_realty."property_list_files" add column "hidden_at" timestamp with time zone;
alter table panda_realty."property_list_notes" add column "shared_with_portal" boolean not null default false;
alter table panda_realty."property_list_notes" add column "shared_with_seller" boolean not null default false;
alter table panda_realty."property_list_notes" add column "viewed_at" timestamp without time zone;
alter table panda_realty."property_list_notes" add column "note_color" text;
alter table panda_realty."property_list_notes" add column "is_important" boolean not null default false;
alter table panda_realty."property_list_notes" add column "portal_message_id" bigint;
alter table panda_realty."property_meetings" add column "share_with_seller" boolean not null default true;
alter table panda_realty."property_meetings" add column "share_with_buyer" boolean not null default true;
alter table panda_realty."property_meetings" add column "shared_description" text;
alter table panda_realty."property_meetings" add column "agent_id" bigint;
alter table panda_realty."property_status" add column "light_mode_color" text;
alter table panda_realty."property_status" add column "dark_mode_color" text;
-- functions again (those that reference tables)
CREATE OR REPLACE FUNCTION panda_realty.assign_trust_transaction_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'panda_realty'
AS $function$
BEGIN
  IF NEW.transaction_number = 0 THEN
    NEW.transaction_number := CASE NEW.transaction_type
      WHEN 'receipt' THEN nextval('panda_realty.trust_receipt_number_seq')
      WHEN 'payment' THEN nextval('panda_realty.trust_payment_number_seq')
      ELSE NULL
    END;
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.audit_capture_row_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'panda_realty'
AS $function$
DECLARE
  v_operation_id uuid;
  v_operation_id_text text;
  v_actor_user_id uuid;
  v_actor_email text;
  v_source text;
  v_request_id uuid;
  v_action text;
  v_before_row jsonb;
  v_after_row jsonb;
  v_primary_key_columns text[] := string_to_array(TG_ARGV[0], ',');
  v_primary_key_column text;
  v_primary_key_value jsonb;
  v_primary_key jsonb;
  v_changed_columns jsonb;
  v_argument_index integer;
BEGIN
  v_operation_id_text := NULLIF(current_setting('panda.audit_operation_id', true), '');
  IF v_operation_id_text IS NULL THEN
    v_operation_id := gen_random_uuid();
    PERFORM set_config('panda.audit_operation_id', v_operation_id::text, true);
  ELSE
    v_operation_id := v_operation_id_text::uuid;
  END IF;

  v_actor_user_id := NULLIF(current_setting('panda.audit_actor_user_id', true), '')::uuid;
  v_actor_email := NULLIF(current_setting('panda.audit_actor_email', true), '');
  v_source := COALESCE(NULLIF(current_setting('panda.audit_source', true), ''), 'unknown');
  v_request_id := NULLIF(current_setting('panda.audit_request_id', true), '')::uuid;
  v_action := COALESCE(
    NULLIF(current_setting('panda.audit_event_action', true), ''),
    lower(TG_OP)
  );
  IF v_action NOT IN ('insert', 'update', 'delete', 'restore') THEN
    RAISE EXCEPTION 'invalid audit event action %', v_action;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_before_row := NULL;
    v_after_row := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_before_row := to_jsonb(OLD);
    v_after_row := to_jsonb(NEW);
  ELSE
    v_before_row := to_jsonb(OLD);
    v_after_row := NULL;
  END IF;

  IF array_length(TG_ARGV, 1) > 1 THEN
    FOR v_argument_index IN array_lower(TG_ARGV, 1) + 1..array_upper(TG_ARGV, 1) LOOP
      v_before_row := v_before_row - TG_ARGV[v_argument_index];
      v_after_row := v_after_row - TG_ARGV[v_argument_index];
    END LOOP;
  END IF;

  v_primary_key := '{}'::jsonb;
  FOREACH v_primary_key_column IN ARRAY v_primary_key_columns LOOP
    v_primary_key_value := COALESCE(v_after_row, v_before_row) -> v_primary_key_column;
    IF v_primary_key_value IS NULL OR v_primary_key_value = 'null'::jsonb THEN
      RAISE EXCEPTION 'audit trigger % on %.% could not find primary key column %',
        TG_NAME, TG_TABLE_SCHEMA, TG_TABLE_NAME, v_primary_key_column;
    END IF;
    v_primary_key := v_primary_key || jsonb_build_object(v_primary_key_column, v_primary_key_value);
  END LOOP;

  SELECT COALESCE(jsonb_agg(changed.key ORDER BY changed.key), '[]'::jsonb)
  INTO v_changed_columns
  FROM (
    SELECT COALESCE(before_value.key, after_value.key) AS key
    FROM jsonb_each(COALESCE(v_before_row, '{}'::jsonb)) AS before_value
    FULL OUTER JOIN jsonb_each(COALESCE(v_after_row, '{}'::jsonb)) AS after_value
      USING (key)
    WHERE before_value.value IS DISTINCT FROM after_value.value
  ) AS changed;

  INSERT INTO panda_realty.audit_operations (
    audit_operation_id,
    actor_user_id,
    actor_email,
    source,
    request_id
  ) VALUES (
    v_operation_id,
    v_actor_user_id,
    v_actor_email,
    v_source,
    v_request_id
  ) ON CONFLICT (audit_operation_id) DO NOTHING;

  INSERT INTO panda_realty.audit_events (
    audit_operation_id,
    table_name,
    primary_key,
    action,
    before_row,
    after_row,
    changed_columns,
    occurred_at
  ) VALUES (
    v_operation_id,
    TG_TABLE_NAME,
    v_primary_key,
    v_action,
    v_before_row,
    v_after_row,
    v_changed_columns,
    clock_timestamp()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.audit_document_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE before_row jsonb; after_row jsonb; item jsonb;
BEGIN
  IF TG_OP<>'INSERT' THEN before_row:=to_jsonb(OLD)-ARRAY['artifact_bytes','attachment_bytes']; END IF;
  IF TG_OP<>'DELETE' THEN after_row:=to_jsonb(NEW)-ARRAY['artifact_bytes','attachment_bytes']; END IF;
  item:=COALESCE(after_row,before_row);
  INSERT INTO panda_realty.property_timeline_changes(property_list_id,attempt_id,event_key,action,changed_by,before_state,after_state)
  VALUES((item->>'property_list_id')::bigint,(item->>'attempt_id')::uuid,item->>'event_key',TG_TABLE_NAME||':'||TG_OP,
    COALESCE(NULLIF(current_setting('panda.audit_actor_user_id',true),''),item->>'changed_by'),before_row,after_row);
  RETURN NULL;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.audit_invoice_artifact_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO panda_realty.property_timeline_changes(property_list_id,attempt_id,event_key,action,changed_by,after_state)
    VALUES(NEW.property_list_id,NEW.attempt_id,NEW.event_key,TG_TABLE_NAME||':'||TG_OP,NEW.changed_by,to_jsonb(NEW)-'pdf_bytes');
  RETURN NULL;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.audit_property_timeline_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE old_row jsonb; new_row jsonb; item jsonb;
BEGIN
  IF TG_OP<>'INSERT' THEN old_row:=to_jsonb(OLD); END IF;
  IF TG_OP<>'DELETE' THEN new_row:=to_jsonb(NEW); END IF;
  item:=COALESCE(new_row,old_row);
  IF EXISTS(SELECT 1 FROM panda_realty.panda_properties WHERE property_list_id=(item->>'property_list_id')::bigint) THEN
    INSERT INTO panda_realty.property_timeline_changes(property_list_id,attempt_id,event_key,action,changed_by,before_state,after_state)
      VALUES((item->>'property_list_id')::bigint,(item->>'attempt_id')::uuid,item->>'event_key',TG_TABLE_NAME||':'||TG_OP,
      CASE WHEN TG_OP='DELETE' THEN NULLIF(current_setting('panda.audit_actor_user_id',true),'') ELSE COALESCE(NULLIF(current_setting('panda.audit_actor_user_id',true),''),item->>'changed_by',item->>'linked_by') END,old_row,new_row);
  END IF;
  RETURN NULL;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.audit_reject_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'panda_realty'
AS $function$
BEGIN
  RAISE EXCEPTION 'panda_realty audit ledger is append-only';
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.audit_timeline_listing_preparation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE old_row jsonb;
BEGIN
  IF TG_OP='UPDATE' THEN old_row:=to_jsonb(OLD); END IF;
  INSERT INTO panda_realty.property_timeline_changes(property_list_id,event_key,action,changed_by,before_state,after_state)
    VALUES(NEW.property_list_id,'listing-preparation-review',TG_TABLE_NAME||':'||TG_OP,
      NULLIF(current_setting('panda.audit_actor_user_id',true),''),old_row,to_jsonb(NEW));
  RETURN NULL;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.capture_property_timeline_attempt()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE p_id bigint; party_id bigint; offer_id bigint; old_accepted boolean := false; new_accepted boolean := false;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_accepted := COALESCE(OLD.is_accepted,false); END IF;
  IF TG_OP <> 'DELETE' THEN new_accepted := COALESCE(NEW.is_accepted,false); END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT property_list_id,entity_id INTO p_id,party_id FROM panda_realty.property_entities WHERE property_entity_id=NEW.property_entity_id;
    offer_id := NEW.buyer_offer_id;
  ELSE
    SELECT property_list_id,entity_id INTO p_id,party_id FROM panda_realty.property_entities WHERE property_entity_id=OLD.property_entity_id;
    offer_id := OLD.buyer_offer_id;
  END IF;
  IF old_accepted AND (NOT new_accepted OR TG_OP='UPDATE' AND (NEW.property_entity_id IS DISTINCT FROM OLD.property_entity_id OR NEW.accepted_property_id IS DISTINCT FROM OLD.accepted_property_id)) THEN
    UPDATE panda_realty.property_timeline_attempts SET ended_at=now(),offer_snapshot=to_jsonb(OLD),
      property_snapshot=(SELECT jsonb_build_object('contract_date',contract_date,'disclosure_date',disclosure_date,'settlement_date',settlement_date,'property_type',property_type,'due_highlight_cleared_at',due_highlight_cleared_at) FROM panda_realty.panda_properties WHERE property_list_id=property_timeline_attempts.property_list_id),
      condition_snapshot=COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM panda_realty.condition_completions c WHERE c.buyer_offer_id=OLD.buyer_offer_id),'[]')
      WHERE buyer_offer_id=OLD.buyer_offer_id AND ended_at IS NULL;
  END IF;
  IF new_accepted AND (NOT old_accepted OR TG_OP='UPDATE' AND (NEW.property_entity_id IS DISTINCT FROM OLD.property_entity_id OR NEW.accepted_property_id IS DISTINCT FROM OLD.accepted_property_id)) AND p_id IS NOT NULL THEN
    INSERT INTO panda_realty.property_timeline_attempts(property_list_id,buyer_offer_id,buyer_entity_id) VALUES(p_id,offer_id,party_id);
    -- The previous attempt retains its snapshot. A newly accepted cycle starts fresh.
    DELETE FROM panda_realty.condition_completions WHERE buyer_offer_id=offer_id;
    UPDATE panda_realty.panda_properties SET due_highlight_cleared_at=NULL WHERE property_list_id=p_id;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.capture_timeline_listing_preparation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE old_completed boolean; new_completed boolean; new_current boolean;
BEGIN
  SELECT lower(btrim(property_status_code))='sold recently my panda' INTO old_completed
    FROM panda_realty.property_status WHERE property_status_id=OLD.property_status_id;
  SELECT lower(btrim(property_status_code))='sold recently my panda',
    NULLIF(property_status_code,'') IS NOT NULL AND pipeline='sellers'
    INTO new_completed,new_current FROM panda_realty.property_status WHERE property_status_id=NEW.property_status_id;
  new_current := COALESCE(new_current,false) AND NOT COALESCE(new_completed,false)
    AND (NOT EXISTS (SELECT 1 FROM panda_realty.property_status ds WHERE ds.property_status_id=NEW.deal_stage_status_id AND COALESCE(ds.property_status_code,'')<>'') OR EXISTS (
      SELECT 1 FROM panda_realty.buyer_offers bo JOIN panda_realty.property_entities pe USING(property_entity_id)
      WHERE pe.property_list_id=NEW.property_list_id AND bo.is_accepted=true
    ));
  IF COALESCE(old_completed,false) AND NOT COALESCE(new_completed,false) THEN
    INSERT INTO panda_realty.property_timeline_listing_state(property_list_id,pending_relist)
      VALUES(NEW.property_list_id,true)
      ON CONFLICT(property_list_id) DO UPDATE SET pending_relist=true,changed_at=now();
  END IF;
  IF new_current THEN
    UPDATE panda_realty.property_timeline_listing_state
      SET listing_id=gen_random_uuid(),pending_relist=false,changed_at=now()
      WHERE property_list_id=NEW.property_list_id AND pending_relist=true;
  END IF;
  RETURN NULL;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.check_buyer_offer_accepted_unique()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'panda_realty'
AS $function$
DECLARE v_property bigint;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.is_accepted
    AND NEW.buyer_offer_id <> OLD.buyer_offer_id THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'buyer_offers_accepted_withdraw_first',
      MESSAGE = 'Withdraw the accepted offer before replacing its identity.';
  END IF;
  IF NEW.is_accepted THEN
    SELECT property_list_id INTO v_property FROM panda_realty.property_entities
      WHERE property_entity_id = NEW.property_entity_id FOR KEY SHARE;
    IF v_property IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        CONSTRAINT = 'buyer_offers_accepted_property_required',
        MESSAGE = 'Save a property before accepting an offer.';
    END IF;
    NEW.accepted_property_id := v_property;
  ELSE
    NEW.accepted_property_id := NULL;
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.deposit_contract_source(kind text, source_id bigint, property_id bigint, buyer_id bigint)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE fingerprint text;
BEGIN
  IF source_id IS NULL THEN RETURN NULL; END IF;
  IF kind='property-file' THEN
    SELECT md5(to_jsonb(f)::text) INTO fingerprint FROM panda_realty.property_list_files f
      WHERE f.property_list_file_id=source_id AND f.property_list_id=property_id AND f.hidden_at IS NULL;
  ELSIF kind='entity-file' THEN
    SELECT md5(to_jsonb(f)::text) INTO fingerprint FROM panda_realty.property_entity_files f
      JOIN panda_realty.property_entities pe USING(property_entity_id)
      WHERE f.property_entity_file_id=source_id AND pe.property_list_id=property_id AND pe.entity_id=buyer_id AND f.hidden_at IS NULL;
  END IF;
  RETURN fingerprint;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.guard_accepted_buyer_identity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.entity_id IS DISTINCT FROM OLD.entity_id THEN
    PERFORM 1 FROM panda_realty.panda_properties WHERE property_list_id=OLD.property_list_id FOR NO KEY UPDATE;
    IF EXISTS(SELECT 1 FROM panda_realty.buyer_offers WHERE property_entity_id=OLD.property_entity_id AND is_accepted=true) THEN
      RAISE EXCEPTION 'Withdraw the accepted offer before changing its buyer identity'
        USING ERRCODE='23514', CONSTRAINT='property_entities_accepted_identity_withdraw_first';
    END IF;
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.guard_accepted_offer_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'panda_realty'
AS $function$
BEGIN
  IF OLD.is_accepted THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'buyer_offers_accepted_withdraw_first',
      MESSAGE = 'Withdraw the accepted offer before deleting it or its buyer/property link.';
  END IF;
  RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.guard_accepted_property_link_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'panda_realty'
AS $function$
DECLARE v_destination bigint;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_destination := NEW.property_list_id;
    IF NEW.property_list_id IS NOT DISTINCT FROM OLD.property_list_id
      AND NEW.property_entity_id = OLD.property_entity_id THEN RETURN NEW; END IF;
  END IF;
  -- Explicit moves lock both properties in ascending order. NO KEY UPDATE
  -- remains compatible with FK KEY SHARE held by newly inserted buyer links.
  PERFORM property_list_id FROM panda_realty.panda_properties
    WHERE property_list_id IN (OLD.property_list_id, v_destination)
    ORDER BY property_list_id FOR NO KEY UPDATE;
  IF (TG_OP = 'DELETE' OR v_destination IS NULL OR NEW.property_entity_id <> OLD.property_entity_id)
    AND EXISTS (SELECT 1 FROM panda_realty.buyer_offers
      WHERE property_entity_id = OLD.property_entity_id AND is_accepted) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'buyer_offers_accepted_withdraw_first',
      MESSAGE = 'Withdraw the accepted offer before deleting or detaching its buyer/property link.';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  -- The composite FK cascades the derived key on a saved-property move. The
  -- immediate unique constraint rejects any destination with another acceptance.
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.guard_document_delivery_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Retained document delivery records cannot be deleted' USING ERRCODE='23514'; END IF;
  IF TG_TABLE_NAME IN ('property_document_preparations','property_document_acknowledgements') OR
    (to_jsonb(NEW)-ARRAY['status','message_id','thread_id','error','changed_by','updated_at']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['status','message_id','thread_id','error','changed_by','updated_at']) THEN
    RAISE EXCEPTION 'Original document content and scope are immutable' USING ERRCODE='23514';
  END IF;
  IF OLD.status IN ('sent','failed') THEN RAISE EXCEPTION 'Terminal delivery outcomes are immutable' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.guard_finance_due_identity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Retain finance due history; cancel the item instead' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' AND ((NEW.property_list_id,NEW.attempt_id,NEW.listing_id,NEW.target_kind,NEW.target_id)
    IS DISTINCT FROM (OLD.property_list_id,OLD.attempt_id,OLD.listing_id,OLD.target_kind,OLD.target_id)
    OR NEW.revision<>OLD.revision+1) THEN
    RAISE EXCEPTION 'Finance due identity is immutable and revisions must advance once' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.invalidate_deposit_contract_review()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.contract_date IS DISTINCT FROM OLD.contract_date THEN
    UPDATE panda_realty.property_deposit_contract_reviews SET confirmed_at=NULL,revision=revision+1,
      changed_by=COALESCE(NULLIF(current_setting('panda.audit_actor_user_id',true),''),'contract-source-change')
      WHERE property_list_id=NEW.property_list_id AND confirmed_at IS NOT NULL
      AND attempt_id IN (SELECT attempt_id FROM panda_realty.property_timeline_attempts WHERE property_list_id=NEW.property_list_id AND ended_at IS NULL);
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.invalidate_deposit_supporting_source()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE item jsonb; kind text; changed_source_id bigint;
BEGIN
  item:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  kind:=CASE WHEN TG_TABLE_NAME='property_list_files' THEN 'property-file' ELSE 'entity-file' END;
  changed_source_id:=CASE WHEN kind='property-file' THEN (item->>'property_list_file_id')::bigint ELSE (item->>'property_entity_file_id')::bigint END;
  IF TG_OP='DELETE' OR to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN
    UPDATE panda_realty.property_deposit_contract_reviews r SET confirmed_at=NULL,revision=revision+1,
      changed_by=COALESCE(NULLIF(current_setting('panda.audit_actor_user_id',true),''),'contract-document-change')
      WHERE r.source_kind=kind AND r.source_id=changed_source_id AND r.confirmed_at IS NOT NULL;
  END IF;
  RETURN NULL;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.invalidate_trust_deposit_context()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF ROW(NEW.property_list_id,NEW.transaction_type,NEW.details,NEW.transaction_date,NEW.counterparty_entity_id,NEW.counterparty_name)
    IS DISTINCT FROM ROW(OLD.property_list_id,OLD.transaction_type,OLD.details,OLD.transaction_date,OLD.counterparty_entity_id,OLD.counterparty_name) THEN
    UPDATE panda_realty.trust_deposit_contexts SET needs_review=true,revision=revision+1,changed_at=now(),
      changed_by=COALESCE(NULLIF(current_setting('panda.audit_actor_user_id',true),''),'receipt-source-change')
      WHERE trust_transaction_id=NEW.trust_transaction_id;
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.panda_street_key(addr text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$
  SELECT panda_realty.panda_street_norm(
    regexp_replace(addr, '^\s*(lot\s+)?(\S*[0-9]\S*)\s+', '', 'i')
  )
$function$;
CREATE OR REPLACE FUNCTION panda_realty.panda_street_norm(s text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
AS $function$
  SELECT btrim(regexp_replace(lower(s), '\s+', ' ', 'g'))
$function$;
CREATE OR REPLACE FUNCTION panda_realty.property_rp_identity(value text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE STRICT
AS $function$
DECLARE parts text[]; entry text; key text; candidate text; identities text[] := '{}'; path_id text;
BEGIN
  parts := regexp_match(btrim(value), '^https?://(?:[^/?#@]*@)?rpp\.(?:rpdata\.com|corelogic\.com\.au)(?::[0-9]+)?([^?#]*)(?:\?([^#]*))?(?:#.*)?$', 'i');
  IF parts IS NULL THEN RETURN NULL; END IF;
  path_id := substring(parts[1] from '^/property/[^/]+/([0-9]+)/?$');
  IF path_id IS NOT NULL THEN identities := array_append(identities,path_id); END IF;
  FOREACH entry IN ARRAY string_to_array(coalesce(parts[2],''),'&') LOOP
    key := panda_realty.property_rp_query_decode(split_part(entry,'=',1));
    IF lower(key)='propertyid' THEN
      candidate := panda_realty.property_rp_query_decode(substr(entry,strpos(entry,'=')+1));
      IF strpos(entry,'=')=0 OR candidate IS NULL OR candidate !~ '^[0-9]+$' THEN RETURN NULL; END IF;
      identities := array_append(identities,candidate);
    END IF;
  END LOOP;
  IF cardinality(identities)=0 THEN RETURN NULL; END IF;
  candidate := NULL;
  FOREACH entry IN ARRAY identities LOOP
    entry := coalesce(nullif(ltrim(entry,'0'),''),'0');
    IF entry='0' OR (candidate IS NOT NULL AND candidate<>entry) THEN RETURN NULL; END IF;
    candidate := entry;
  END LOOP;
  RETURN candidate;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.property_rp_query_decode(value text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE STRICT
AS $function$
DECLARE result bytea := ''::bytea; i int := 1; c text;
BEGIN
  WHILE i <= length(value) LOOP
    c := substr(value,i,1);
    IF c = '%' THEN
      IF substr(value,i+1,2) !~ '^[0-9a-fA-F]{2}$' THEN RETURN NULL; END IF;
      result := result || decode(substr(value,i+1,2),'hex'); i := i+3;
    ELSE
      result := result || convert_to(CASE WHEN c='+' THEN ' ' ELSE c END,'UTF8'); i := i+1;
    END IF;
  END LOOP;
  RETURN convert_from(result,'UTF8');
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.reject_accepted_property_truncate()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'panda_realty'
AS $function$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514',
    CONSTRAINT = 'buyer_offers_accepted_withdraw_first',
    MESSAGE = 'Bulk truncation is disabled. Withdraw accepted offers and use explicit row deletion.';
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.reject_invoice_history_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN RAISE EXCEPTION 'Financial version and operation history is append only' USING ERRCODE='23514'; END $function$;
CREATE OR REPLACE FUNCTION panda_realty.set_updated_at_on_buyer_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.buyer_pipeline_status_id IS DISTINCT FROM OLD.buyer_pipeline_status_id
     AND NEW.updated_at IS NULL
  THEN
    NEW.updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_buyer_offers()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.buyer_offer_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_buyer_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.buyer_status_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_contact_categories()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.contact_category_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_entities()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.entity_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_entity_categories()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.entity_category_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_entity_members()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.entity_member_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_event_timelines()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.event_timeline_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_events()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.event_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_lead_sources()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.lead_source_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_panda_properties()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.property_list_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_property_entities()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.property_entity_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_property_entity_files()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.property_entity_file_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_property_entity_notes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.entity_note_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_property_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.property_status_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_records()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Retrieve the primary key field name from the configuration table
    DECLARE
        vpk_field TEXT;
        old_record JSONB;
    BEGIN
        old_record := row_to_jsonb(OLD.*);
        SELECT pk_field INTO vpk_field FROM panda_realty.table_definitions WHERE table_name = TG_TABLE_NAME;
        EXECUTE format('INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (%L, OLD.%I, %L)', TG_TABLE_NAME, vpk_field, old_record);
        RETURN OLD;
    END;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.track_deleted_suburbs()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.suburb, row_to_json(OLD.*) );
    RETURN OLD;
END;
$function$;
CREATE OR REPLACE FUNCTION panda_realty.trust_deposit_context(transaction_id bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  SELECT jsonb_build_object('attemptId',c.attempt_id,'beneficiaryId',c.beneficiary_entity_id::float8,
    'method',c.method,'revision',c.revision,'reason',c.reason,'valid',
    NOT c.needs_review AND c.method<>'unassigned' AND r.confirmed_at IS NOT NULL AND r.revision=c.review_revision
    AND r.source_fingerprint=panda_realty.deposit_contract_source(r.source_kind,r.source_id,c.property_list_id,c.beneficiary_entity_id)
    AND r.source_date=CASE WHEN a.ended_at IS NULL THEN p.contract_date::date ELSE (a.property_snapshot->>'contract_date')::date END AND a.property_list_id=t.property_list_id
    AND a.buyer_entity_id=c.beneficiary_entity_id AND t.transaction_type='receipt' AND t.amount>0
    AND t.transaction_date<= (now() AT TIME ZONE 'Australia/Brisbane')::date
    AND lower(btrim(t.details))=CASE c.event_key WHEN 'initial-deposit-received' THEN 'initial deposit' ELSE 'balance deposit' END
    AND EXISTS(SELECT 1 FROM panda_realty.property_entities pe WHERE pe.property_list_id=t.property_list_id AND pe.entity_id=t.counterparty_entity_id)
    AND (c.method='review' OR (t.transaction_date>=r.source_date AND NOT EXISTS(
      SELECT 1 FROM panda_realty.property_timeline_attempts prior WHERE prior.property_list_id=c.property_list_id AND prior.attempt_id<>c.attempt_id AND prior.started_at<=a.started_at))))
  FROM panda_realty.trust_deposit_contexts c JOIN panda_realty.trust_transactions t USING(trust_transaction_id)
  JOIN panda_realty.property_timeline_attempts a ON a.attempt_id=c.attempt_id
  JOIN panda_realty.panda_properties p ON p.property_list_id=c.property_list_id
  LEFT JOIN panda_realty.property_deposit_contract_reviews r ON r.attempt_id=c.attempt_id
  WHERE c.trust_transaction_id=transaction_id
$function$;
CREATE OR REPLACE FUNCTION panda_realty.validate_deposit_metadata_scope()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM panda_realty.property_timeline_attempts a
    WHERE a.attempt_id=NEW.attempt_id AND a.property_list_id=NEW.property_list_id
      AND (a.ended_at IS NULL OR (TG_OP='UPDATE' AND OLD.attempt_id=NEW.attempt_id)))
    THEN RAISE EXCEPTION 'Deposit context belongs to another or ended sale' USING ERRCODE='23514'; END IF;
  IF TG_TABLE_NAME='trust_deposit_contexts' THEN
    IF NOT EXISTS (SELECT 1 FROM panda_realty.trust_transactions t JOIN panda_realty.property_timeline_attempts a ON a.attempt_id=NEW.attempt_id
      WHERE t.trust_transaction_id=NEW.trust_transaction_id AND t.property_list_id=NEW.property_list_id AND a.buyer_entity_id=NEW.beneficiary_entity_id)
      THEN RAISE EXCEPTION 'Deposit payer context has a different property or beneficiary' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.validate_document_delivery_scope()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_TABLE_NAME='property_document_acknowledgements' THEN
    IF NOT EXISTS(SELECT 1 FROM panda_realty.property_document_sends s WHERE s.send_id=NEW.send_id AND s.property_list_id=NEW.property_list_id
      AND s.status='sent' AND s.attempt_id IS NOT DISTINCT FROM NEW.attempt_id AND s.listing_id IS NOT DISTINCT FROM NEW.listing_id)
      THEN RAISE EXCEPTION 'Acknowledgement original scope differs' USING ERRCODE='23514'; END IF;
  ELSIF TG_TABLE_NAME='property_document_preparations' THEN
    IF NOT EXISTS(SELECT 1 FROM panda_realty.trust_transactions t WHERE t.trust_transaction_id=NEW.receipt_id AND t.property_list_id=NEW.property_list_id)
      THEN RAISE EXCEPTION 'Prepared document receipt scope differs' USING ERRCODE='23514'; END IF;
  ELSIF NEW.kind='payment_request' THEN
    IF NOT EXISTS(SELECT 1 FROM panda_realty.property_payment_requests r WHERE r.request_id=NEW.request_id AND r.property_list_id=NEW.property_list_id
      AND r.attempt_id IS NOT DISTINCT FROM NEW.attempt_id AND r.listing_id IS NOT DISTINCT FROM NEW.listing_id)
      THEN RAISE EXCEPTION 'Document request scope differs' USING ERRCODE='23514'; END IF;
  ELSIF NEW.kind='solicitor_letter' THEN
    IF NOT EXISTS(SELECT 1 FROM panda_realty.property_document_preparations p WHERE p.preparation_id=NEW.preparation_id AND p.property_list_id=NEW.property_list_id
      AND p.attempt_id IS NOT DISTINCT FROM NEW.attempt_id AND p.listing_id IS NOT DISTINCT FROM NEW.listing_id)
      THEN RAISE EXCEPTION 'Prepared document scope differs' USING ERRCODE='23514'; END IF;
  ELSIF NEW.kind='issued_invoice' THEN
    IF NOT EXISTS(SELECT 1 FROM panda_realty.property_invoice_issues i JOIN panda_realty.property_invoice_artifacts a USING(issue_id)
      WHERE i.issue_id=(NEW.context_snapshot->>'issueId')::uuid AND a.artifact_id=(NEW.context_snapshot->>'artifactId')::uuid
      AND a.kind='original' AND i.property_list_id=NEW.property_list_id AND a.property_list_id=NEW.property_list_id
      AND i.attempt_id IS NOT DISTINCT FROM NEW.attempt_id AND i.listing_id IS NOT DISTINCT FROM NEW.listing_id
      AND NOT EXISTS(SELECT 1 FROM panda_realty.property_invoice_issue_events e WHERE e.issue_id=i.issue_id))
      THEN RAISE EXCEPTION 'Issued original document scope differs' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.validate_invoice_document_scope()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE original panda_realty.property_invoice_issues; draft panda_realty.property_invoice_draft_versions;
BEGIN
  IF TG_TABLE_NAME='property_invoice_file_references' THEN
    IF NOT EXISTS(SELECT 1 FROM panda_realty.property_invoice_issues i JOIN panda_realty.property_list_files f ON f.property_list_id=i.property_list_id WHERE i.issue_id=NEW.issue_id AND f.property_list_file_id=NEW.file_id)
      THEN RAISE EXCEPTION 'Invoice file reference differs in property' USING ERRCODE='23514'; END IF;
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME IN('property_invoice_issues','property_invoice_artifacts') THEN
    SELECT * INTO draft FROM panda_realty.property_invoice_draft_versions WHERE draft_id=NEW.draft_id AND revision=NEW.draft_revision;
    IF NOT FOUND OR draft.property_list_id<>NEW.property_list_id OR draft.attempt_id<>NEW.attempt_id OR draft.listing_id IS DISTINCT FROM NEW.listing_id
      THEN RAISE EXCEPTION 'Invoice draft scope differs' USING ERRCODE='23514'; END IF;
    IF TG_TABLE_NAME='property_invoice_issues' THEN
      IF draft.operation<>'reviewed' THEN RAISE EXCEPTION 'Invoice source must be reviewed' USING ERRCODE='23514'; END IF;
    END IF;
  END IF;
  IF TG_TABLE_NAME='property_invoice_issues' THEN
    IF NEW.replaces_issue_id IS NULL THEN RETURN NEW; END IF;
    SELECT * INTO original FROM panda_realty.property_invoice_issues WHERE issue_id=NEW.replaces_issue_id;
  ELSE
    IF NEW.issue_id IS NULL THEN RETURN NEW; END IF;
    SELECT * INTO original FROM panda_realty.property_invoice_issues WHERE issue_id=NEW.issue_id;
  END IF;
  IF NOT FOUND OR original.property_list_id<>NEW.property_list_id OR original.attempt_id<>NEW.attempt_id OR original.listing_id IS DISTINCT FROM NEW.listing_id
    THEN RAISE EXCEPTION 'Invoice issue scope differs' USING ERRCODE='23514'; END IF;
  IF TG_TABLE_NAME='property_invoice_artifacts' THEN
    IF original.draft_id<>NEW.draft_id OR original.draft_revision<>NEW.draft_revision
      THEN RAISE EXCEPTION 'Invoice artifact revision differs' USING ERRCODE='23514'; END IF;
  END IF;
  IF TG_TABLE_NAME='property_invoice_issue_events' THEN
    IF NEW.replacement_issue_id IS NOT NULL AND NOT EXISTS(
      SELECT 1 FROM panda_realty.property_invoice_issues i WHERE i.issue_id=NEW.replacement_issue_id AND i.replaces_issue_id=NEW.issue_id)
      THEN RAISE EXCEPTION 'Replacement linkage differs' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.validate_invoice_metadata_scope()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_TABLE_NAME='property_finance_evidence' THEN
    IF NEW.trust_transaction_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM panda_realty.trust_transactions t WHERE t.trust_transaction_id=NEW.trust_transaction_id AND t.property_list_id=NEW.property_list_id)
      THEN RAISE EXCEPTION 'Financial evidence belongs to another property' USING ERRCODE='23514'; END IF;
    IF NEW.file_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM panda_realty.property_list_files f WHERE f.property_list_file_id=NEW.file_id AND f.property_list_id=NEW.property_list_id AND f.hidden_at IS NULL)
      THEN RAISE EXCEPTION 'Financial source file belongs to another property' USING ERRCODE='23514'; END IF;
  ELSIF TG_TABLE_NAME='property_finance_allocations' THEN
    IF NOT EXISTS(SELECT 1 FROM panda_realty.property_finance_evidence e WHERE e.evidence_id=NEW.evidence_id AND e.property_list_id=NEW.property_list_id
      AND e.attempt_id IS NOT DISTINCT FROM NEW.attempt_id AND e.listing_id IS NOT DISTINCT FROM NEW.listing_id)
      THEN RAISE EXCEPTION 'Allocation source scope differs' USING ERRCODE='23514'; END IF;
    IF NEW.expense_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM panda_realty.property_expenses e WHERE e.expense_id=NEW.expense_id AND e.property_list_id=NEW.property_list_id
      AND (e.attempt_id IS NULL OR e.attempt_id=NEW.attempt_id) AND e.listing_id IS NOT DISTINCT FROM NEW.listing_id)
      THEN RAISE EXCEPTION 'Allocation expense scope differs' USING ERRCODE='23514'; END IF;
    IF NEW.paired_allocation_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM panda_realty.property_finance_allocations a WHERE a.allocation_id=NEW.paired_allocation_id AND a.property_list_id=NEW.property_list_id
      AND a.expense_id=NEW.expense_id AND a.attempt_id IS NOT DISTINCT FROM NEW.attempt_id AND a.listing_id IS NOT DISTINCT FROM NEW.listing_id AND a.role='seller_funding' AND NEW.role='agency_funding' AND NOT a.voided)
      THEN RAISE EXCEPTION 'Funding pairing scope differs' USING ERRCODE='23514'; END IF;
  ELSIF TG_TABLE_NAME='property_invoice_draft_versions' THEN
    IF NOT EXISTS(SELECT 1 FROM panda_realty.property_invoice_drafts d WHERE d.draft_id=NEW.draft_id AND d.property_list_id=NEW.property_list_id AND d.attempt_id=NEW.attempt_id AND d.listing_id IS NOT DISTINCT FROM NEW.listing_id)
      THEN RAISE EXCEPTION 'Invoice history scope differs' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.validate_payment_lifecycle_scope()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE parent jsonb; source jsonb;
BEGIN
  IF TG_TABLE_NAME='property_payment_obligations' THEN
    IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Retain payment authority history' USING ERRCODE='23514'; END IF;
    IF TG_OP='INSERT' AND NOT EXISTS(SELECT 1 FROM panda_realty.property_entities pe WHERE pe.property_list_id=NEW.property_list_id AND pe.entity_id=NEW.party_entity_id) THEN
      RAISE EXCEPTION 'Payment authority party belongs to another property' USING ERRCODE='23514'; END IF;
    IF TG_OP='UPDATE' AND (to_jsonb(NEW)-ARRAY['current_revision','changed_by','updated_at']) IS DISTINCT FROM
      (to_jsonb(OLD)-ARRAY['current_revision','changed_by','updated_at']) THEN
      RAISE EXCEPTION 'Payment obligation identity and original scope are immutable' USING ERRCODE='23514'; END IF;
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME IN ('property_payment_obligation_versions','property_payment_attributions') THEN
    SELECT to_jsonb(o) INTO parent FROM panda_realty.property_payment_obligations o WHERE o.obligation_id=NEW.obligation_id;
  ELSIF TG_TABLE_NAME='property_buyer_receipt_consumptions' THEN
    SELECT to_jsonb(e) INTO parent FROM panda_realty.property_finance_evidence e WHERE e.evidence_id=NEW.payment_evidence_id;
    IF NOT EXISTS(SELECT 1 FROM panda_realty.trust_transactions t WHERE t.trust_transaction_id=NEW.receipt_transaction_id
      AND t.property_list_id=NEW.property_list_id AND t.transaction_type='receipt') THEN
      RAISE EXCEPTION 'Buyer receipt scope or owner differs' USING ERRCODE='23514'; END IF;
    IF NOT EXISTS(SELECT 1 FROM panda_realty.property_timeline_attempts a WHERE a.attempt_id=NEW.attempt_id
      AND a.property_list_id=NEW.property_list_id AND a.buyer_entity_id=NEW.buyer_entity_id) THEN
      RAISE EXCEPTION 'Receipt retains its original buyer and sale' USING ERRCODE='23514'; END IF;
    IF NEW.kind='reversal' AND NOT EXISTS(SELECT 1 FROM panda_realty.property_buyer_receipt_consumptions c WHERE c.consumption_id=NEW.reverses_id
      AND c.kind='consumption' AND c.receipt_transaction_id=NEW.receipt_transaction_id AND c.buyer_entity_id=NEW.buyer_entity_id
      AND c.attempt_id=NEW.attempt_id AND c.property_list_id=NEW.property_list_id AND c.listing_id IS NOT DISTINCT FROM NEW.listing_id
      AND c.payment_evidence_id<>NEW.payment_evidence_id) THEN
      RAISE EXCEPTION 'Consumption reversal must retain its original receipt and buyer' USING ERRCODE='23514'; END IF;
  ELSE
    IF NEW.attribution_id IS NOT NULL THEN
      SELECT to_jsonb(a) INTO parent FROM panda_realty.property_payment_attributions a WHERE a.attribution_id=NEW.attribution_id;
    ELSE
      SELECT to_jsonb(c) INTO parent FROM panda_realty.property_buyer_receipt_consumptions c WHERE c.consumption_id=NEW.consumption_id;
    END IF;
  END IF;
  IF parent IS NULL OR parent->>'property_list_id' IS DISTINCT FROM NEW.property_list_id::text OR
    parent->>'attempt_id' IS DISTINCT FROM NEW.attempt_id::text OR parent->>'listing_id' IS DISTINCT FROM NEW.listing_id::text THEN
    RAISE EXCEPTION 'Payment lifecycle scope differs' USING ERRCODE='23514'; END IF;
  IF TG_TABLE_NAME='property_payment_attributions' THEN
    SELECT to_jsonb(e) INTO source FROM panda_realty.property_finance_evidence e WHERE e.evidence_id=NEW.evidence_id;
    IF source IS NULL OR source->>'property_list_id' IS DISTINCT FROM NEW.property_list_id::text OR
      source->>'attempt_id' IS DISTINCT FROM NEW.attempt_id::text OR source->>'listing_id' IS DISTINCT FROM NEW.listing_id::text THEN
      RAISE EXCEPTION 'Payment evidence scope differs' USING ERRCODE='23514'; END IF;
    IF NEW.kind='payment' AND NOT EXISTS(SELECT 1 FROM panda_realty.property_finance_allocations a WHERE a.allocation_id=NEW.allocation_id
      AND a.evidence_id=NEW.evidence_id AND a.property_list_id=NEW.property_list_id AND a.attempt_id=NEW.attempt_id
      AND a.listing_id IS NOT DISTINCT FROM NEW.listing_id AND a.amount=NEW.amount AND NOT a.voided
      AND a.role=CASE WHEN parent->>'purpose'='commission' THEN 'commission_payment' ELSE 'seller_proceeds_payment' END) THEN
      RAISE EXCEPTION 'Actual attribution requires the exact existing allocation' USING ERRCODE='23514'; END IF;
    IF NEW.kind='reversal' AND NOT EXISTS(SELECT 1 FROM panda_realty.property_payment_attributions a WHERE a.attribution_id=NEW.reverses_id
      AND a.kind='payment' AND a.obligation_id=NEW.obligation_id AND a.leg=NEW.leg AND a.evidence_id<>NEW.evidence_id) THEN
      RAISE EXCEPTION 'Reversal must retain original obligation and payment leg' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.validate_property_timeline_scope()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.attempt_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM panda_realty.property_timeline_attempts a WHERE a.attempt_id=NEW.attempt_id AND a.property_list_id=NEW.property_list_id AND a.ended_at IS NULL
  ) THEN RAISE EXCEPTION 'Timeline sale attempt is not current for this property' USING ERRCODE='23514'; END IF;
  IF TG_TABLE_NAME='property_timeline_evidence' THEN
    IF NOT EXISTS (SELECT 1 FROM panda_realty.trust_transactions t WHERE t.trust_transaction_id=NEW.trust_transaction_id AND t.property_list_id=NEW.property_list_id)
    THEN RAISE EXCEPTION 'Trust evidence belongs to another property' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION panda_realty.validate_timeline_preparation_receipt()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM panda_realty.trust_transactions t WHERE t.trust_transaction_id=NEW.trust_transaction_id
    AND t.property_list_id=NEW.property_list_id AND t.transaction_type='receipt'
    AND NEW.event_key=CASE lower(trim(t.details)) WHEN 'initial deposit' THEN 'initial-receipt-sent' WHEN 'balance deposit' THEN 'balance-receipt-sent' END)
  THEN RAISE EXCEPTION 'Preparation receipt scope does not match' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $function$;
-- constraints
do $$ begin alter table panda_realty."audit_events" add constraint "audit_events_action_check" CHECK ((action = ANY (ARRAY['insert'::text, 'update'::text, 'delete'::text, 'restore'::text, 'legacy-delete'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."audit_operations" add constraint "audit_operations_source_check" CHECK ((source = ANY (ARRAY['admin'::text, 'portal'::text, 'import'::text, 'system'::text, 'unknown'::text, 'legacy'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."booking_response_slots" add constraint "booking_response_slots_booking_response_id_slot_id_key" UNIQUE (booking_response_id, slot_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."booking_responses" add constraint "booking_responses_request_party_unique" UNIQUE (booking_request_id, party); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."buyer_offers" add constraint "buyer_offers_accepted_property_required" CHECK ((is_accepted = (accepted_property_id IS NOT NULL))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."buyer_offers" add constraint "buyer_offers_accepted_property_unique" UNIQUE (accepted_property_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."buyer_requirement" add constraint "buyer_requirement_requirement_key" UNIQUE (requirement); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."buyer_status" add constraint "buyer_status_buyer_status_key" UNIQUE (buyer_status); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."buyer_status" add constraint "buyer_status_slug_key" UNIQUE (slug); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."condition_delivery_attempts" add constraint "condition_delivery_attempts_channel_check" CHECK ((channel = ANY (ARRAY['email'::text, 'sms'::text, 'portal'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."condition_delivery_attempts" add constraint "condition_delivery_attempts_outcome_check" CHECK ((outcome = ANY (ARRAY['pending'::text, 'accepted'::text, 'delivered'::text, 'failed'::text, 'bounced'::text, 'partial'::text, 'unknown'::text, 'posted'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."condition_delivery_attempts" add constraint "condition_delivery_attempts_total_parts_check" CHECK (((total_parts >= 1) AND (total_parts <= 100))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."contact_categories" add constraint "contact_categories_contact_category_name_key" UNIQUE (contact_category_name); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."contact_categories" add constraint "contact_categories_slug_key" UNIQUE (slug); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."entity_buyer_statuses" add constraint "entity_buyer_statuses_entity_id_buyer_status_id_key" UNIQUE (entity_id, buyer_status_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."entity_categories" add constraint "entity_categories_entity_category_name_key" UNIQUE (entity_category_name); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."entity_categories" add constraint "entity_categories_slug_key" UNIQUE (slug); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."invoice_document_profiles" add constraint "invoice_document_profiles_profile_check" CHECK ((jsonb_typeof(profile) = 'object'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."invoice_document_profiles" add constraint "invoice_document_profiles_revision_check" CHECK ((revision > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."lead_imports" add constraint "lead_imports_source_email_advertisement_id_key" UNIQUE (source_email, advertisement_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."lead_sources" add constraint "lead_sources_lead_source_key" UNIQUE (lead_source); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."lead_sources" add constraint "lead_sources_slug_key" UNIQUE (slug); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."offer_form_tokens" add constraint "offer_form_tokens_token_key" UNIQUE (token); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."panda_address_type_conversions" add constraint "panda_address_type_conversions_address_text_unique" UNIQUE (address_text); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."panda_properties" add constraint "panda_properties_open_in_rpp_unique" UNIQUE (open_in_rpp); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."panda_property_types" add constraint "panda_property_types_label_key" UNIQUE (label); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."panda_suburbs" add constraint "panda_suburbs_suburb_state_unique" UNIQUE (suburb, state); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."portal_file_sign_requests" add constraint "portal_file_sign_requests_signature_status_check" CHECK ((signature_status = ANY (ARRAY['pending'::text, 'signed'::text, 'cancelled'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."portal_messages" add constraint "portal_messages_sender_role_check" CHECK ((sender_role = ANY (ARRAY['agent'::text, 'client'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."portal_tokens" add constraint "portal_tokens_token_key" UNIQUE (token); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_buyer_receipt_consumptions" add constraint "property_buyer_receipt_consumptions_amount_check" CHECK ((amount > (0)::numeric)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_buyer_receipt_consumptions" add constraint "property_buyer_receipt_consumptions_authority_revision_check" CHECK ((authority_revision ~ '^[a-f0-9]{64}$'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_buyer_receipt_consumptions" add constraint "property_buyer_receipt_consumptions_check" CHECK (((kind = 'consumption'::text) = (reverses_id IS NULL))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_buyer_receipt_consumptions" add constraint "property_buyer_receipt_consumptions_kind_check" CHECK ((kind = ANY (ARRAY['consumption'::text, 'reversal'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_buyer_receipt_consumptions" add constraint "property_buyer_receipt_consumptions_payment_revision_check" CHECK ((payment_revision ~ '^[a-f0-9]{64}$'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_buyer_receipt_consumptions" add constraint "property_buyer_receipt_consumptions_reason_check" CHECK ((length(TRIM(BOTH FROM reason)) >= 5)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_buyer_receipt_consumptions" add constraint "property_buyer_receipt_consumptions_receipt_revision_check" CHECK ((receipt_revision ~ '^[a-f0-9]{64}$'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_deposit_contract_reviews" add constraint "property_deposit_contract_reviews_event_key_check" CHECK ((event_key = 'deposit-contract-review'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_deposit_contract_reviews" add constraint "property_deposit_contract_reviews_revision_check" CHECK ((revision > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_deposit_contract_reviews" add constraint "property_deposit_contract_reviews_source_id_check" CHECK ((source_id > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_deposit_contract_reviews" add constraint "property_deposit_contract_reviews_source_kind_check" CHECK ((source_kind = ANY (ARRAY['property-file'::text, 'entity-file'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_deposit_contract_reviews" add constraint "property_deposit_contract_reviews_source_reference_check" CHECK (((length(btrim(source_reference)) >= 5) AND (length(btrim(source_reference)) <= 2000))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_acknowledgements" add constraint "document_acknowledgement_nonce" UNIQUE (property_list_id, request_nonce); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_acknowledgements" add constraint "property_document_acknowledgements_note_check" CHECK (((length(btrim(note)) >= 1) AND (length(btrim(note)) <= 2000))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_acknowledgements" add constraint "property_document_acknowledgements_request_revision_check" CHECK ((request_revision ~ '^[a-f0-9]{64}$'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_preparations" add constraint "property_document_preparations_check" CHECK ((octet_length(artifact_bytes) = size)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_preparations" add constraint "property_document_preparations_digest_check" CHECK ((digest ~ '^[a-f0-9]{64}$'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_preparations" add constraint "property_document_preparations_size_check" CHECK (((size >= 1) AND (size <= 10485760))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_preparations" add constraint "property_document_preparations_source_revision_check" CHECK ((source_revision ~ '^[a-f0-9]{64}$'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_sends" add constraint "property_document_sends_check" CHECK (((status <> 'sent'::text) OR ((message_id IS NOT NULL) AND (thread_id IS NOT NULL)))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_sends" add constraint "property_document_sends_check1" CHECK (((kind = 'payment_request'::text) = (request_id IS NOT NULL))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_sends" add constraint "property_document_sends_check2" CHECK (((kind = 'solicitor_letter'::text) = (preparation_id IS NOT NULL))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_sends" add constraint "property_document_sends_content_revision_check" CHECK ((content_revision ~ '^[a-f0-9]{64}$'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_sends" add constraint "property_document_sends_kind_check" CHECK ((kind = ANY (ARRAY['payment_request'::text, 'solicitor_letter'::text, 'issued_invoice'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_sends" add constraint "property_document_sends_rfc_message_id_key" UNIQUE (rfc_message_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_sends" add constraint "property_document_sends_status_check" CHECK ((status = ANY (ARRAY['sending'::text, 'sent'::text, 'failed'::text, 'unknown'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_entities" add constraint "property_entities_accepted_property_pair" UNIQUE (property_entity_id, property_list_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_expense_payments" add constraint "property_expense_payments_event_key_check" CHECK ((event_key = 'financial-expense'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_expense_payments" add constraint "property_expense_payments_source_revision_check" CHECK ((source_revision ~ '^[0-9a-f]{64}$'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_expense_payments" add constraint "property_expense_payments_trust_transaction_id_key" UNIQUE (trust_transaction_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_expenses" add constraint "expense_financial_terms_v1" CHECK (((financial_terms IS NULL) OR ((jsonb_typeof(financial_terms) = 'object'::text) AND ((financial_terms ->> 'schemaVersion'::text) = '1'::text)))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_expenses" add constraint "property_expenses_account_context_check" CHECK ((account_context = ANY (ARRAY['trust'::text, 'outside-trust'::text, 'unconfirmed'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_expenses" add constraint "property_expenses_amount_check" CHECK ((amount >= (0)::numeric)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_expenses" add constraint "property_expenses_cost_kind_check" CHECK ((cost_kind = ANY (ARRAY['quote'::text, 'incurred'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_expenses" add constraint "property_expenses_description_check" CHECK (((length(TRIM(BOTH FROM description)) >= 1) AND (length(TRIM(BOTH FROM description)) <= 500))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_expenses" add constraint "property_expenses_event_key_check" CHECK ((event_key = 'financial-expense'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_expenses" add constraint "property_expenses_notes_check" CHECK ((length(notes) <= 3000)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_expenses" add constraint "property_expenses_revision_check" CHECK ((revision > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_allocations" add constraint "property_finance_allocations_amount_check" CHECK ((amount > (0)::numeric)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_allocations" add constraint "property_finance_allocations_check" CHECK (((role = ANY (ARRAY['seller_funding'::text, 'agency_funding'::text, 'supplier_payment'::text])) = (expense_id IS NOT NULL))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_allocations" add constraint "property_finance_allocations_check1" CHECK (((role <> ALL (ARRAY['commission_payment'::text, 'seller_proceeds_payment'::text])) OR (attempt_id IS NOT NULL))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_allocations" add constraint "property_finance_allocations_revision_check" CHECK ((revision > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_allocations" add constraint "property_finance_allocations_role_check" CHECK ((role = ANY (ARRAY['seller_funding'::text, 'agency_funding'::text, 'supplier_payment'::text, 'commission_payment'::text, 'seller_proceeds_payment'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_allocations" add constraint "property_finance_allocations_source_revision_check" CHECK ((source_revision ~ '^[a-f0-9]{64}$'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_due_work" add constraint "property_finance_due_work_check" CHECK (((due_date IS NULL) = (owner_agent_id IS NULL))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_due_work" add constraint "property_finance_due_work_property_list_id_target_kind_targ_key" UNIQUE (property_list_id, target_kind, target_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_due_work" add constraint "property_finance_due_work_revision_check" CHECK ((revision > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_due_work" add constraint "property_finance_due_work_source_revision_check" CHECK ((source_revision ~ '^[a-f0-9]{64}$'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_due_work" add constraint "property_finance_due_work_target_kind_check" CHECK ((target_kind = ANY (ARRAY['request'::text, 'expense'::text, 'invoice_draft'::text, 'invoice_issue'::text, 'obligation'::text, 'delivery'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_due_work" add constraint "property_finance_due_work_title_check" CHECK (((length(title) >= 1) AND (length(title) <= 1000))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_evidence" add constraint "property_finance_evidence_amount_check" CHECK ((amount >= (0)::numeric)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_evidence" add constraint "property_finance_evidence_check" CHECK ((((source_kind = 'trust'::text) AND (source_transaction_id IS NOT NULL) AND (direction = ANY (ARRAY['receipt'::text, 'payment'::text]))) OR ((source_kind = 'external_document'::text) AND (external_identity_key IS NOT NULL) AND (amount IS NOT NULL) AND (direction = ANY (ARRAY['receipt'::text, 'payment'::text])) AND (verification <> 'client_reported'::text)) OR ((source_kind = 'client_statement'::text) AND (amount IS NULL) AND (direction = 'statement'::text) AND (verification = 'client_reported'::text) AND (trust_transaction_id IS NULL) AND (file_id IS NULL)))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_evidence" add constraint "property_finance_evidence_currency_check" CHECK ((currency = 'AUD'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_evidence" add constraint "property_finance_evidence_direction_check" CHECK ((direction = ANY (ARRAY['receipt'::text, 'payment'::text, 'statement'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_evidence" add constraint "property_finance_evidence_external_identity_key_key" UNIQUE (external_identity_key); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_evidence" add constraint "property_finance_evidence_external_provider_key_key" UNIQUE (external_provider_key); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_evidence" add constraint "property_finance_evidence_revision_check" CHECK ((revision > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_evidence" add constraint "property_finance_evidence_source_kind_check" CHECK ((source_kind = ANY (ARRAY['trust'::text, 'external_document'::text, 'client_statement'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_evidence" add constraint "property_finance_evidence_source_revision_check" CHECK ((source_revision ~ '^[a-f0-9]{64}$'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_evidence" add constraint "property_finance_evidence_trust_transaction_id_key" UNIQUE (trust_transaction_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_evidence" add constraint "property_finance_evidence_verification_check" CHECK ((verification = ANY (ARRAY['client_reported'::text, 'document_supported'::text, 'bank_verified'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_operations" add constraint "property_finance_operations_request_digest_check" CHECK ((request_digest ~ '^[a-f0-9]{64}$'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_form_sign_requests" add constraint "property_form_sign_requests_status_check" CHECK ((signature_status = ANY (ARRAY['pending'::text, 'signed'::text, 'cancelled'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_import_job_chunks" add constraint "property_import_job_chunks_run_index_unique" UNIQUE (import_run_id, chunk_index); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_import_staged_rows" add constraint "property_import_staged_rows_import_run_id_source_row_index_key" UNIQUE (import_run_id, source_row_index); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_artifacts" add constraint "property_invoice_artifacts_byte_size_check" CHECK (((byte_size > 0) AND (byte_size <= 10485760))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_artifacts" add constraint "property_invoice_artifacts_check" CHECK ((octet_length(pdf_bytes) = byte_size)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_artifacts" add constraint "property_invoice_artifacts_check1" CHECK (((kind = 'original'::text) = (issue_id IS NOT NULL))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_artifacts" add constraint "property_invoice_artifacts_format_version_check" CHECK ((format_version > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_artifacts" add constraint "property_invoice_artifacts_issue_id_key" UNIQUE (issue_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_artifacts" add constraint "property_invoice_artifacts_kind_check" CHECK ((kind = ANY (ARRAY['draft'::text, 'original'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_artifacts" add constraint "property_invoice_artifacts_sha256_check" CHECK ((sha256 ~ '^[a-f0-9]{64}$'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_draft_versions" add constraint "property_invoice_draft_versions_calculation_version_check" CHECK ((calculation_version > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_draft_versions" add constraint "property_invoice_draft_versions_draft_id_request_nonce_key" UNIQUE (draft_id, request_nonce); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_draft_versions" add constraint "property_invoice_draft_versions_operation_check" CHECK ((operation = ANY (ARRAY['saved'::text, 'reviewed'::text, 'cancelled'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_draft_versions" add constraint "property_invoice_draft_versions_request_digest_check" CHECK ((request_digest ~ '^[a-f0-9]{64}$'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_draft_versions" add constraint "property_invoice_draft_versions_revision_check" CHECK ((revision > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_draft_versions" add constraint "property_invoice_draft_versions_source_revision_check" CHECK ((source_revision ~ '^[a-f0-9]{64}$'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_drafts" add constraint "property_invoice_drafts_current_revision_check" CHECK ((current_revision > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_drafts" add constraint "property_invoice_drafts_property_list_id_attempt_id_listing_key" UNIQUE NULLS NOT DISTINCT (property_list_id, attempt_id, listing_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_issue_events" add constraint "property_invoice_issue_events_check" CHECK (((operation = 'replaced'::text) = (replacement_issue_id IS NOT NULL))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_issue_events" add constraint "property_invoice_issue_events_issue_id_operation_key" UNIQUE (issue_id, operation); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_issue_events" add constraint "property_invoice_issue_events_operation_check" CHECK ((operation = ANY (ARRAY['cancelled'::text, 'replaced'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_issue_events" add constraint "property_invoice_issue_events_property_list_id_request_nonc_key" UNIQUE (property_list_id, request_nonce); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_issue_events" add constraint "property_invoice_issue_events_reason_check" CHECK ((length(btrim(reason)) >= 5)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_issues" add constraint "property_invoice_issues_contact_revision_check" CHECK ((contact_revision ~ '^[a-f0-9]{64}$'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_issues" add constraint "property_invoice_issues_draft_id_draft_revision_key" UNIQUE (draft_id, draft_revision); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_issues" add constraint "property_invoice_issues_invoice_number_key" UNIQUE (invoice_number); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_issues" add constraint "property_invoice_issues_property_list_id_request_nonce_key" UNIQUE (property_list_id, request_nonce); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_issues" add constraint "property_invoice_issues_replaces_issue_id_key" UNIQUE (replaces_issue_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_issues" add constraint "property_invoice_issues_request_digest_check" CHECK ((request_digest ~ '^[a-f0-9]{64}$'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_issues" add constraint "property_invoice_issues_sequence_number_check" CHECK ((sequence_number > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_issues" add constraint "property_invoice_issues_source_revision_check" CHECK ((source_revision ~ '^[a-f0-9]{64}$'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_list_notes" add constraint "property_list_notes_portal_message_id_key" UNIQUE (portal_message_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_attributions" add constraint "property_payment_attributions_allocation_id_key" UNIQUE (allocation_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_attributions" add constraint "property_payment_attributions_amount_check" CHECK ((amount > (0)::numeric)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_attributions" add constraint "property_payment_attributions_check" CHECK ((((kind = 'payment'::text) AND (reverses_id IS NULL) AND (allocation_id IS NOT NULL)) OR ((kind = 'reversal'::text) AND (reverses_id IS NOT NULL) AND (allocation_id IS NULL)))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_attributions" add constraint "property_payment_attributions_kind_check" CHECK ((kind = ANY (ARRAY['payment'::text, 'reversal'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_attributions" add constraint "property_payment_attributions_leg_check" CHECK ((leg = ANY (ARRAY['trust'::text, 'outside'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_attributions" add constraint "property_payment_attributions_reason_check" CHECK ((length(TRIM(BOTH FROM reason)) >= 5)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_attributions" add constraint "property_payment_attributions_source_revision_check" CHECK ((source_revision ~ '^[a-f0-9]{64}$'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_obligation_versions" add constraint "property_payment_obligation_versions_authority_revision_check" CHECK ((authority_revision ~ '^[a-f0-9]{64}$'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_obligation_versions" add constraint "property_payment_obligation_versions_check" CHECK (((trust_amount + outside_amount) > (0)::numeric)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_obligation_versions" add constraint "property_payment_obligation_versions_outside_amount_check" CHECK ((outside_amount >= (0)::numeric)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_obligation_versions" add constraint "property_payment_obligation_versions_reason_check" CHECK ((length(TRIM(BOTH FROM reason)) >= 5)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_obligation_versions" add constraint "property_payment_obligation_versions_revision_check" CHECK ((revision > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_obligation_versions" add constraint "property_payment_obligation_versions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'cancelled'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_obligation_versions" add constraint "property_payment_obligation_versions_trust_amount_check" CHECK ((trust_amount >= (0)::numeric)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_obligations" add constraint "property_payment_obligations_currency_check" CHECK ((currency = 'AUD'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_obligations" add constraint "property_payment_obligations_current_revision_check" CHECK ((current_revision > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_obligations" add constraint "property_payment_obligations_party_name_check" CHECK ((length(TRIM(BOTH FROM party_name)) > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_obligations" add constraint "property_payment_obligations_purpose_check" CHECK ((purpose = ANY (ARRAY['commission'::text, 'seller_proceeds'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_request_sends" add constraint "property_payment_request_sends_check" CHECK (((status <> 'sent'::text) OR (message_id IS NOT NULL))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_request_sends" add constraint "property_payment_request_sends_content_revision_check" CHECK ((content_revision ~ '^[0-9a-f]{64}$'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_request_sends" add constraint "property_payment_request_sends_error_check" CHECK ((length(error) <= 500)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_request_sends" add constraint "property_payment_request_sends_event_key_check" CHECK ((event_key = 'financial-request-send'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_request_sends" add constraint "property_payment_request_sends_rfc_message_id_key" UNIQUE (rfc_message_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_request_sends" add constraint "property_payment_request_sends_status_check" CHECK ((status = ANY (ARRAY['sending'::text, 'sent'::text, 'failed'::text, 'unknown'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_requests" add constraint "payment_request_kind" CHECK (((event_key = 'expense-payment'::text) = (expense_id IS NOT NULL))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_requests" add constraint "property_payment_requests_event_key_check" CHECK ((event_key = ANY (ARRAY['advertising-received'::text, 'initial-deposit-received'::text, 'balance-deposit-received'::text, 'expense-payment'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_requests" add constraint "property_payment_requests_notes_check" CHECK ((length(notes) <= 3000)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_requests" add constraint "property_payment_requests_property_list_id_attempt_id_listi_key" UNIQUE NULLS NOT DISTINCT (property_list_id, attempt_id, listing_id, event_key, expense_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_requests" add constraint "property_payment_requests_revision_check" CHECK ((revision > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_requests" add constraint "property_payment_requests_source_revision_check" CHECK ((source_revision ~ '^[0-9a-f]{64}$'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_reviews" add constraint "property_payment_reviews_check" CHECK (((attribution_id IS NULL) <> (consumption_id IS NULL))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_reviews" add constraint "property_payment_reviews_reason_check" CHECK ((length(TRIM(BOTH FROM reason)) >= 5)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_status" add constraint "property_status_pipeline_check" CHECK (((pipeline = ANY (ARRAY['sellers'::citext, 'buyers'::citext, 'deal'::citext])) OR (pipeline IS NULL))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_status" add constraint "property_status_property_status_code_key" UNIQUE (property_status_code); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_status" add constraint "property_status_slug_key" UNIQUE (slug); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_acknowledgements" add constraint "property_timeline_ack_scope_unique" UNIQUE NULLS NOT DISTINCT (property_list_id, attempt_id, event_key); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_acknowledgements" add constraint "timeline_maintenance_tasks_array" CHECK ((jsonb_typeof(maintenance_tasks) = 'array'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_acknowledgements" add constraint "timeline_optional_property_work" CHECK ((((NOT not_required) AND (maintenance_tasks = '[]'::jsonb)) OR ((attempt_id IS NULL) AND (event_key = ANY (ARRAY['pool'::text, 'repairs'::text])) AND ((event_key = 'repairs'::text) OR (maintenance_tasks = '[]'::jsonb))))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_acknowledgements" add constraint "timeline_preparation_listing_review_scope" CHECK ((((reviewed_listing_id IS NULL) AND (preparation_listing_id IS NULL)) OR ((attempt_id IS NULL) AND (event_key = ANY (ARRAY['pool'::text, 'repairs'::text]))))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_record_links" add constraint "property_timeline_record_link_property_list_id_attempt_id_e_key" UNIQUE NULLS NOT DISTINCT (property_list_id, attempt_id, event_key, record_kind, record_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_record_links" add constraint "property_timeline_record_links_record_id_check" CHECK ((record_id > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_record_links" add constraint "property_timeline_record_links_record_kind_check" CHECK ((record_kind = ANY (ARRAY['property-file'::text, 'entity-file'::text, 'property-note'::text, 'entity-note'::text, 'form-send'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_solicitor_preparations" add constraint "property_timeline_solicitor_preparations_event_key_check" CHECK ((event_key = ANY (ARRAY['initial-receipt-sent'::text, 'balance-receipt-sent'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_solicitor_preparations" add constraint "property_timeline_solicitor_preparations_failure_message_check" CHECK ((length(failure_message) <= 500)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_solicitor_preparations" add constraint "property_timeline_solicitor_preparations_format_version_check" CHECK ((format_version > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_solicitor_preparations" add constraint "property_timeline_solicitor_preparations_revision_check" CHECK ((revision > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_solicitor_preparations" add constraint "property_timeline_solicitor_preparations_source_revision_check" CHECK ((source_revision ~ '^[0-9a-f]{64}$'::text)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_solicitor_preparations" add constraint "property_timeline_solicitor_preparations_status_check" CHECK ((status = ANY (ARRAY['prepared'::text, 'failed'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_solicitor_preparations" add constraint "timeline_preparation_result" CHECK ((((status = 'prepared'::text) AND (prepared_at IS NOT NULL) AND (failure_message IS NULL)) OR ((status = 'failed'::text) AND (prepared_at IS NULL) AND (failure_message IS NOT NULL)))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."public_offer_form_tokens" add constraint "public_offer_form_tokens_property_list_id_unique" UNIQUE (property_list_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."public_offer_form_tokens" add constraint "public_offer_form_tokens_token_key" UNIQUE (token); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."table_definitions" add constraint "table_definitions_table_name_key" UNIQUE (table_name); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_bank_reference_reviews" add constraint "trust_bank_reference_reviews_revision_check" CHECK ((revision > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_bank_reference_reviews" add constraint "trust_bank_reference_reviews_status_check" CHECK ((status = ANY (ARRAY['unreviewed'::text, 'cleared'::text, 'uncleared'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_bank_reference_settings" add constraint "trust_bank_reference_settings_id_check" CHECK ((id = 1)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_bank_reference_settings" add constraint "trust_bank_reference_settings_revision_check" CHECK ((revision > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_deposit_contexts" add constraint "trust_deposit_contexts_check" CHECK (((method <> 'review'::text) OR ((length(btrim(reason)) >= 5) AND (length(btrim(reason)) <= 2000)))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_deposit_contexts" add constraint "trust_deposit_contexts_event_key_check" CHECK ((event_key = ANY (ARRAY['initial-deposit-received'::text, 'balance-deposit-received'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_deposit_contexts" add constraint "trust_deposit_contexts_method_check" CHECK ((method = ANY (ARRAY['automatic'::text, 'unassigned'::text, 'review'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_deposit_contexts" add constraint "trust_deposit_contexts_review_revision_check" CHECK ((review_revision >= 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_deposit_contexts" add constraint "trust_deposit_contexts_revision_check" CHECK ((revision > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_property_sync_runs" add constraint "trust_property_sync_runs_status_check" CHECK ((status = ANY (ARRAY['running'::text, 'completed'::text, 'cancelled'::text, 'failed'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_receipt_settings" add constraint "trust_receipt_settings_singleton_check" CHECK ((trust_receipt_settings_id = 1)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_reconciliation_outstanding_items" add constraint "trust_reconciliation_outstanding_items_amount_check" CHECK ((amount > (0)::numeric)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_reconciliation_outstanding_items" add constraint "trust_reconciliation_outstanding_items_item_type_check" CHECK ((item_type = ANY (ARRAY['deposit'::text, 'cheque'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_reconciliations" add constraint "trust_reconciliations_period_unique" UNIQUE (period); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_reconciliations" add constraint "trust_reconciliations_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_transaction_imports" add constraint "trust_transaction_imports_source_id_check" CHECK ((source_id > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_transaction_imports" add constraint "trust_transaction_imports_source_table_check" CHECK ((source_table = ANY (ARRAY['tblTrustReceipts'::text, 'tblTrustPayments'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_transaction_imports" add constraint "trust_transaction_imports_source_unique" UNIQUE (source_table, source_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_transaction_sync_run_rows" add constraint "trust_transaction_sync_run_rows_source_id_check" CHECK ((source_id > 0)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_transaction_sync_run_rows" add constraint "trust_transaction_sync_run_rows_source_table_check" CHECK ((source_table = ANY (ARRAY['tblTrustReceipts'::text, 'tblTrustPayments'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_transaction_sync_run_rows" add constraint "trust_transaction_sync_run_rows_transaction_type_check" CHECK ((transaction_type = ANY (ARRAY['receipt'::text, 'payment'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_transaction_sync_runs" add constraint "trust_transaction_sync_runs_status_check" CHECK ((status = ANY (ARRAY['running'::text, 'completed'::text, 'cancelled'::text, 'failed'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_transactions" add constraint "trust_transactions_amount_check" CHECK ((amount > (0)::numeric)); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_transactions" add constraint "trust_transactions_transaction_type_check" CHECK ((transaction_type = ANY (ARRAY['receipt'::text, 'payment'::text]))); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_transactions" add constraint "trust_transactions_type_number_unique" UNIQUE (transaction_type, transaction_number) DEFERRABLE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."agent_tasks" add constraint "agent_tasks_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES panda_realty.agents(agent_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."audit_events" add constraint "audit_events_audit_operation_id_fkey" FOREIGN KEY (audit_operation_id) REFERENCES panda_realty.audit_operations(audit_operation_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."booking_requests" add constraint "booking_requests_property_entity_id_fkey" FOREIGN KEY (property_entity_id) REFERENCES panda_realty.property_entities(property_entity_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."booking_requests" add constraint "booking_requests_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."booking_response_slots" add constraint "booking_response_slots_booking_response_id_fkey" FOREIGN KEY (booking_response_id) REFERENCES panda_realty.booking_responses(booking_response_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."booking_response_slots" add constraint "booking_response_slots_slot_id_fkey" FOREIGN KEY (slot_id) REFERENCES panda_realty.booking_slots(booking_slot_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."booking_responses" add constraint "booking_responses_booking_request_id_fkey" FOREIGN KEY (booking_request_id) REFERENCES panda_realty.booking_requests(booking_request_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."booking_slots" add constraint "booking_slots_booking_request_id_fkey" FOREIGN KEY (booking_request_id) REFERENCES panda_realty.booking_requests(booking_request_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."buyer_offers" add constraint "buyer_offers_accepted_link_property_fk" FOREIGN KEY (property_entity_id, accepted_property_id) REFERENCES panda_realty.property_entities(property_entity_id, property_list_id) ON UPDATE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."buyer_offers" add constraint "buyer_offers_accepted_property_fk" FOREIGN KEY (accepted_property_id) REFERENCES panda_realty.panda_properties(property_list_id) ON UPDATE RESTRICT ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."buyer_offers" add constraint "buyer_offers_property_entity_id_fkey" FOREIGN KEY (property_entity_id) REFERENCES panda_realty.property_entities(property_entity_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."buyer_preferred_features" add constraint "buyer_preferred_features_entity_id_fkey" FOREIGN KEY (entity_id) REFERENCES panda_realty.entities(entity_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."buyer_viewed_properties" add constraint "buyer_viewed_properties_entity_id_fkey" FOREIGN KEY (entity_id) REFERENCES panda_realty.entities(entity_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."buyer_viewed_properties" add constraint "buyer_viewed_properties_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."condition_delivery_attempts" add constraint "condition_delivery_attempts_delivery_key_fkey" FOREIGN KEY (delivery_key) REFERENCES panda_realty.condition_reminder_deliveries(delivery_key); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."condition_delivery_events" add constraint "condition_delivery_events_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.condition_delivery_attempts(attempt_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."entities" add constraint "entities_primary_email_member_id_fkey" FOREIGN KEY (primary_email_member_id) REFERENCES panda_realty.entity_members(entity_member_id) ON DELETE SET NULL; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."entities" add constraint "entities_primary_phone_member_id_fkey" FOREIGN KEY (primary_phone_member_id) REFERENCES panda_realty.entity_members(entity_member_id) ON DELETE SET NULL; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."entities" add constraint "fk_contact_categories_contact_category_id" FOREIGN KEY (contact_category_id) REFERENCES panda_realty.contact_categories(contact_category_id) ON UPDATE CASCADE ON DELETE SET NULL; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."entities" add constraint "fk_entity_categories_entity_category_id" FOREIGN KEY (entity_category_id) REFERENCES panda_realty.entity_categories(entity_category_id) ON UPDATE CASCADE ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."entities" add constraint "fk_lead_sources_lead_source_id" FOREIGN KEY (lead_source_id) REFERENCES panda_realty.lead_sources(lead_source_id) ON UPDATE CASCADE ON DELETE SET NULL; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."entity_buyer_statuses" add constraint "entity_buyer_statuses_buyer_status_id_fkey" FOREIGN KEY (buyer_status_id) REFERENCES panda_realty.buyer_status(buyer_status_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."entity_buyer_statuses" add constraint "entity_buyer_statuses_entity_id_fkey" FOREIGN KEY (entity_id) REFERENCES panda_realty.entities(entity_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."entity_members" add constraint "fk_entities_entity_id" FOREIGN KEY (entity_id) REFERENCES panda_realty.entities(entity_id) ON UPDATE CASCADE ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."event_timelines" add constraint "fk_panda_properties_property_list_id" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON UPDATE CASCADE ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."offer_form_submissions" add constraint "offer_form_submissions_offer_form_token_id_fkey" FOREIGN KEY (offer_form_token_id) REFERENCES panda_realty.offer_form_tokens(offer_form_token_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."offer_form_submissions" add constraint "offer_form_submissions_property_entity_id_fkey" FOREIGN KEY (property_entity_id) REFERENCES panda_realty.property_entities(property_entity_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."offer_form_submissions" add constraint "offer_form_submissions_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."offer_form_tokens" add constraint "offer_form_tokens_property_entity_id_fkey" FOREIGN KEY (property_entity_id) REFERENCES panda_realty.property_entities(property_entity_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."offer_form_tokens" add constraint "offer_form_tokens_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."panda_properties" add constraint "fk_property_status_property_status_id" FOREIGN KEY (property_status_id) REFERENCES panda_realty.property_status(property_status_id) ON UPDATE CASCADE ON DELETE SET NULL; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."panda_properties" add constraint "panda_properties_deal_stage_status_id_fkey" FOREIGN KEY (deal_stage_status_id) REFERENCES panda_realty.property_status(property_status_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."portal_file_sign_requests" add constraint "portal_file_sign_requests_portal_token_id_fkey" FOREIGN KEY (portal_token_id) REFERENCES panda_realty.portal_tokens(portal_token_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."portal_link_sends" add constraint "portal_link_sends_portal_token_id_fkey" FOREIGN KEY (portal_token_id) REFERENCES panda_realty.portal_tokens(portal_token_id) ON DELETE SET NULL; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."portal_link_sends" add constraint "portal_link_sends_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."portal_messages" add constraint "portal_messages_portal_token_id_fkey" FOREIGN KEY (portal_token_id) REFERENCES panda_realty.portal_tokens(portal_token_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."portal_tokens" add constraint "portal_tokens_property_entity_id_fkey" FOREIGN KEY (property_entity_id) REFERENCES panda_realty.property_entities(property_entity_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."portal_tokens" add constraint "portal_tokens_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_buyer_receipt_consumptions" add constraint "property_buyer_receipt_consumptions_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_buyer_receipt_consumptions" add constraint "property_buyer_receipt_consumptions_buyer_entity_id_fkey" FOREIGN KEY (buyer_entity_id) REFERENCES panda_realty.entities(entity_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_buyer_receipt_consumptions" add constraint "property_buyer_receipt_consumptions_payment_evidence_id_fkey" FOREIGN KEY (payment_evidence_id) REFERENCES panda_realty.property_finance_evidence(evidence_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_buyer_receipt_consumptions" add constraint "property_buyer_receipt_consumptions_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_buyer_receipt_consumptions" add constraint "property_buyer_receipt_consumptions_receipt_transaction_id_fkey" FOREIGN KEY (receipt_transaction_id) REFERENCES panda_realty.trust_transactions(trust_transaction_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_buyer_receipt_consumptions" add constraint "property_buyer_receipt_consumptions_reverses_id_fkey" FOREIGN KEY (reverses_id) REFERENCES panda_realty.property_buyer_receipt_consumptions(consumption_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_deposit_contract_reviews" add constraint "property_deposit_contract_reviews_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_deposit_contract_reviews" add constraint "property_deposit_contract_reviews_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_acknowledgements" add constraint "property_document_acknowledgements_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_acknowledgements" add constraint "property_document_acknowledgements_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_acknowledgements" add constraint "property_document_acknowledgements_send_id_fkey" FOREIGN KEY (send_id) REFERENCES panda_realty.property_document_sends(send_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_preparations" add constraint "property_document_preparations_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_preparations" add constraint "property_document_preparations_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_preparations" add constraint "property_document_preparations_receipt_id_fkey" FOREIGN KEY (receipt_id) REFERENCES panda_realty.trust_transactions(trust_transaction_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_sends" add constraint "property_document_sends_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_sends" add constraint "property_document_sends_preparation_id_fkey" FOREIGN KEY (preparation_id) REFERENCES panda_realty.property_document_preparations(preparation_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_sends" add constraint "property_document_sends_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_document_sends" add constraint "property_document_sends_request_id_fkey" FOREIGN KEY (request_id) REFERENCES panda_realty.property_payment_requests(request_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_entities" add constraint "fk_entities_entity_id" FOREIGN KEY (entity_id) REFERENCES panda_realty.entities(entity_id) ON UPDATE CASCADE ON DELETE SET NULL; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_entities" add constraint "fk_panda_properties_property_list_id" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON UPDATE CASCADE ON DELETE SET NULL; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_entities" add constraint "property_entities_buyer_pipeline_status_id_fkey" FOREIGN KEY (buyer_pipeline_status_id) REFERENCES panda_realty.property_status(property_status_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_entity_files" add constraint "fk_property_entities_property_entity_id" FOREIGN KEY (property_entity_id) REFERENCES panda_realty.property_entities(property_entity_id) ON UPDATE CASCADE ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_entity_notes" add constraint "property_entity_notes_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES panda_realty.agents(agent_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_entity_notes" add constraint "property_entity_notes_property_entity_id_fkey" FOREIGN KEY (property_entity_id) REFERENCES panda_realty.property_entities(property_entity_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_events" add constraint "property_events_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_expense_payments" add constraint "property_expense_payments_expense_id_fkey" FOREIGN KEY (expense_id) REFERENCES panda_realty.property_expenses(expense_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_expense_payments" add constraint "property_expense_payments_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_expense_payments" add constraint "property_expense_payments_trust_transaction_id_fkey" FOREIGN KEY (trust_transaction_id) REFERENCES panda_realty.trust_transactions(trust_transaction_id) ON DELETE SET NULL; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_expenses" add constraint "property_expenses_approval_file_id_fkey" FOREIGN KEY (approval_file_id) REFERENCES panda_realty.property_list_files(property_list_file_id) ON DELETE SET NULL; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_expenses" add constraint "property_expenses_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_expenses" add constraint "property_expenses_file_id_fkey" FOREIGN KEY (file_id) REFERENCES panda_realty.property_list_files(property_list_file_id) ON DELETE SET NULL; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_expenses" add constraint "property_expenses_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_expenses" add constraint "property_expenses_supplier_entity_id_fkey" FOREIGN KEY (supplier_entity_id) REFERENCES panda_realty.entities(entity_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_allocations" add constraint "property_finance_allocations_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_allocations" add constraint "property_finance_allocations_evidence_id_fkey" FOREIGN KEY (evidence_id) REFERENCES panda_realty.property_finance_evidence(evidence_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_allocations" add constraint "property_finance_allocations_expense_id_fkey" FOREIGN KEY (expense_id) REFERENCES panda_realty.property_expenses(expense_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_allocations" add constraint "property_finance_allocations_paired_allocation_id_fkey" FOREIGN KEY (paired_allocation_id) REFERENCES panda_realty.property_finance_allocations(allocation_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_allocations" add constraint "property_finance_allocations_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_due_work" add constraint "property_finance_due_work_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_due_work" add constraint "property_finance_due_work_owner_agent_id_fkey" FOREIGN KEY (owner_agent_id) REFERENCES panda_realty.agents(agent_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_due_work" add constraint "property_finance_due_work_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_evidence" add constraint "property_finance_evidence_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_evidence" add constraint "property_finance_evidence_file_id_fkey" FOREIGN KEY (file_id) REFERENCES panda_realty.property_list_files(property_list_file_id) ON DELETE SET NULL; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_evidence" add constraint "property_finance_evidence_party_entity_id_fkey" FOREIGN KEY (party_entity_id) REFERENCES panda_realty.entities(entity_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_evidence" add constraint "property_finance_evidence_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_evidence" add constraint "property_finance_evidence_trust_transaction_id_fkey" FOREIGN KEY (trust_transaction_id) REFERENCES panda_realty.trust_transactions(trust_transaction_id) ON DELETE SET NULL; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_operations" add constraint "property_finance_operations_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_finance_operations" add constraint "property_finance_operations_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_form_recipient_prefs" add constraint "property_form_recipient_prefs_property_form_id_fkey" FOREIGN KEY (property_form_id) REFERENCES panda_realty.property_forms(property_form_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_form_recipient_prefs" add constraint "property_form_recipient_prefs_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_form_sends" add constraint "property_form_sends_property_form_id_fkey" FOREIGN KEY (property_form_id) REFERENCES panda_realty.property_forms(property_form_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_form_sends" add constraint "property_form_sends_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_form_sign_requests" add constraint "property_form_sign_requests_property_form_send_id_fkey" FOREIGN KEY (property_form_send_id) REFERENCES panda_realty.property_form_sends(property_form_send_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_form_sign_requests" add constraint "property_form_sign_requests_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_import_action_rows" add constraint "property_import_action_rows_import_action_id_fkey" FOREIGN KEY (import_action_id) REFERENCES panda_realty.property_import_actions(import_action_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_import_action_rows" add constraint "property_import_action_rows_import_row_id_fkey" FOREIGN KEY (import_row_id) REFERENCES panda_realty.property_import_rows(import_row_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_import_actions" add constraint "property_import_actions_import_run_id_fkey" FOREIGN KEY (import_run_id) REFERENCES panda_realty.property_import_runs(import_run_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_import_job_chunks" add constraint "property_import_job_chunks_import_run_id_fkey" FOREIGN KEY (import_run_id) REFERENCES panda_realty.property_import_runs(import_run_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_import_rows" add constraint "property_import_rows_import_run_id_fkey" FOREIGN KEY (import_run_id) REFERENCES panda_realty.property_import_runs(import_run_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_import_staged_rows" add constraint "property_import_staged_rows_import_run_id_fkey" FOREIGN KEY (import_run_id) REFERENCES panda_realty.property_import_runs(import_run_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_artifacts" add constraint "property_invoice_artifacts_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_artifacts" add constraint "property_invoice_artifacts_draft_id_draft_revision_fkey" FOREIGN KEY (draft_id, draft_revision) REFERENCES panda_realty.property_invoice_draft_versions(draft_id, revision) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_artifacts" add constraint "property_invoice_artifacts_issue_id_fkey" FOREIGN KEY (issue_id) REFERENCES panda_realty.property_invoice_issues(issue_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_artifacts" add constraint "property_invoice_artifacts_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_draft_versions" add constraint "property_invoice_draft_versions_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_draft_versions" add constraint "property_invoice_draft_versions_draft_id_fkey" FOREIGN KEY (draft_id) REFERENCES panda_realty.property_invoice_drafts(draft_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_draft_versions" add constraint "property_invoice_draft_versions_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_drafts" add constraint "property_invoice_drafts_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_drafts" add constraint "property_invoice_drafts_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_file_references" add constraint "property_invoice_file_references_file_id_fkey" FOREIGN KEY (file_id) REFERENCES panda_realty.property_list_files(property_list_file_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_file_references" add constraint "property_invoice_file_references_issue_id_fkey" FOREIGN KEY (issue_id) REFERENCES panda_realty.property_invoice_issues(issue_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_issue_events" add constraint "property_invoice_issue_events_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_issue_events" add constraint "property_invoice_issue_events_issue_id_fkey" FOREIGN KEY (issue_id) REFERENCES panda_realty.property_invoice_issues(issue_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_issue_events" add constraint "property_invoice_issue_events_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_issue_events" add constraint "property_invoice_issue_events_replacement_issue_id_fkey" FOREIGN KEY (replacement_issue_id) REFERENCES panda_realty.property_invoice_issues(issue_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_issues" add constraint "property_invoice_issues_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_issues" add constraint "property_invoice_issues_draft_id_draft_revision_fkey" FOREIGN KEY (draft_id, draft_revision) REFERENCES panda_realty.property_invoice_draft_versions(draft_id, revision) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_issues" add constraint "property_invoice_issues_profile_revision_fkey" FOREIGN KEY (profile_revision) REFERENCES panda_realty.invoice_document_profiles(revision); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_issues" add constraint "property_invoice_issues_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_invoice_issues" add constraint "property_invoice_issues_replaces_issue_id_fkey" FOREIGN KEY (replaces_issue_id) REFERENCES panda_realty.property_invoice_issues(issue_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_list_files" add constraint "property_list_files_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_list_notes" add constraint "property_list_notes_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES panda_realty.agents(agent_id) ON DELETE SET NULL; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_list_notes" add constraint "property_list_notes_portal_message_id_fkey" FOREIGN KEY (portal_message_id) REFERENCES panda_realty.portal_messages(portal_message_id) ON DELETE SET NULL; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_list_notes" add constraint "property_list_notes_property_entity_id_fkey" FOREIGN KEY (property_entity_id) REFERENCES panda_realty.property_entities(property_entity_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_meetings" add constraint "property_meetings_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES panda_realty.agents(agent_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_attributions" add constraint "property_payment_attributions_allocation_id_fkey" FOREIGN KEY (allocation_id) REFERENCES panda_realty.property_finance_allocations(allocation_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_attributions" add constraint "property_payment_attributions_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_attributions" add constraint "property_payment_attributions_evidence_id_fkey" FOREIGN KEY (evidence_id) REFERENCES panda_realty.property_finance_evidence(evidence_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_attributions" add constraint "property_payment_attributions_obligation_id_obligation_rev_fkey" FOREIGN KEY (obligation_id, obligation_revision) REFERENCES panda_realty.property_payment_obligation_versions(obligation_id, revision) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_attributions" add constraint "property_payment_attributions_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_attributions" add constraint "property_payment_attributions_reverses_id_fkey" FOREIGN KEY (reverses_id) REFERENCES panda_realty.property_payment_attributions(attribution_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_obligation_versions" add constraint "property_payment_obligation_versions_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_obligation_versions" add constraint "property_payment_obligation_versions_obligation_id_fkey" FOREIGN KEY (obligation_id) REFERENCES panda_realty.property_payment_obligations(obligation_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_obligation_versions" add constraint "property_payment_obligation_versions_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_obligations" add constraint "payment_obligation_head_version" FOREIGN KEY (obligation_id, current_revision) REFERENCES panda_realty.property_payment_obligation_versions(obligation_id, revision) DEFERRABLE INITIALLY DEFERRED; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_obligations" add constraint "property_payment_obligations_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_obligations" add constraint "property_payment_obligations_party_entity_id_fkey" FOREIGN KEY (party_entity_id) REFERENCES panda_realty.entities(entity_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_obligations" add constraint "property_payment_obligations_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_request_sends" add constraint "property_payment_request_sends_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_request_sends" add constraint "property_payment_request_sends_request_id_fkey" FOREIGN KEY (request_id) REFERENCES panda_realty.property_payment_requests(request_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_requests" add constraint "payment_request_expense" FOREIGN KEY (expense_id) REFERENCES panda_realty.property_expenses(expense_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_requests" add constraint "property_payment_requests_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_requests" add constraint "property_payment_requests_party_entity_id_fkey" FOREIGN KEY (party_entity_id) REFERENCES panda_realty.entities(entity_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_requests" add constraint "property_payment_requests_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_reviews" add constraint "property_payment_reviews_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_reviews" add constraint "property_payment_reviews_attribution_id_fkey" FOREIGN KEY (attribution_id) REFERENCES panda_realty.property_payment_attributions(attribution_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_reviews" add constraint "property_payment_reviews_consumption_id_fkey" FOREIGN KEY (consumption_id) REFERENCES panda_realty.property_buyer_receipt_consumptions(consumption_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_payment_reviews" add constraint "property_payment_reviews_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_thread_tags" add constraint "property_thread_tags_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_acknowledgements" add constraint "property_timeline_acknowledgements_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_acknowledgements" add constraint "property_timeline_acknowledgements_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_attempts" add constraint "property_timeline_attempts_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_changes" add constraint "property_timeline_changes_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_evidence" add constraint "property_timeline_evidence_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_evidence" add constraint "property_timeline_evidence_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_evidence" add constraint "property_timeline_evidence_trust_transaction_id_fkey" FOREIGN KEY (trust_transaction_id) REFERENCES panda_realty.trust_transactions(trust_transaction_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_listing_state" add constraint "property_timeline_listing_state_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_record_links" add constraint "property_timeline_record_links_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_record_links" add constraint "property_timeline_record_links_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_solicitor_preparations" add constraint "property_timeline_solicitor_preparati_trust_transaction_id_fkey" FOREIGN KEY (trust_transaction_id) REFERENCES panda_realty.trust_transactions(trust_transaction_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_solicitor_preparations" add constraint "property_timeline_solicitor_preparations_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."property_timeline_solicitor_preparations" add constraint "property_timeline_solicitor_preparations_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."public_offer_form_tokens" add constraint "public_offer_form_tokens_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_bank_reference_reviews" add constraint "trust_bank_reference_reviews_trust_transaction_id_fkey" FOREIGN KEY (trust_transaction_id) REFERENCES panda_realty.trust_transactions(trust_transaction_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_deposit_contexts" add constraint "trust_deposit_contexts_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id); exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_deposit_contexts" add constraint "trust_deposit_contexts_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_deposit_contexts" add constraint "trust_deposit_contexts_trust_transaction_id_fkey" FOREIGN KEY (trust_transaction_id) REFERENCES panda_realty.trust_transactions(trust_transaction_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_property_sync_run_properties" add constraint "trust_property_sync_run_propert_trust_property_sync_run_id_fkey" FOREIGN KEY (trust_property_sync_run_id) REFERENCES panda_realty.trust_property_sync_runs(trust_property_sync_run_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_receipt_settings" add constraint "trust_receipt_settings_email_template_id_fkey" FOREIGN KEY (email_template_id) REFERENCES panda_realty.email_templates(email_template_id) ON DELETE SET NULL; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_reconciliation_outstanding_items" add constraint "trust_reconciliation_outstanding_i_trust_reconciliation_id_fkey" FOREIGN KEY (trust_reconciliation_id) REFERENCES panda_realty.trust_reconciliations(trust_reconciliation_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_transaction_imports" add constraint "trust_transaction_imports_trust_transaction_id_fkey" FOREIGN KEY (trust_transaction_id) REFERENCES panda_realty.trust_transactions(trust_transaction_id) ON DELETE SET NULL; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_transaction_imports" add constraint "trust_transaction_imports_trust_transaction_sync_run_id_fkey" FOREIGN KEY (trust_transaction_sync_run_id) REFERENCES panda_realty.trust_transaction_sync_runs(trust_transaction_sync_run_id) ON DELETE SET NULL; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_transaction_sync_run_rows" add constraint "trust_transaction_sync_run_ro_trust_transaction_sync_run_i_fkey" FOREIGN KEY (trust_transaction_sync_run_id) REFERENCES panda_realty.trust_transaction_sync_runs(trust_transaction_sync_run_id) ON DELETE CASCADE; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_transaction_sync_run_rows" add constraint "trust_transaction_sync_run_rows_counterparty_entity_id_fkey" FOREIGN KEY (counterparty_entity_id) REFERENCES panda_realty.entities(entity_id) ON DELETE SET NULL; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_transaction_sync_run_rows" add constraint "trust_transaction_sync_run_rows_trust_transaction_id_fkey" FOREIGN KEY (trust_transaction_id) REFERENCES panda_realty.trust_transactions(trust_transaction_id) ON DELETE SET NULL; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_transactions" add constraint "trust_transactions_counterparty_entity_id_fkey" FOREIGN KEY (counterparty_entity_id) REFERENCES panda_realty.entities(entity_id) ON DELETE SET NULL; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
do $$ begin alter table panda_realty."trust_transactions" add constraint "trust_transactions_property_list_id_fkey" FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT; exception when duplicate_object or duplicate_table or invalid_table_definition then null; end $$;
-- indexes
CREATE INDEX IF NOT EXISTS admin_html_files_user_email_idx ON panda_realty.admin_html_files USING btree (user_email);
CREATE INDEX IF NOT EXISTS admin_web_links_user_email_idx ON panda_realty.admin_web_links USING btree (user_email);
CREATE INDEX IF NOT EXISTS audit_events_occurred_at_idx ON panda_realty.audit_events USING btree (occurred_at);
CREATE INDEX IF NOT EXISTS audit_events_operation_id_idx ON panda_realty.audit_events USING btree (audit_operation_id);
CREATE UNIQUE INDEX IF NOT EXISTS audit_events_legacy_fingerprint_unique ON panda_realty.audit_events USING btree (legacy_fingerprint) WHERE (legacy_fingerprint IS NOT NULL);
CREATE INDEX IF NOT EXISTS audit_events_table_primary_key_idx ON panda_realty.audit_events USING btree (table_name, audit_event_id);
CREATE INDEX IF NOT EXISTS audit_operations_actor_user_id_idx ON panda_realty.audit_operations USING btree (actor_user_id);
CREATE INDEX IF NOT EXISTS audit_operations_created_at_idx ON panda_realty.audit_operations USING btree (created_at);
CREATE INDEX IF NOT EXISTS booking_requests_property_list_idx ON panda_realty.booking_requests USING btree (property_list_id);
CREATE INDEX IF NOT EXISTS booking_requests_property_entity_idx ON panda_realty.booking_requests USING btree (property_entity_id);
CREATE INDEX IF NOT EXISTS booking_responses_request_idx ON panda_realty.booking_responses USING btree (booking_request_id);
CREATE INDEX IF NOT EXISTS booking_slots_request_idx ON panda_realty.booking_slots USING btree (booking_request_id);
CREATE INDEX IF NOT EXISTS idx_created_updated_buyer_offers ON panda_realty.buyer_offers USING btree (created_at, updated_at);
CREATE INDEX IF NOT EXISTS idx_created_updated_buyer_status ON panda_realty.buyer_status USING btree (created_at, updated_at);
CREATE INDEX IF NOT EXISTS condition_delivery_attempts_delivery_idx ON panda_realty.condition_delivery_attempts USING btree (delivery_key);
CREATE INDEX IF NOT EXISTS condition_delivery_attempts_provider_idx ON panda_realty.condition_delivery_attempts USING btree (provider_message_id, recipient) WHERE (channel = 'sms'::text);
CREATE INDEX IF NOT EXISTS condition_delivery_attempts_check_idx ON panda_realty.condition_delivery_attempts USING btree (checked_at, created_at) WHERE (outcome = ANY (ARRAY['pending'::text, 'accepted'::text, 'unknown'::text, 'partial'::text]));
CREATE INDEX IF NOT EXISTS condition_delivery_events_attempt_idx ON panda_realty.condition_delivery_events USING btree (attempt_id);
CREATE INDEX IF NOT EXISTS idx_created_updated_contact_categories ON panda_realty.contact_categories USING btree (created_at, updated_at);
CREATE INDEX IF NOT EXISTS idx_deleted_records_created_at ON panda_realty.deleted_records USING btree (created_at);
CREATE UNIQUE INDEX IF NOT EXISTS email_signatures_single_default_idx ON panda_realty.email_signatures USING btree (is_default) WHERE (is_default = true);
CREATE INDEX IF NOT EXISTS idx_created_updated_entities ON panda_realty.entities USING btree (created_at, updated_at);
CREATE INDEX IF NOT EXISTS idx_lead_source_id ON panda_realty.entities USING btree (lead_source_id);
CREATE INDEX IF NOT EXISTS idx_contact_category_id ON panda_realty.entities USING btree (contact_category_id);
CREATE INDEX IF NOT EXISTS idx_entity_category_id ON panda_realty.entities USING btree (entity_category_id);
CREATE INDEX IF NOT EXISTS idx_entity_buyer_statuses_buyer_status_id ON panda_realty.entity_buyer_statuses USING btree (buyer_status_id);
CREATE INDEX IF NOT EXISTS idx_entity_buyer_statuses_entity_id ON panda_realty.entity_buyer_statuses USING btree (entity_id);
CREATE INDEX IF NOT EXISTS idx_created_updated_entity_categories ON panda_realty.entity_categories USING btree (created_at, updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS entity_members_one_buyers_rep_per_entity ON panda_realty.entity_members USING btree (entity_id) WHERE (is_buyers_representative = true);
CREATE INDEX IF NOT EXISTS idx_entity_id ON panda_realty.entity_members USING btree (entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS entity_members_one_sellers_rep_per_entity ON panda_realty.entity_members USING btree (entity_id) WHERE (is_sellers_representative = true);
CREATE INDEX IF NOT EXISTS idx_created_updated_entity_members ON panda_realty.entity_members USING btree (created_at, updated_at);
CREATE INDEX IF NOT EXISTS idx_created_updated_event_timelines ON panda_realty.event_timelines USING btree (created_at, updated_at);
CREATE INDEX IF NOT EXISTS idx_created_updated_events ON panda_realty.events USING btree (created_at, updated_at);
CREATE INDEX IF NOT EXISTS idx_created_updated_lead_sources ON panda_realty.lead_sources USING btree (created_at, updated_at);
CREATE INDEX IF NOT EXISTS panda_properties_rp_identity_idx ON panda_realty.panda_properties USING btree (panda_realty.property_rp_identity((open_in_rpp)::text));
CREATE INDEX IF NOT EXISTS idx_panda_street_key ON panda_realty.panda_properties USING btree (panda_realty.panda_street_key((street_address)::text));
CREATE INDEX IF NOT EXISTS idx_property_status_id ON panda_realty.panda_properties USING btree (property_status_id);
CREATE INDEX IF NOT EXISTS idx_created_updated_panda_properties ON panda_realty.panda_properties USING btree (created_at, updated_at);
CREATE INDEX IF NOT EXISTS panda_properties_favorite_property_list_id_idx ON panda_realty.panda_properties USING btree (property_list_id) WHERE is_favorite;
CREATE INDEX IF NOT EXISTS portal_file_sign_requests_agreement_id_idx ON panda_realty.portal_file_sign_requests USING btree (adobe_sign_agreement_id);
CREATE INDEX IF NOT EXISTS portal_file_sign_requests_provider_envelope_id_idx ON panda_realty.portal_file_sign_requests USING btree (provider_envelope_id);
CREATE INDEX IF NOT EXISTS portal_messages_token_sent_idx ON panda_realty.portal_messages USING btree (portal_token_id, sent_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS portal_messages_inbound_email_message_id_key ON panda_realty.portal_messages USING btree (inbound_email_message_id);
CREATE UNIQUE INDEX IF NOT EXISTS portal_tokens_one_active_buyer ON panda_realty.portal_tokens USING btree (property_entity_id) WHERE ((role = 'buyer'::text) AND (revoked_at IS NULL));
CREATE UNIQUE INDEX IF NOT EXISTS portal_tokens_one_active_seller ON panda_realty.portal_tokens USING btree (property_list_id) WHERE ((role = 'seller'::text) AND (revoked_at IS NULL));
CREATE INDEX IF NOT EXISTS buyer_consumption_receipt ON panda_realty.property_buyer_receipt_consumptions USING btree (receipt_transaction_id);
CREATE INDEX IF NOT EXISTS buyer_consumption_outgoing ON panda_realty.property_buyer_receipt_consumptions USING btree (payment_evidence_id);
CREATE INDEX IF NOT EXISTS deposit_contract_review_property ON panda_realty.property_deposit_contract_reviews USING btree (property_list_id) WHERE (confirmed_at IS NOT NULL);
CREATE INDEX IF NOT EXISTS deposit_contract_review_source ON panda_realty.property_deposit_contract_reviews USING btree (source_kind, source_id) WHERE (confirmed_at IS NOT NULL);
CREATE INDEX IF NOT EXISTS document_acknowledgement_property ON panda_realty.property_document_acknowledgements USING btree (property_list_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS document_send_unresolved ON panda_realty.property_document_sends USING btree (property_list_id, document_key) WHERE (status = ANY (ARRAY['sending'::text, 'unknown'::text]));
CREATE INDEX IF NOT EXISTS document_send_property ON panda_realty.property_document_sends USING btree (property_list_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_property_unique ON panda_realty.property_entities USING btree (entity_id, property_list_id);
CREATE INDEX IF NOT EXISTS idx_created_updated_property_entities ON panda_realty.property_entities USING btree (created_at, updated_at);
CREATE INDEX IF NOT EXISTS idx_property_list_id ON panda_realty.property_entities USING btree (property_list_id);
CREATE INDEX IF NOT EXISTS idx_created_updated_property_entity_files ON panda_realty.property_entity_files USING btree (created_at, updated_at);
CREATE INDEX IF NOT EXISTS property_events_property_list_id_idx ON panda_realty.property_events USING btree (property_list_id);
CREATE INDEX IF NOT EXISTS expense_payment_property ON panda_realty.property_expense_payments USING btree (property_list_id);
CREATE INDEX IF NOT EXISTS property_expense_property ON panda_realty.property_expenses USING btree (property_list_id);
CREATE INDEX IF NOT EXISTS finance_allocation_source ON panda_realty.property_finance_allocations USING btree (evidence_id) WHERE (NOT voided);
CREATE INDEX IF NOT EXISTS finance_allocation_property ON panda_realty.property_finance_allocations USING btree (property_list_id, updated_at);
CREATE INDEX IF NOT EXISTS finance_due_property ON panda_realty.property_finance_due_work USING btree (property_list_id, updated_at);
CREATE INDEX IF NOT EXISTS finance_due_calendar ON panda_realty.property_finance_due_work USING btree (due_date) WHERE ((NOT cancelled) AND (due_date IS NOT NULL));
CREATE INDEX IF NOT EXISTS finance_evidence_property ON panda_realty.property_finance_evidence USING btree (property_list_id, updated_at);
CREATE INDEX IF NOT EXISTS property_form_sign_requests_provider_envelope_id_idx ON panda_realty.property_form_sign_requests USING btree (provider_envelope_id);
CREATE INDEX IF NOT EXISTS property_form_sign_requests_send_id_idx ON panda_realty.property_form_sign_requests USING btree (property_form_send_id);
CREATE INDEX IF NOT EXISTS property_form_sign_requests_agreement_id_idx ON panda_realty.property_form_sign_requests USING btree (adobe_sign_agreement_id);
CREATE UNIQUE INDEX IF NOT EXISTS property_import_action_rows_source_unique ON panda_realty.property_import_action_rows USING btree (import_action_id, import_row_id);
CREATE INDEX IF NOT EXISTS property_import_action_rows_action_id_idx ON panda_realty.property_import_action_rows USING btree (import_action_id);
CREATE UNIQUE INDEX IF NOT EXISTS property_import_actions_active_run_unique ON panda_realty.property_import_actions USING btree (import_run_id) WHERE (status = ANY (ARRAY['queued'::text, 'running'::text]));
CREATE INDEX IF NOT EXISTS property_import_actions_run_id_idx ON panda_realty.property_import_actions USING btree (import_run_id);
CREATE INDEX IF NOT EXISTS property_import_job_chunks_run_id_idx ON panda_realty.property_import_job_chunks USING btree (import_run_id);
CREATE INDEX IF NOT EXISTS property_import_job_chunks_status_idx ON panda_realty.property_import_job_chunks USING btree (status);
CREATE UNIQUE INDEX IF NOT EXISTS property_import_rows_run_source_unique ON panda_realty.property_import_rows USING btree (import_run_id, source_row_index);
CREATE INDEX IF NOT EXISTS property_import_rows_property_id_idx ON panda_realty.property_import_rows USING btree (property_list_id);
CREATE INDEX IF NOT EXISTS property_import_rows_run_id_idx ON panda_realty.property_import_rows USING btree (import_run_id);
CREATE INDEX IF NOT EXISTS property_import_runs_created_at_idx ON panda_realty.property_import_runs USING btree (created_at);
CREATE INDEX IF NOT EXISTS property_import_runs_status_idx ON panda_realty.property_import_runs USING btree (status);
CREATE INDEX IF NOT EXISTS property_import_staged_rows_run_id_idx ON panda_realty.property_import_staged_rows USING btree (import_run_id);
CREATE INDEX IF NOT EXISTS property_import_staged_rows_run_outcome_idx ON panda_realty.property_import_staged_rows USING btree (import_run_id, outcome);
CREATE UNIQUE INDEX IF NOT EXISTS invoice_draft_original_export ON panda_realty.property_invoice_artifacts USING btree (draft_id, draft_revision, kind) WHERE (kind = 'draft'::text);
CREATE INDEX IF NOT EXISTS invoice_artifact_property ON panda_realty.property_invoice_artifacts USING btree (property_list_id, created_at DESC, artifact_id);
CREATE INDEX IF NOT EXISTS invoice_versions_property ON panda_realty.property_invoice_draft_versions USING btree (property_list_id, created_at DESC);
CREATE INDEX IF NOT EXISTS invoice_issue_property ON panda_realty.property_invoice_issues USING btree (property_list_id, created_at DESC, issue_id);
CREATE INDEX IF NOT EXISTS property_list_files_property_list_id_idx ON panda_realty.property_list_files USING btree (property_list_id);
CREATE INDEX IF NOT EXISTS payment_attribution_property ON panda_realty.property_payment_attributions USING btree (property_list_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_attribution_evidence ON panda_realty.property_payment_attributions USING btree (evidence_id);
CREATE INDEX IF NOT EXISTS payment_obligation_property ON panda_realty.property_payment_obligations USING btree (property_list_id);
CREATE UNIQUE INDEX IF NOT EXISTS payment_request_unresolved_send ON panda_realty.property_payment_request_sends USING btree (request_id) WHERE (status = ANY (ARRAY['sending'::text, 'unknown'::text]));
CREATE INDEX IF NOT EXISTS request_send_property ON panda_realty.property_payment_request_sends USING btree (property_list_id, request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_request_property ON panda_realty.property_payment_requests USING btree (property_list_id);
CREATE INDEX IF NOT EXISTS payment_review_property ON panda_realty.property_payment_reviews USING btree (property_list_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_created_updated_property_status ON panda_realty.property_status USING btree (created_at, updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS property_thread_tags_property_thread_unique ON panda_realty.property_thread_tags USING btree (property_list_id, thread_id);
CREATE UNIQUE INDEX IF NOT EXISTS property_timeline_active_attempt ON panda_realty.property_timeline_attempts USING btree (property_list_id) WHERE (ended_at IS NULL);
CREATE INDEX IF NOT EXISTS property_timeline_attempt_history ON panda_realty.property_timeline_attempts USING btree (property_list_id, started_at);
CREATE INDEX IF NOT EXISTS property_timeline_changes_property_scope_idx ON panda_realty.property_timeline_changes USING btree (property_list_id, attempt_id, change_id DESC);
CREATE INDEX IF NOT EXISTS timeline_preparation_property ON panda_realty.property_timeline_solicitor_preparations USING btree (property_list_id, attempt_id, event_key);
CREATE INDEX IF NOT EXISTS trust_property_sync_run_properties_run_idx ON panda_realty.trust_property_sync_run_properties USING btree (trust_property_sync_run_id);
CREATE INDEX IF NOT EXISTS trust_property_sync_run_properties_legacy_property_idx ON panda_realty.trust_property_sync_run_properties USING btree (legacy_property_id);
CREATE INDEX IF NOT EXISTS trust_property_sync_runs_started_at_idx ON panda_realty.trust_property_sync_runs USING btree (started_at DESC);
CREATE INDEX IF NOT EXISTS trust_reconciliation_outstanding_items_reconciliation_idx ON panda_realty.trust_reconciliation_outstanding_items USING btree (trust_reconciliation_id, display_order);
CREATE INDEX IF NOT EXISTS trust_transaction_imports_transaction_idx ON panda_realty.trust_transaction_imports USING btree (trust_transaction_id);
CREATE INDEX IF NOT EXISTS trust_transaction_imports_run_idx ON panda_realty.trust_transaction_imports USING btree (trust_transaction_sync_run_id);
CREATE INDEX IF NOT EXISTS trust_transaction_sync_run_rows_run_idx ON panda_realty.trust_transaction_sync_run_rows USING btree (trust_transaction_sync_run_id);
CREATE INDEX IF NOT EXISTS trust_transaction_sync_run_rows_source_idx ON panda_realty.trust_transaction_sync_run_rows USING btree (source_table, source_id);
CREATE INDEX IF NOT EXISTS trust_transaction_sync_runs_started_at_idx ON panda_realty.trust_transaction_sync_runs USING btree (started_at DESC);
CREATE INDEX IF NOT EXISTS trust_transactions_property_date_idx ON panda_realty.trust_transactions USING btree (property_list_id, transaction_date, trust_transaction_id);
CREATE INDEX IF NOT EXISTS trust_transactions_counterparty_entity_idx ON panda_realty.trust_transactions USING btree (counterparty_entity_id);
-- triggers
drop trigger if exists audit_events_append_only on panda_realty.audit_events;
CREATE TRIGGER audit_events_append_only BEFORE DELETE OR UPDATE ON panda_realty.audit_events FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_reject_mutation();
drop trigger if exists audit_operations_append_only on panda_realty.audit_operations;
CREATE TRIGGER audit_operations_append_only BEFORE DELETE OR UPDATE ON panda_realty.audit_operations FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_reject_mutation();
drop trigger if exists audit_row_change_booking_requests on panda_realty.booking_requests;
CREATE TRIGGER audit_row_change_booking_requests AFTER INSERT OR DELETE OR UPDATE ON panda_realty.booking_requests FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('booking_request_id');
drop trigger if exists audit_row_change_booking_response_slots on panda_realty.booking_response_slots;
CREATE TRIGGER audit_row_change_booking_response_slots AFTER INSERT OR DELETE OR UPDATE ON panda_realty.booking_response_slots FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('booking_response_slot_id');
drop trigger if exists audit_row_change_booking_responses on panda_realty.booking_responses;
CREATE TRIGGER audit_row_change_booking_responses AFTER INSERT OR DELETE OR UPDATE ON panda_realty.booking_responses FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('booking_response_id');
drop trigger if exists audit_row_change_booking_slots on panda_realty.booking_slots;
CREATE TRIGGER audit_row_change_booking_slots AFTER INSERT OR DELETE OR UPDATE ON panda_realty.booking_slots FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('booking_slot_id');
drop trigger if exists accepted_offer_withdraw_before_delete on panda_realty.buyer_offers;
CREATE TRIGGER accepted_offer_withdraw_before_delete BEFORE DELETE ON panda_realty.buyer_offers FOR EACH ROW EXECUTE FUNCTION panda_realty.guard_accepted_offer_delete();
drop trigger if exists accepted_offers_no_truncate on panda_realty.buyer_offers;
CREATE TRIGGER accepted_offers_no_truncate BEFORE TRUNCATE ON panda_realty.buyer_offers FOR EACH STATEMENT EXECUTE FUNCTION panda_realty.reject_accepted_property_truncate();
drop trigger if exists audit_row_change_buyer_offers on panda_realty.buyer_offers;
CREATE TRIGGER audit_row_change_buyer_offers AFTER INSERT OR DELETE OR UPDATE ON panda_realty.buyer_offers FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('buyer_offer_id');
drop trigger if exists property_timeline_offer_attempt on panda_realty.buyer_offers;
CREATE TRIGGER property_timeline_offer_attempt AFTER INSERT OR DELETE OR UPDATE OF is_accepted, property_entity_id, accepted_property_id ON panda_realty.buyer_offers FOR EACH ROW EXECUTE FUNCTION panda_realty.capture_property_timeline_attempt();
drop trigger if exists set_panda_realty_buyer_offers_updated_at on panda_realty.buyer_offers;
CREATE TRIGGER set_panda_realty_buyer_offers_updated_at BEFORE UPDATE ON panda_realty.buyer_offers FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
drop trigger if exists trg_buyer_offer_accepted_unique on panda_realty.buyer_offers;
CREATE TRIGGER trg_buyer_offer_accepted_unique BEFORE INSERT OR UPDATE ON panda_realty.buyer_offers FOR EACH ROW EXECUTE FUNCTION panda_realty.check_buyer_offer_accepted_unique();
drop trigger if exists trigger_before_delete_buyer_offers on panda_realty.buyer_offers;
CREATE TRIGGER trigger_before_delete_buyer_offers BEFORE DELETE ON panda_realty.buyer_offers FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_buyer_offers();
drop trigger if exists audit_row_change_buyer_preferred_features on panda_realty.buyer_preferred_features;
CREATE TRIGGER audit_row_change_buyer_preferred_features AFTER INSERT OR DELETE OR UPDATE ON panda_realty.buyer_preferred_features FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('buyer_preferred_feature_id');
drop trigger if exists audit_row_change_buyer_requirement on panda_realty.buyer_requirement;
CREATE TRIGGER audit_row_change_buyer_requirement AFTER INSERT OR DELETE OR UPDATE ON panda_realty.buyer_requirement FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('buyer_requirement_id');
drop trigger if exists audit_row_change_buyer_status on panda_realty.buyer_status;
CREATE TRIGGER audit_row_change_buyer_status AFTER INSERT OR DELETE OR UPDATE ON panda_realty.buyer_status FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('buyer_status_id');
drop trigger if exists set_panda_realty_buyer_status_updated_at on panda_realty.buyer_status;
CREATE TRIGGER set_panda_realty_buyer_status_updated_at BEFORE UPDATE ON panda_realty.buyer_status FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
drop trigger if exists trigger_before_delete_buyer_status on panda_realty.buyer_status;
CREATE TRIGGER trigger_before_delete_buyer_status BEFORE DELETE ON panda_realty.buyer_status FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_buyer_status();
drop trigger if exists audit_row_change_buyer_viewed_properties on panda_realty.buyer_viewed_properties;
CREATE TRIGGER audit_row_change_buyer_viewed_properties AFTER INSERT OR DELETE OR UPDATE ON panda_realty.buyer_viewed_properties FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('buyer_viewed_property_id');
drop trigger if exists audit_row_change_contact_categories on panda_realty.contact_categories;
CREATE TRIGGER audit_row_change_contact_categories AFTER INSERT OR DELETE OR UPDATE ON panda_realty.contact_categories FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('contact_category_id');
drop trigger if exists set_panda_realty_contact_categories_updated_at on panda_realty.contact_categories;
CREATE TRIGGER set_panda_realty_contact_categories_updated_at BEFORE UPDATE ON panda_realty.contact_categories FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
drop trigger if exists trigger_before_delete_contact_categories on panda_realty.contact_categories;
CREATE TRIGGER trigger_before_delete_contact_categories BEFORE DELETE ON panda_realty.contact_categories FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_contact_categories();
drop trigger if exists audit_row_change_email_signatures on panda_realty.email_signatures;
CREATE TRIGGER audit_row_change_email_signatures AFTER INSERT OR DELETE OR UPDATE ON panda_realty.email_signatures FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('email_signature_id');
drop trigger if exists audit_row_change_email_templates on panda_realty.email_templates;
CREATE TRIGGER audit_row_change_email_templates AFTER INSERT OR DELETE OR UPDATE ON panda_realty.email_templates FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('email_template_id');
drop trigger if exists audit_row_change_entities on panda_realty.entities;
CREATE TRIGGER audit_row_change_entities AFTER INSERT OR DELETE OR UPDATE ON panda_realty.entities FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('entity_id');
drop trigger if exists set_panda_realty_entities_updated_at on panda_realty.entities;
CREATE TRIGGER set_panda_realty_entities_updated_at BEFORE UPDATE ON panda_realty.entities FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
drop trigger if exists trigger_before_delete_entities on panda_realty.entities;
CREATE TRIGGER trigger_before_delete_entities BEFORE DELETE ON panda_realty.entities FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_entities();
drop trigger if exists audit_row_change_entity_buyer_requirements on panda_realty.entity_buyer_requirements;
CREATE TRIGGER audit_row_change_entity_buyer_requirements AFTER INSERT OR DELETE OR UPDATE ON panda_realty.entity_buyer_requirements FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('entity_buyer_requirement_id');
drop trigger if exists audit_row_change_entity_buyer_statuses on panda_realty.entity_buyer_statuses;
CREATE TRIGGER audit_row_change_entity_buyer_statuses AFTER INSERT OR DELETE OR UPDATE ON panda_realty.entity_buyer_statuses FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('entity_buyer_status_id');
drop trigger if exists audit_row_change_entity_categories on panda_realty.entity_categories;
CREATE TRIGGER audit_row_change_entity_categories AFTER INSERT OR DELETE OR UPDATE ON panda_realty.entity_categories FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('entity_category_id');
drop trigger if exists set_panda_realty_entity_categories_updated_at on panda_realty.entity_categories;
CREATE TRIGGER set_panda_realty_entity_categories_updated_at BEFORE UPDATE ON panda_realty.entity_categories FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
drop trigger if exists trigger_before_delete_entity_categories on panda_realty.entity_categories;
CREATE TRIGGER trigger_before_delete_entity_categories BEFORE DELETE ON panda_realty.entity_categories FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_entity_categories();
drop trigger if exists audit_row_change_entity_members on panda_realty.entity_members;
CREATE TRIGGER audit_row_change_entity_members AFTER INSERT OR DELETE OR UPDATE ON panda_realty.entity_members FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('entity_member_id');
drop trigger if exists set_panda_realty_entity_members_updated_at on panda_realty.entity_members;
CREATE TRIGGER set_panda_realty_entity_members_updated_at BEFORE UPDATE ON panda_realty.entity_members FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
drop trigger if exists trigger_before_delete_entity_members on panda_realty.entity_members;
CREATE TRIGGER trigger_before_delete_entity_members BEFORE DELETE ON panda_realty.entity_members FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_entity_members();
drop trigger if exists audit_row_change_event_timelines on panda_realty.event_timelines;
CREATE TRIGGER audit_row_change_event_timelines AFTER INSERT OR DELETE OR UPDATE ON panda_realty.event_timelines FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('event_timeline_id');
drop trigger if exists set_panda_realty_event_timelines_updated_at on panda_realty.event_timelines;
CREATE TRIGGER set_panda_realty_event_timelines_updated_at BEFORE UPDATE ON panda_realty.event_timelines FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
drop trigger if exists trigger_before_delete_event_timelines on panda_realty.event_timelines;
CREATE TRIGGER trigger_before_delete_event_timelines BEFORE DELETE ON panda_realty.event_timelines FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_event_timelines();
drop trigger if exists audit_row_change_events on panda_realty.events;
CREATE TRIGGER audit_row_change_events AFTER INSERT OR DELETE OR UPDATE ON panda_realty.events FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('event_id');
drop trigger if exists set_panda_realty_events_updated_at on panda_realty.events;
CREATE TRIGGER set_panda_realty_events_updated_at BEFORE UPDATE ON panda_realty.events FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
drop trigger if exists trigger_before_delete_events on panda_realty.events;
CREATE TRIGGER trigger_before_delete_events BEFORE DELETE ON panda_realty.events FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_events();
drop trigger if exists invoice_document_immutable on panda_realty.invoice_document_profiles;
CREATE TRIGGER invoice_document_immutable BEFORE DELETE OR UPDATE ON panda_realty.invoice_document_profiles FOR EACH ROW EXECUTE FUNCTION panda_realty.reject_invoice_history_mutation();
drop trigger if exists audit_row_change_lead_sources on panda_realty.lead_sources;
CREATE TRIGGER audit_row_change_lead_sources AFTER INSERT OR DELETE OR UPDATE ON panda_realty.lead_sources FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('lead_source_id');
drop trigger if exists set_panda_realty_lead_sources_updated_at on panda_realty.lead_sources;
CREATE TRIGGER set_panda_realty_lead_sources_updated_at BEFORE UPDATE ON panda_realty.lead_sources FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
drop trigger if exists trigger_before_delete_lead_sources on panda_realty.lead_sources;
CREATE TRIGGER trigger_before_delete_lead_sources BEFORE DELETE ON panda_realty.lead_sources FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_lead_sources();
drop trigger if exists accepted_properties_no_truncate on panda_realty.panda_properties;
CREATE TRIGGER accepted_properties_no_truncate BEFORE TRUNCATE ON panda_realty.panda_properties FOR EACH STATEMENT EXECUTE FUNCTION panda_realty.reject_accepted_property_truncate();
drop trigger if exists audit_row_change_panda_properties on panda_realty.panda_properties;
CREATE TRIGGER audit_row_change_panda_properties AFTER INSERT OR DELETE OR UPDATE ON panda_realty.panda_properties FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_list_id');
drop trigger if exists deposit_contract_source_changed on panda_realty.panda_properties;
CREATE TRIGGER deposit_contract_source_changed AFTER UPDATE OF contract_date ON panda_realty.panda_properties FOR EACH ROW EXECUTE FUNCTION panda_realty.invalidate_deposit_contract_review();
drop trigger if exists property_timeline_listing_preparation on panda_realty.panda_properties;
CREATE TRIGGER property_timeline_listing_preparation AFTER UPDATE ON panda_realty.panda_properties FOR EACH ROW EXECUTE FUNCTION panda_realty.capture_timeline_listing_preparation();
drop trigger if exists set_panda_realty_panda_properties_updated_at on panda_realty.panda_properties;
CREATE TRIGGER set_panda_realty_panda_properties_updated_at BEFORE UPDATE ON panda_realty.panda_properties FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
drop trigger if exists trigger_before_delete_panda_properties on panda_realty.panda_properties;
CREATE TRIGGER trigger_before_delete_panda_properties BEFORE DELETE ON panda_realty.panda_properties FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_panda_properties();
drop trigger if exists audit_row_change_panda_property_types on panda_realty.panda_property_types;
CREATE TRIGGER audit_row_change_panda_property_types AFTER INSERT OR DELETE OR UPDATE ON panda_realty.panda_property_types FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_type_id');
drop trigger if exists audit_row_change_panda_suburbs on panda_realty.panda_suburbs;
CREATE TRIGGER audit_row_change_panda_suburbs AFTER INSERT OR DELETE OR UPDATE ON panda_realty.panda_suburbs FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('suburb_id');
drop trigger if exists audit_row_change_portal_link_sends on panda_realty.portal_link_sends;
CREATE TRIGGER audit_row_change_portal_link_sends AFTER INSERT OR DELETE OR UPDATE ON panda_realty.portal_link_sends FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('portal_link_send_id');
drop trigger if exists audit_row_change_portal_messages on panda_realty.portal_messages;
CREATE TRIGGER audit_row_change_portal_messages AFTER INSERT OR DELETE OR UPDATE ON panda_realty.portal_messages FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('portal_message_id', 'inbound_email_message_id');
drop trigger if exists payment_append_only on panda_realty.property_buyer_receipt_consumptions;
CREATE TRIGGER payment_append_only BEFORE DELETE OR UPDATE ON panda_realty.property_buyer_receipt_consumptions FOR EACH ROW EXECUTE FUNCTION panda_realty.reject_invoice_history_mutation();
drop trigger if exists payment_audit on panda_realty.property_buyer_receipt_consumptions;
CREATE TRIGGER payment_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_buyer_receipt_consumptions FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();
drop trigger if exists payment_metadata_scope on panda_realty.property_buyer_receipt_consumptions;
CREATE TRIGGER payment_metadata_scope BEFORE INSERT OR DELETE OR UPDATE ON panda_realty.property_buyer_receipt_consumptions FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_payment_lifecycle_scope();
drop trigger if exists payment_scope on panda_realty.property_buyer_receipt_consumptions;
CREATE TRIGGER payment_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_buyer_receipt_consumptions FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();
drop trigger if exists deposit_contract_review_audit on panda_realty.property_deposit_contract_reviews;
CREATE TRIGGER deposit_contract_review_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_deposit_contract_reviews FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();
drop trigger if exists deposit_contract_review_scope on panda_realty.property_deposit_contract_reviews;
CREATE TRIGGER deposit_contract_review_scope BEFORE INSERT OR UPDATE ON panda_realty.property_deposit_contract_reviews FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_deposit_metadata_scope();
drop trigger if exists document_audit on panda_realty.property_document_acknowledgements;
CREATE TRIGGER document_audit AFTER INSERT OR UPDATE ON panda_realty.property_document_acknowledgements FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_document_delivery();
drop trigger if exists document_binding on panda_realty.property_document_acknowledgements;
CREATE TRIGGER document_binding BEFORE INSERT ON panda_realty.property_document_acknowledgements FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_document_delivery_scope();
drop trigger if exists document_immutable on panda_realty.property_document_acknowledgements;
CREATE TRIGGER document_immutable BEFORE DELETE OR UPDATE ON panda_realty.property_document_acknowledgements FOR EACH ROW EXECUTE FUNCTION panda_realty.guard_document_delivery_immutable();
drop trigger if exists document_scope on panda_realty.property_document_acknowledgements;
CREATE TRIGGER document_scope BEFORE INSERT ON panda_realty.property_document_acknowledgements FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();
drop trigger if exists document_audit on panda_realty.property_document_preparations;
CREATE TRIGGER document_audit AFTER INSERT OR UPDATE ON panda_realty.property_document_preparations FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_document_delivery();
drop trigger if exists document_binding on panda_realty.property_document_preparations;
CREATE TRIGGER document_binding BEFORE INSERT ON panda_realty.property_document_preparations FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_document_delivery_scope();
drop trigger if exists document_immutable on panda_realty.property_document_preparations;
CREATE TRIGGER document_immutable BEFORE DELETE OR UPDATE ON panda_realty.property_document_preparations FOR EACH ROW EXECUTE FUNCTION panda_realty.guard_document_delivery_immutable();
drop trigger if exists document_scope on panda_realty.property_document_preparations;
CREATE TRIGGER document_scope BEFORE INSERT ON panda_realty.property_document_preparations FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();
drop trigger if exists document_audit on panda_realty.property_document_sends;
CREATE TRIGGER document_audit AFTER INSERT OR UPDATE ON panda_realty.property_document_sends FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_document_delivery();
drop trigger if exists document_binding on panda_realty.property_document_sends;
CREATE TRIGGER document_binding BEFORE INSERT ON panda_realty.property_document_sends FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_document_delivery_scope();
drop trigger if exists document_immutable on panda_realty.property_document_sends;
CREATE TRIGGER document_immutable BEFORE DELETE OR UPDATE ON panda_realty.property_document_sends FOR EACH ROW EXECUTE FUNCTION panda_realty.guard_document_delivery_immutable();
drop trigger if exists document_scope on panda_realty.property_document_sends;
CREATE TRIGGER document_scope BEFORE INSERT ON panda_realty.property_document_sends FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();
drop trigger if exists accepted_links_no_truncate on panda_realty.property_entities;
CREATE TRIGGER accepted_links_no_truncate BEFORE TRUNCATE ON panda_realty.property_entities FOR EACH STATEMENT EXECUTE FUNCTION panda_realty.reject_accepted_property_truncate();
drop trigger if exists accepted_property_link_change on panda_realty.property_entities;
CREATE TRIGGER accepted_property_link_change BEFORE DELETE OR UPDATE OF property_list_id, property_entity_id ON panda_realty.property_entities FOR EACH ROW EXECUTE FUNCTION panda_realty.guard_accepted_property_link_change();
drop trigger if exists audit_row_change_property_entities on panda_realty.property_entities;
CREATE TRIGGER audit_row_change_property_entities AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_entities FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_entity_id');
drop trigger if exists property_entities_accepted_identity_guard on panda_realty.property_entities;
CREATE TRIGGER property_entities_accepted_identity_guard BEFORE UPDATE OF entity_id ON panda_realty.property_entities FOR EACH ROW EXECUTE FUNCTION panda_realty.guard_accepted_buyer_identity();
drop trigger if exists set_panda_realty_property_entities_updated_at on panda_realty.property_entities;
CREATE TRIGGER set_panda_realty_property_entities_updated_at BEFORE UPDATE ON panda_realty.property_entities FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
drop trigger if exists trg_property_entities_buyer_status_updated_at on panda_realty.property_entities;
CREATE TRIGGER trg_property_entities_buyer_status_updated_at BEFORE UPDATE ON panda_realty.property_entities FOR EACH ROW EXECUTE FUNCTION panda_realty.set_updated_at_on_buyer_status_change();
drop trigger if exists trigger_before_delete_property_entities on panda_realty.property_entities;
CREATE TRIGGER trigger_before_delete_property_entities BEFORE DELETE ON panda_realty.property_entities FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_property_entities();
drop trigger if exists audit_row_change_property_entity_files on panda_realty.property_entity_files;
CREATE TRIGGER audit_row_change_property_entity_files AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_entity_files FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_entity_file_id', 'google_drive_file_id');
drop trigger if exists deposit_entity_file_changed on panda_realty.property_entity_files;
CREATE TRIGGER deposit_entity_file_changed AFTER DELETE OR UPDATE ON panda_realty.property_entity_files FOR EACH ROW EXECUTE FUNCTION panda_realty.invalidate_deposit_supporting_source();
drop trigger if exists set_panda_realty_property_entity_files_updated_at on panda_realty.property_entity_files;
CREATE TRIGGER set_panda_realty_property_entity_files_updated_at BEFORE UPDATE ON panda_realty.property_entity_files FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
drop trigger if exists trigger_before_delete_property_entity_files on panda_realty.property_entity_files;
CREATE TRIGGER trigger_before_delete_property_entity_files BEFORE DELETE ON panda_realty.property_entity_files FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_property_entity_files();
drop trigger if exists audit_row_change_property_entity_notes on panda_realty.property_entity_notes;
CREATE TRIGGER audit_row_change_property_entity_notes AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_entity_notes FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_entity_note_id');
drop trigger if exists audit_row_change_property_events on panda_realty.property_events;
CREATE TRIGGER audit_row_change_property_events AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_events FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_event_id');
drop trigger if exists financial_audit on panda_realty.property_expense_payments;
CREATE TRIGGER financial_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_expense_payments FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();
drop trigger if exists financial_audit on panda_realty.property_expenses;
CREATE TRIGGER financial_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_expenses FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();
drop trigger if exists financial_scope on panda_realty.property_expenses;
CREATE TRIGGER financial_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_expenses FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();
drop trigger if exists financial_audit on panda_realty.property_finance_allocations;
CREATE TRIGGER financial_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_finance_allocations FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();
drop trigger if exists financial_scope on panda_realty.property_finance_allocations;
CREATE TRIGGER financial_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_finance_allocations FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();
drop trigger if exists invoice_metadata_scope on panda_realty.property_finance_allocations;
CREATE TRIGGER invoice_metadata_scope BEFORE INSERT OR UPDATE ON panda_realty.property_finance_allocations FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_invoice_metadata_scope();
drop trigger if exists finance_due_identity on panda_realty.property_finance_due_work;
CREATE TRIGGER finance_due_identity BEFORE DELETE OR UPDATE ON panda_realty.property_finance_due_work FOR EACH ROW EXECUTE FUNCTION panda_realty.guard_finance_due_identity();
drop trigger if exists financial_audit on panda_realty.property_finance_due_work;
CREATE TRIGGER financial_audit AFTER INSERT OR UPDATE ON panda_realty.property_finance_due_work FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();
drop trigger if exists financial_scope on panda_realty.property_finance_due_work;
CREATE TRIGGER financial_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_finance_due_work FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();
drop trigger if exists financial_audit on panda_realty.property_finance_evidence;
CREATE TRIGGER financial_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_finance_evidence FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();
drop trigger if exists financial_scope on panda_realty.property_finance_evidence;
CREATE TRIGGER financial_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_finance_evidence FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();
drop trigger if exists invoice_metadata_scope on panda_realty.property_finance_evidence;
CREATE TRIGGER invoice_metadata_scope BEFORE INSERT OR UPDATE ON panda_realty.property_finance_evidence FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_invoice_metadata_scope();
drop trigger if exists finance_operations_append_only on panda_realty.property_finance_operations;
CREATE TRIGGER finance_operations_append_only BEFORE DELETE OR UPDATE ON panda_realty.property_finance_operations FOR EACH ROW EXECUTE FUNCTION panda_realty.reject_invoice_history_mutation();
drop trigger if exists financial_audit on panda_realty.property_finance_operations;
CREATE TRIGGER financial_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_finance_operations FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();
drop trigger if exists financial_scope on panda_realty.property_finance_operations;
CREATE TRIGGER financial_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_finance_operations FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();
drop trigger if exists invoice_metadata_scope on panda_realty.property_finance_operations;
CREATE TRIGGER invoice_metadata_scope BEFORE INSERT OR UPDATE ON panda_realty.property_finance_operations FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_invoice_metadata_scope();
drop trigger if exists audit_row_change_property_form_recipient_prefs on panda_realty.property_form_recipient_prefs;
CREATE TRIGGER audit_row_change_property_form_recipient_prefs AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_form_recipient_prefs FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_list_id,property_form_id');
drop trigger if exists audit_row_change_property_form_sends on panda_realty.property_form_sends;
CREATE TRIGGER audit_row_change_property_form_sends AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_form_sends FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_form_send_id', 'google_drive_file_id');
drop trigger if exists audit_row_change_property_form_sign_requests on panda_realty.property_form_sign_requests;
CREATE TRIGGER audit_row_change_property_form_sign_requests AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_form_sign_requests FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('id', 'adobe_sign_agreement_id', 'provider_envelope_id', 'provider_recipient_id', 'file_id', 'signed_file_id');
drop trigger if exists audit_row_change_property_forms on panda_realty.property_forms;
CREATE TRIGGER audit_row_change_property_forms AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_forms FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_form_id', 'google_drive_file_id');
drop trigger if exists invoice_document_audit on panda_realty.property_invoice_artifacts;
CREATE TRIGGER invoice_document_audit AFTER INSERT ON panda_realty.property_invoice_artifacts FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_invoice_artifact_metadata();
drop trigger if exists invoice_document_current_scope on panda_realty.property_invoice_artifacts;
CREATE TRIGGER invoice_document_current_scope BEFORE INSERT ON panda_realty.property_invoice_artifacts FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();
drop trigger if exists invoice_document_immutable on panda_realty.property_invoice_artifacts;
CREATE TRIGGER invoice_document_immutable BEFORE DELETE OR UPDATE ON panda_realty.property_invoice_artifacts FOR EACH ROW EXECUTE FUNCTION panda_realty.reject_invoice_history_mutation();
drop trigger if exists invoice_document_scope on panda_realty.property_invoice_artifacts;
CREATE TRIGGER invoice_document_scope BEFORE INSERT ON panda_realty.property_invoice_artifacts FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_invoice_document_scope();
drop trigger if exists financial_audit on panda_realty.property_invoice_draft_versions;
CREATE TRIGGER financial_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_invoice_draft_versions FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();
drop trigger if exists financial_scope on panda_realty.property_invoice_draft_versions;
CREATE TRIGGER financial_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_invoice_draft_versions FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();
drop trigger if exists invoice_metadata_scope on panda_realty.property_invoice_draft_versions;
CREATE TRIGGER invoice_metadata_scope BEFORE INSERT OR UPDATE ON panda_realty.property_invoice_draft_versions FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_invoice_metadata_scope();
drop trigger if exists invoice_versions_append_only on panda_realty.property_invoice_draft_versions;
CREATE TRIGGER invoice_versions_append_only BEFORE DELETE OR UPDATE ON panda_realty.property_invoice_draft_versions FOR EACH ROW EXECUTE FUNCTION panda_realty.reject_invoice_history_mutation();
drop trigger if exists financial_audit on panda_realty.property_invoice_drafts;
CREATE TRIGGER financial_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_invoice_drafts FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();
drop trigger if exists financial_scope on panda_realty.property_invoice_drafts;
CREATE TRIGGER financial_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_invoice_drafts FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();
drop trigger if exists invoice_metadata_scope on panda_realty.property_invoice_drafts;
CREATE TRIGGER invoice_metadata_scope BEFORE INSERT OR UPDATE ON panda_realty.property_invoice_drafts FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_invoice_metadata_scope();
drop trigger if exists invoice_document_immutable on panda_realty.property_invoice_file_references;
CREATE TRIGGER invoice_document_immutable BEFORE DELETE OR UPDATE ON panda_realty.property_invoice_file_references FOR EACH ROW EXECUTE FUNCTION panda_realty.reject_invoice_history_mutation();
drop trigger if exists invoice_document_scope on panda_realty.property_invoice_file_references;
CREATE TRIGGER invoice_document_scope BEFORE INSERT ON panda_realty.property_invoice_file_references FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_invoice_document_scope();
drop trigger if exists invoice_document_audit on panda_realty.property_invoice_issue_events;
CREATE TRIGGER invoice_document_audit AFTER INSERT ON panda_realty.property_invoice_issue_events FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();
drop trigger if exists invoice_document_current_scope on panda_realty.property_invoice_issue_events;
CREATE TRIGGER invoice_document_current_scope BEFORE INSERT ON panda_realty.property_invoice_issue_events FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();
drop trigger if exists invoice_document_immutable on panda_realty.property_invoice_issue_events;
CREATE TRIGGER invoice_document_immutable BEFORE DELETE OR UPDATE ON panda_realty.property_invoice_issue_events FOR EACH ROW EXECUTE FUNCTION panda_realty.reject_invoice_history_mutation();
drop trigger if exists invoice_document_scope on panda_realty.property_invoice_issue_events;
CREATE TRIGGER invoice_document_scope BEFORE INSERT ON panda_realty.property_invoice_issue_events FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_invoice_document_scope();
drop trigger if exists invoice_document_audit on panda_realty.property_invoice_issues;
CREATE TRIGGER invoice_document_audit AFTER INSERT ON panda_realty.property_invoice_issues FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();
drop trigger if exists invoice_document_current_scope on panda_realty.property_invoice_issues;
CREATE TRIGGER invoice_document_current_scope BEFORE INSERT ON panda_realty.property_invoice_issues FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();
drop trigger if exists invoice_document_immutable on panda_realty.property_invoice_issues;
CREATE TRIGGER invoice_document_immutable BEFORE DELETE OR UPDATE ON panda_realty.property_invoice_issues FOR EACH ROW EXECUTE FUNCTION panda_realty.reject_invoice_history_mutation();
drop trigger if exists invoice_document_scope on panda_realty.property_invoice_issues;
CREATE TRIGGER invoice_document_scope BEFORE INSERT ON panda_realty.property_invoice_issues FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_invoice_document_scope();
drop trigger if exists audit_row_change_property_list_files on panda_realty.property_list_files;
CREATE TRIGGER audit_row_change_property_list_files AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_list_files FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_list_file_id', 'google_drive_file_id');
drop trigger if exists deposit_property_file_changed on panda_realty.property_list_files;
CREATE TRIGGER deposit_property_file_changed AFTER DELETE OR UPDATE ON panda_realty.property_list_files FOR EACH ROW EXECUTE FUNCTION panda_realty.invalidate_deposit_supporting_source();
drop trigger if exists audit_row_change_property_list_notes on panda_realty.property_list_notes;
CREATE TRIGGER audit_row_change_property_list_notes AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_list_notes FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_list_note_id');
drop trigger if exists audit_row_change_property_meetings on panda_realty.property_meetings;
CREATE TRIGGER audit_row_change_property_meetings AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_meetings FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_meeting_id', 'google_calendar_event_id');
drop trigger if exists payment_append_only on panda_realty.property_payment_attributions;
CREATE TRIGGER payment_append_only BEFORE DELETE OR UPDATE ON panda_realty.property_payment_attributions FOR EACH ROW EXECUTE FUNCTION panda_realty.reject_invoice_history_mutation();
drop trigger if exists payment_audit on panda_realty.property_payment_attributions;
CREATE TRIGGER payment_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_payment_attributions FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();
drop trigger if exists payment_metadata_scope on panda_realty.property_payment_attributions;
CREATE TRIGGER payment_metadata_scope BEFORE INSERT OR DELETE OR UPDATE ON panda_realty.property_payment_attributions FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_payment_lifecycle_scope();
drop trigger if exists payment_scope on panda_realty.property_payment_attributions;
CREATE TRIGGER payment_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_payment_attributions FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();
drop trigger if exists payment_append_only on panda_realty.property_payment_obligation_versions;
CREATE TRIGGER payment_append_only BEFORE DELETE OR UPDATE ON panda_realty.property_payment_obligation_versions FOR EACH ROW EXECUTE FUNCTION panda_realty.reject_invoice_history_mutation();
drop trigger if exists payment_audit on panda_realty.property_payment_obligation_versions;
CREATE TRIGGER payment_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_payment_obligation_versions FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();
drop trigger if exists payment_metadata_scope on panda_realty.property_payment_obligation_versions;
CREATE TRIGGER payment_metadata_scope BEFORE INSERT OR DELETE OR UPDATE ON panda_realty.property_payment_obligation_versions FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_payment_lifecycle_scope();
drop trigger if exists payment_scope on panda_realty.property_payment_obligation_versions;
CREATE TRIGGER payment_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_payment_obligation_versions FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();
drop trigger if exists payment_audit on panda_realty.property_payment_obligations;
CREATE TRIGGER payment_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_payment_obligations FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();
drop trigger if exists payment_metadata_scope on panda_realty.property_payment_obligations;
CREATE TRIGGER payment_metadata_scope BEFORE INSERT OR DELETE OR UPDATE ON panda_realty.property_payment_obligations FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_payment_lifecycle_scope();
drop trigger if exists payment_scope on panda_realty.property_payment_obligations;
CREATE TRIGGER payment_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_payment_obligations FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();
drop trigger if exists financial_audit on panda_realty.property_payment_request_sends;
CREATE TRIGGER financial_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_payment_request_sends FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();
drop trigger if exists financial_audit on panda_realty.property_payment_requests;
CREATE TRIGGER financial_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_payment_requests FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();
drop trigger if exists financial_scope on panda_realty.property_payment_requests;
CREATE TRIGGER financial_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_payment_requests FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();
drop trigger if exists payment_append_only on panda_realty.property_payment_reviews;
CREATE TRIGGER payment_append_only BEFORE DELETE OR UPDATE ON panda_realty.property_payment_reviews FOR EACH ROW EXECUTE FUNCTION panda_realty.reject_invoice_history_mutation();
drop trigger if exists payment_audit on panda_realty.property_payment_reviews;
CREATE TRIGGER payment_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_payment_reviews FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();
drop trigger if exists payment_metadata_scope on panda_realty.property_payment_reviews;
CREATE TRIGGER payment_metadata_scope BEFORE INSERT OR DELETE OR UPDATE ON panda_realty.property_payment_reviews FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_payment_lifecycle_scope();
drop trigger if exists payment_scope on panda_realty.property_payment_reviews;
CREATE TRIGGER payment_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_payment_reviews FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();
drop trigger if exists audit_row_change_property_status on panda_realty.property_status;
CREATE TRIGGER audit_row_change_property_status AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_status FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_status_id');
drop trigger if exists set_panda_realty_property_status_updated_at on panda_realty.property_status;
CREATE TRIGGER set_panda_realty_property_status_updated_at BEFORE UPDATE ON panda_realty.property_status FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
drop trigger if exists trigger_before_delete_property_status on panda_realty.property_status;
CREATE TRIGGER trigger_before_delete_property_status BEFORE DELETE ON panda_realty.property_status FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_property_status();
drop trigger if exists audit_row_change_property_thread_tags on panda_realty.property_thread_tags;
CREATE TRIGGER audit_row_change_property_thread_tags AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_thread_tags FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_thread_tag_id', 'thread_id');
drop trigger if exists property_timeline_ack_audit on panda_realty.property_timeline_acknowledgements;
CREATE TRIGGER property_timeline_ack_audit AFTER INSERT OR UPDATE ON panda_realty.property_timeline_acknowledgements FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();
drop trigger if exists property_timeline_ack_scope on panda_realty.property_timeline_acknowledgements;
CREATE TRIGGER property_timeline_ack_scope BEFORE INSERT OR UPDATE ON panda_realty.property_timeline_acknowledgements FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();
drop trigger if exists property_timeline_evidence_audit on panda_realty.property_timeline_evidence;
CREATE TRIGGER property_timeline_evidence_audit AFTER INSERT OR DELETE ON panda_realty.property_timeline_evidence FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();
drop trigger if exists property_timeline_evidence_scope on panda_realty.property_timeline_evidence;
CREATE TRIGGER property_timeline_evidence_scope BEFORE INSERT OR UPDATE ON panda_realty.property_timeline_evidence FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();
drop trigger if exists property_timeline_listing_state_audit on panda_realty.property_timeline_listing_state;
CREATE TRIGGER property_timeline_listing_state_audit AFTER INSERT OR UPDATE ON panda_realty.property_timeline_listing_state FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_timeline_listing_preparation();
drop trigger if exists property_timeline_record_audit on panda_realty.property_timeline_record_links;
CREATE TRIGGER property_timeline_record_audit AFTER INSERT OR DELETE ON panda_realty.property_timeline_record_links FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();
drop trigger if exists property_timeline_record_scope on panda_realty.property_timeline_record_links;
CREATE TRIGGER property_timeline_record_scope BEFORE INSERT OR UPDATE ON panda_realty.property_timeline_record_links FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();
drop trigger if exists timeline_preparation_audit on panda_realty.property_timeline_solicitor_preparations;
CREATE TRIGGER timeline_preparation_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_timeline_solicitor_preparations FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();
drop trigger if exists timeline_preparation_receipt on panda_realty.property_timeline_solicitor_preparations;
CREATE TRIGGER timeline_preparation_receipt BEFORE INSERT OR UPDATE ON panda_realty.property_timeline_solicitor_preparations FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_timeline_preparation_receipt();
drop trigger if exists timeline_preparation_sale on panda_realty.property_timeline_solicitor_preparations;
CREATE TRIGGER timeline_preparation_sale BEFORE INSERT OR UPDATE ON panda_realty.property_timeline_solicitor_preparations FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();
drop trigger if exists trust_deposit_context_audit on panda_realty.trust_deposit_contexts;
CREATE TRIGGER trust_deposit_context_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.trust_deposit_contexts FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();
drop trigger if exists trust_deposit_context_scope on panda_realty.trust_deposit_contexts;
CREATE TRIGGER trust_deposit_context_scope BEFORE INSERT OR UPDATE ON panda_realty.trust_deposit_contexts FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_deposit_metadata_scope();
drop trigger if exists assign_trust_transaction_number on panda_realty.trust_transactions;
CREATE TRIGGER assign_trust_transaction_number BEFORE INSERT ON panda_realty.trust_transactions FOR EACH ROW EXECUTE FUNCTION panda_realty.assign_trust_transaction_number();
drop trigger if exists audit_row_change_trust_transactions on panda_realty.trust_transactions;
CREATE TRIGGER audit_row_change_trust_transactions AFTER INSERT OR DELETE OR UPDATE ON panda_realty.trust_transactions FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('trust_transaction_id');
drop trigger if exists trust_deposit_source_changed on panda_realty.trust_transactions;
CREATE TRIGGER trust_deposit_source_changed AFTER UPDATE ON panda_realty.trust_transactions FOR EACH ROW EXECUTE FUNCTION panda_realty.invalidate_trust_deposit_context();
