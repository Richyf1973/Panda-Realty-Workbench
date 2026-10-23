-- Panda Realty WORKBENCH database setup
-- Builds the full Oct-2026 design (114 tables) with made-up test data only.
-- Run ONLY in the new "panda-workbench" project, never in the live one.
create extension if not exists citext with schema public;
create extension if not exists moddatetime with schema public;
create or replace function public.slugify(value text) returns text language sql immutable strict as $$
  select trim(both '-' from regexp_replace(lower(value), '[^a-z0-9]+', '-', 'g'));
$$;

\restrict UbB83TkiOQmgFrjdTgGnaVx2ILikCgTAzt6Y3cAxUIXa7XMUGeUatFce8E7Vf6D

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE SCHEMA panda_realty;

CREATE FUNCTION panda_realty.assign_trust_transaction_number() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'panda_realty'
    AS $$
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
$$;

CREATE FUNCTION panda_realty.audit_capture_row_change() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'panda_realty'
    AS $$
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
$$;

CREATE FUNCTION panda_realty.audit_document_delivery() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE before_row jsonb; after_row jsonb; item jsonb;
BEGIN
  IF TG_OP<>'INSERT' THEN before_row:=to_jsonb(OLD)-ARRAY['artifact_bytes','attachment_bytes']; END IF;
  IF TG_OP<>'DELETE' THEN after_row:=to_jsonb(NEW)-ARRAY['artifact_bytes','attachment_bytes']; END IF;
  item:=COALESCE(after_row,before_row);
  INSERT INTO panda_realty.property_timeline_changes(property_list_id,attempt_id,event_key,action,changed_by,before_state,after_state)
  VALUES((item->>'property_list_id')::bigint,(item->>'attempt_id')::uuid,item->>'event_key',TG_TABLE_NAME||':'||TG_OP,
    COALESCE(NULLIF(current_setting('panda.audit_actor_user_id',true),''),item->>'changed_by'),before_row,after_row);
  RETURN NULL;
END $$;

CREATE FUNCTION panda_realty.audit_invoice_artifact_metadata() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO panda_realty.property_timeline_changes(property_list_id,attempt_id,event_key,action,changed_by,after_state)
    VALUES(NEW.property_list_id,NEW.attempt_id,NEW.event_key,TG_TABLE_NAME||':'||TG_OP,NEW.changed_by,to_jsonb(NEW)-'pdf_bytes');
  RETURN NULL;
END $$;

CREATE FUNCTION panda_realty.audit_property_timeline_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
END $$;

CREATE FUNCTION panda_realty.audit_reject_mutation() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'panda_realty'
    AS $$
BEGIN
  RAISE EXCEPTION 'panda_realty audit ledger is append-only';
END;
$$;

CREATE FUNCTION panda_realty.audit_timeline_listing_preparation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE old_row jsonb;
BEGIN
  IF TG_OP='UPDATE' THEN old_row:=to_jsonb(OLD); END IF;
  INSERT INTO panda_realty.property_timeline_changes(property_list_id,event_key,action,changed_by,before_state,after_state)
    VALUES(NEW.property_list_id,'listing-preparation-review',TG_TABLE_NAME||':'||TG_OP,
      NULLIF(current_setting('panda.audit_actor_user_id',true),''),old_row,to_jsonb(NEW));
  RETURN NULL;
END $$;

CREATE FUNCTION panda_realty.capture_property_timeline_attempt() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
END $$;

CREATE FUNCTION panda_realty.capture_timeline_listing_preparation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
END $$;

CREATE FUNCTION panda_realty.check_buyer_offer_accepted_unique() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'panda_realty'
    AS $$
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
$$;

CREATE FUNCTION panda_realty.deposit_contract_source(kind text, source_id bigint, property_id bigint, buyer_id bigint) RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
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
END $$;

CREATE FUNCTION panda_realty.guard_accepted_buyer_identity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.entity_id IS DISTINCT FROM OLD.entity_id THEN
    PERFORM 1 FROM panda_realty.panda_properties WHERE property_list_id=OLD.property_list_id FOR NO KEY UPDATE;
    IF EXISTS(SELECT 1 FROM panda_realty.buyer_offers WHERE property_entity_id=OLD.property_entity_id AND is_accepted=true) THEN
      RAISE EXCEPTION 'Withdraw the accepted offer before changing its buyer identity'
        USING ERRCODE='23514', CONSTRAINT='property_entities_accepted_identity_withdraw_first';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION panda_realty.guard_accepted_offer_delete() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'panda_realty'
    AS $$
BEGIN
  IF OLD.is_accepted THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'buyer_offers_accepted_withdraw_first',
      MESSAGE = 'Withdraw the accepted offer before deleting it or its buyer/property link.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE FUNCTION panda_realty.guard_accepted_property_link_change() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'panda_realty'
    AS $$
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
$$;

CREATE FUNCTION panda_realty.guard_document_delivery_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Retained document delivery records cannot be deleted' USING ERRCODE='23514'; END IF;
  IF TG_TABLE_NAME IN ('property_document_preparations','property_document_acknowledgements') OR
    (to_jsonb(NEW)-ARRAY['status','message_id','thread_id','error','changed_by','updated_at']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['status','message_id','thread_id','error','changed_by','updated_at']) THEN
    RAISE EXCEPTION 'Original document content and scope are immutable' USING ERRCODE='23514';
  END IF;
  IF OLD.status IN ('sent','failed') THEN RAISE EXCEPTION 'Terminal delivery outcomes are immutable' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION panda_realty.guard_finance_due_identity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Retain finance due history; cancel the item instead' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' AND ((NEW.property_list_id,NEW.attempt_id,NEW.listing_id,NEW.target_kind,NEW.target_id)
    IS DISTINCT FROM (OLD.property_list_id,OLD.attempt_id,OLD.listing_id,OLD.target_kind,OLD.target_id)
    OR NEW.revision<>OLD.revision+1) THEN
    RAISE EXCEPTION 'Finance due identity is immutable and revisions must advance once' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION panda_realty.invalidate_deposit_contract_review() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.contract_date IS DISTINCT FROM OLD.contract_date THEN
    UPDATE panda_realty.property_deposit_contract_reviews SET confirmed_at=NULL,revision=revision+1,
      changed_by=COALESCE(NULLIF(current_setting('panda.audit_actor_user_id',true),''),'contract-source-change')
      WHERE property_list_id=NEW.property_list_id AND confirmed_at IS NOT NULL
      AND attempt_id IN (SELECT attempt_id FROM panda_realty.property_timeline_attempts WHERE property_list_id=NEW.property_list_id AND ended_at IS NULL);
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION panda_realty.invalidate_deposit_supporting_source() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
END $$;

CREATE FUNCTION panda_realty.invalidate_trust_deposit_context() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF ROW(NEW.property_list_id,NEW.transaction_type,NEW.details,NEW.transaction_date,NEW.counterparty_entity_id,NEW.counterparty_name)
    IS DISTINCT FROM ROW(OLD.property_list_id,OLD.transaction_type,OLD.details,OLD.transaction_date,OLD.counterparty_entity_id,OLD.counterparty_name) THEN
    UPDATE panda_realty.trust_deposit_contexts SET needs_review=true,revision=revision+1,changed_at=now(),
      changed_by=COALESCE(NULLIF(current_setting('panda.audit_actor_user_id',true),''),'receipt-source-change')
      WHERE trust_transaction_id=NEW.trust_transaction_id;
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION panda_realty.panda_street_key(addr text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
    AS $$
  SELECT panda_realty.panda_street_norm(
    regexp_replace(addr, '^\s*(lot\s+)?(\S*[0-9]\S*)\s+', '', 'i')
  )
$$;

CREATE FUNCTION panda_realty.panda_street_norm(s text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
    AS $$
  SELECT btrim(regexp_replace(lower(s), '\s+', ' ', 'g'))
$$;

CREATE FUNCTION panda_realty.property_rp_identity(value text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE STRICT
    AS $_$
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
END $_$;

CREATE FUNCTION panda_realty.property_rp_query_decode(value text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE STRICT
    AS $_$
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
END $_$;

CREATE FUNCTION panda_realty.reject_accepted_property_truncate() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'panda_realty'
    AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514',
    CONSTRAINT = 'buyer_offers_accepted_withdraw_first',
    MESSAGE = 'Bulk truncation is disabled. Withdraw accepted offers and use explicit row deletion.';
END;
$$;

CREATE FUNCTION panda_realty.reject_invoice_history_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN RAISE EXCEPTION 'Financial version and operation history is append only' USING ERRCODE='23514'; END $$;

CREATE FUNCTION panda_realty.set_updated_at_on_buyer_status_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.buyer_pipeline_status_id IS DISTINCT FROM OLD.buyer_pipeline_status_id
     AND NEW.updated_at IS NULL
  THEN
    NEW.updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION panda_realty.track_deleted_buyer_offers() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.buyer_offer_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$$;

CREATE FUNCTION panda_realty.track_deleted_buyer_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.buyer_status_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$$;

CREATE FUNCTION panda_realty.track_deleted_contact_categories() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.contact_category_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$$;

CREATE FUNCTION panda_realty.track_deleted_entities() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.entity_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$$;

CREATE FUNCTION panda_realty.track_deleted_entity_categories() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.entity_category_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$$;

CREATE FUNCTION panda_realty.track_deleted_entity_members() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.entity_member_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$$;

CREATE FUNCTION panda_realty.track_deleted_event_timelines() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.event_timeline_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$$;

CREATE FUNCTION panda_realty.track_deleted_events() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.event_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$$;

CREATE FUNCTION panda_realty.track_deleted_lead_sources() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.lead_source_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$$;

CREATE FUNCTION panda_realty.track_deleted_panda_properties() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.property_list_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$$;

CREATE FUNCTION panda_realty.track_deleted_property_entities() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.property_entity_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$$;

CREATE FUNCTION panda_realty.track_deleted_property_entity_files() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.property_entity_file_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$$;

CREATE FUNCTION panda_realty.track_deleted_property_entity_notes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.entity_note_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$$;

CREATE FUNCTION panda_realty.track_deleted_property_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.property_status_id, row_to_json(OLD.*) );
    RETURN OLD;
END;
$$;

CREATE FUNCTION panda_realty.track_deleted_records() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;

CREATE FUNCTION panda_realty.track_deleted_suburbs() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO panda_realty.deleted_records (table_name, pk_value, json_row) VALUES (TG_TABLE_NAME, OLD.suburb, row_to_json(OLD.*) );
    RETURN OLD;
END;
$$;

CREATE FUNCTION panda_realty.trust_deposit_context(transaction_id bigint) RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
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
$$;

CREATE FUNCTION panda_realty.validate_deposit_metadata_scope() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
END $$;

CREATE FUNCTION panda_realty.validate_document_delivery_scope() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
END $$;

CREATE FUNCTION panda_realty.validate_invoice_document_scope() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
END $$;

CREATE FUNCTION panda_realty.validate_invoice_metadata_scope() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
END $$;

CREATE FUNCTION panda_realty.validate_payment_lifecycle_scope() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
END $$;

CREATE FUNCTION panda_realty.validate_property_timeline_scope() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.attempt_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM panda_realty.property_timeline_attempts a WHERE a.attempt_id=NEW.attempt_id AND a.property_list_id=NEW.property_list_id AND a.ended_at IS NULL
  ) THEN RAISE EXCEPTION 'Timeline sale attempt is not current for this property' USING ERRCODE='23514'; END IF;
  IF TG_TABLE_NAME='property_timeline_evidence' THEN
    IF NOT EXISTS (SELECT 1 FROM panda_realty.trust_transactions t WHERE t.trust_transaction_id=NEW.trust_transaction_id AND t.property_list_id=NEW.property_list_id)
    THEN RAISE EXCEPTION 'Trust evidence belongs to another property' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION panda_realty.validate_timeline_preparation_receipt() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM panda_realty.trust_transactions t WHERE t.trust_transaction_id=NEW.trust_transaction_id
    AND t.property_list_id=NEW.property_list_id AND t.transaction_type='receipt'
    AND NEW.event_key=CASE lower(trim(t.details)) WHEN 'initial deposit' THEN 'initial-receipt-sent' WHEN 'balance deposit' THEN 'balance-receipt-sent' END)
  THEN RAISE EXCEPTION 'Preparation receipt scope does not match' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

SET default_tablespace = '';

SET default_table_access_method = heap;

CREATE TABLE panda_realty.admin_html_files (
    html_file_id bigint NOT NULL,
    user_email public.citext NOT NULL,
    name public.citext NOT NULL,
    filename text NOT NULL,
    html_content text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

ALTER TABLE panda_realty.admin_html_files ALTER COLUMN html_file_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.admin_html_files_html_file_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.admin_web_links (
    web_link_id bigint NOT NULL,
    user_email public.citext NOT NULL,
    name public.citext NOT NULL,
    url text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

ALTER TABLE panda_realty.admin_web_links ALTER COLUMN web_link_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.admin_web_links_web_link_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.agent_tasks (
    agent_task_id bigint NOT NULL,
    agent_id bigint NOT NULL,
    title text NOT NULL,
    due_date date,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);

ALTER TABLE panda_realty.agent_tasks ALTER COLUMN agent_task_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.agent_tasks_agent_task_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.agents (
    agent_id bigint NOT NULL,
    agent_name public.citext NOT NULL,
    email public.citext,
    phone public.citext,
    trading_name public.citext,
    abn public.citext,
    licence_number public.citext,
    acn public.citext,
    fax public.citext,
    mobile public.citext,
    address public.citext,
    suburb public.citext,
    state public.citext,
    postcode public.citext,
    licence_expiry date,
    licensee_type public.citext,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);

ALTER TABLE panda_realty.agents ALTER COLUMN agent_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.agents_agent_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.audit_events (
    audit_event_id bigint NOT NULL,
    audit_operation_id uuid NOT NULL,
    table_name text NOT NULL,
    primary_key jsonb NOT NULL,
    action text NOT NULL,
    before_row jsonb,
    after_row jsonb,
    changed_columns jsonb,
    legacy_fingerprint text,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_events_action_check CHECK ((action = ANY (ARRAY['insert'::text, 'update'::text, 'delete'::text, 'restore'::text, 'legacy-delete'::text])))
);

ALTER TABLE panda_realty.audit_events ALTER COLUMN audit_event_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.audit_events_audit_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.audit_operations (
    audit_operation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_user_id uuid,
    actor_email text,
    source text NOT NULL,
    request_id uuid,
    is_legacy boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_operations_source_check CHECK ((source = ANY (ARRAY['admin'::text, 'portal'::text, 'import'::text, 'system'::text, 'unknown'::text, 'legacy'::text])))
);

CREATE TABLE panda_realty.booking_requests (
    booking_request_id bigint NOT NULL,
    property_list_id bigint NOT NULL,
    property_entity_id bigint NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    confirmed_slot_id bigint,
    confirmed_meeting_id bigint,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone
);

ALTER TABLE panda_realty.booking_requests ALTER COLUMN booking_request_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.booking_requests_booking_request_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.booking_response_slots (
    booking_response_slot_id bigint NOT NULL,
    booking_response_id bigint NOT NULL,
    slot_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE panda_realty.booking_response_slots ALTER COLUMN booking_response_slot_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.booking_response_slots_booking_response_slot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.booking_responses (
    booking_response_id bigint NOT NULL,
    booking_request_id bigint NOT NULL,
    party text NOT NULL,
    slot_id bigint,
    find_another boolean DEFAULT false NOT NULL,
    responded_at timestamp with time zone DEFAULT now()
);

ALTER TABLE panda_realty.booking_responses ALTER COLUMN booking_response_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.booking_responses_booking_response_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.booking_slots (
    booking_slot_id bigint NOT NULL,
    booking_request_id bigint NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    duration_minutes integer,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE panda_realty.booking_slots ALTER COLUMN booking_slot_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.booking_slots_booking_slot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.buyer_offers (
    buyer_offer_id bigint NOT NULL,
    property_entity_id bigint NOT NULL,
    offer numeric(20,2) DEFAULT '0'::numeric NOT NULL,
    is_accepted boolean DEFAULT false NOT NULL,
    date_offered date DEFAULT CURRENT_DATE NOT NULL,
    is_cash_offer boolean DEFAULT false NOT NULL,
    no_conditions boolean DEFAULT false NOT NULL,
    cooling_off_days integer,
    finance_days integer,
    building_pest_days integer,
    due_diligence_days integer,
    subject_to_sale_days integer,
    subject_to_sale_stage text,
    subject_to_sale_address text,
    deposit_initial numeric(20,2),
    deposit_balance numeric(20,2),
    sale_of_property_days integer,
    unconditional_contract_days integer,
    other_conditions text,
    custom_conditions jsonb,
    settlement_date date,
    condition_notes text,
    waive_cooling_off boolean,
    is_subject_to_finance boolean,
    finance_pre_approved boolean,
    finance_bank text,
    finance_bank_contact_name text,
    finance_bank_contact_phone text,
    finance_bank_contact_email text,
    suggest_building_companies boolean,
    is_subject_to_sale boolean,
    sale_days_before_listing_live integer,
    sale_is_unconditional boolean,
    sale_unconditional_date date,
    sale_buyer_settlement_date date,
    sale_active_conditions text[],
    sale_free_appraisal boolean,
    settlement_period text,
    settlement_calendar_event_id text,
    cooling_off_calendar_event_id text,
    finance_calendar_event_id text,
    building_pest_calendar_event_id text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    sale_simultaneous_settlement boolean,
    due_diligence_calendar_event_id text,
    accepted_property_id bigint,
    CONSTRAINT buyer_offers_accepted_property_required CHECK ((is_accepted = (accepted_property_id IS NOT NULL)))
);

ALTER TABLE panda_realty.buyer_offers ALTER COLUMN buyer_offer_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.buyer_offers_buyer_offer_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.buyer_preferred_features (
    buyer_preferred_feature_id bigint NOT NULL,
    entity_id bigint NOT NULL,
    feature public.citext NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);

ALTER TABLE panda_realty.buyer_preferred_features ALTER COLUMN buyer_preferred_feature_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.buyer_preferred_features_buyer_preferred_feature_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.buyer_requirement (
    buyer_requirement_id bigint NOT NULL,
    requirement public.citext NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);

ALTER TABLE panda_realty.buyer_requirement ALTER COLUMN buyer_requirement_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.buyer_requirement_buyer_requirement_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.buyer_status (
    buyer_status_id bigint NOT NULL,
    buyer_status public.citext NOT NULL,
    slug public.citext GENERATED ALWAYS AS (public.slugify((buyer_status)::text)) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);

ALTER TABLE panda_realty.buyer_status ALTER COLUMN buyer_status_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.buyer_status_buyer_status_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.buyer_viewed_properties (
    buyer_viewed_property_id bigint NOT NULL,
    entity_id bigint NOT NULL,
    property_list_id bigint NOT NULL,
    viewed_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);

ALTER TABLE panda_realty.buyer_viewed_properties ALTER COLUMN buyer_viewed_property_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.buyer_viewed_properties_buyer_viewed_property_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.condition_channel_settings (
    property_list_id bigint NOT NULL,
    channels jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    consent_digests jsonb
);

ALTER TABLE panda_realty.condition_channel_settings ALTER COLUMN property_list_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.condition_channel_settings_property_list_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.condition_completions (
    buyer_offer_id bigint NOT NULL,
    condition_key text NOT NULL,
    completed_at timestamp with time zone,
    changed_by text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE panda_realty.condition_delivery_attempts (
    attempt_id text NOT NULL,
    delivery_key text NOT NULL,
    channel text NOT NULL,
    recipient text NOT NULL,
    outcome text DEFAULT 'pending'::text NOT NULL,
    provider_reference text,
    provider_message_id text,
    rfc_message_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    outcome_at timestamp with time zone,
    checked_at timestamp with time zone,
    error text,
    total_parts integer DEFAULT 1 NOT NULL,
    parts jsonb DEFAULT '{}'::jsonb NOT NULL,
    aggregate_delivered_at timestamp with time zone,
    CONSTRAINT condition_delivery_attempts_channel_check CHECK ((channel = ANY (ARRAY['email'::text, 'sms'::text, 'portal'::text]))),
    CONSTRAINT condition_delivery_attempts_outcome_check CHECK ((outcome = ANY (ARRAY['pending'::text, 'accepted'::text, 'delivered'::text, 'failed'::text, 'bounced'::text, 'partial'::text, 'unknown'::text, 'posted'::text]))),
    CONSTRAINT condition_delivery_attempts_total_parts_check CHECK (((total_parts >= 1) AND (total_parts <= 100)))
);

CREATE TABLE panda_realty.condition_delivery_events (
    event_key text NOT NULL,
    attempt_id text NOT NULL,
    provider_reference text NOT NULL,
    status text NOT NULL,
    event_at timestamp with time zone NOT NULL,
    part integer NOT NULL,
    total_parts integer NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE panda_realty.condition_reminder_deliveries (
    delivery_key text NOT NULL,
    property_list_id bigint NOT NULL,
    buyer_offer_id bigint NOT NULL,
    condition_key text NOT NULL,
    due_date date NOT NULL,
    recipient text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_attempt_at timestamp with time zone,
    sent_at timestamp with time zone,
    gmail_thread_id text,
    last_error text,
    channel text DEFAULT 'email'::text NOT NULL,
    audience text DEFAULT 'agent'::text NOT NULL,
    state text DEFAULT 'pending'::text NOT NULL,
    claim_id text,
    claimed_at timestamp with time zone,
    provider_reference text,
    payload jsonb
);

CREATE TABLE panda_realty.condition_reminder_incidents (
    incident_key text NOT NULL,
    message text NOT NULL,
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    alerted_at timestamp with time zone,
    alert_error text
);

CREATE TABLE panda_realty.condition_reminder_runs (
    run_id uuid DEFAULT gen_random_uuid() NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    state text DEFAULT 'running'::text NOT NULL,
    sent integer DEFAULT 0 NOT NULL,
    failed integer DEFAULT 0 NOT NULL,
    skipped integer DEFAULT 0 NOT NULL,
    error text,
    kind text DEFAULT 'scheduled'::text NOT NULL
);

CREATE TABLE panda_realty.condition_retention_runs (
    retention_run_id uuid DEFAULT gen_random_uuid() NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_by text NOT NULL,
    as_of timestamp with time zone NOT NULL,
    counts jsonb NOT NULL
);

CREATE TABLE panda_realty.contact_categories (
    contact_category_id bigint NOT NULL,
    contact_category_name public.citext NOT NULL,
    slug public.citext GENERATED ALWAYS AS (public.slugify((contact_category_name)::text)) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);

ALTER TABLE panda_realty.contact_categories ALTER COLUMN contact_category_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.contact_categories_contact_category_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.deleted_records (
    table_name character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    pk_value character varying NOT NULL,
    json_row json
);

CREATE TABLE panda_realty.email_signatures (
    email_signature_id bigint NOT NULL,
    name public.citext NOT NULL,
    layout text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    html_content text DEFAULT ''::text NOT NULL,
    rendered_html text DEFAULT ''::text NOT NULL,
    body_text text DEFAULT ''::text NOT NULL,
    closing_text text DEFAULT ''::text NOT NULL,
    contact_name public.citext DEFAULT ''::public.citext NOT NULL,
    phone public.citext,
    email public.citext,
    website text,
    image_asset_url text,
    google_drive_file_id text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);

ALTER TABLE panda_realty.email_signatures ALTER COLUMN email_signature_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.email_signatures_email_signature_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.email_templates (
    email_template_id bigint NOT NULL,
    name public.citext NOT NULL,
    subject text DEFAULT ''::text NOT NULL,
    html_content text DEFAULT ''::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);

ALTER TABLE panda_realty.email_templates ALTER COLUMN email_template_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.email_templates_email_template_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.entities (
    entity_id bigint NOT NULL,
    contact_category_id bigint,
    entity_category_id bigint NOT NULL,
    entity_name public.citext NOT NULL,
    address public.citext,
    email_address public.citext,
    notes text,
    association public.citext,
    last_viewed_property bigint,
    website public.citext,
    is_seller boolean DEFAULT false NOT NULL,
    customer_type public.citext,
    to_be_contacted boolean DEFAULT false NOT NULL,
    to_be_contacted_date timestamp without time zone,
    esuburb public.citext,
    estate public.citext,
    epostcode public.citext,
    abn public.citext,
    mobile public.citext,
    fax public.citext,
    ref public.citext,
    contact public.citext,
    license_no public.citext,
    lead_source_id bigint,
    primary_phone_member_id bigint,
    primary_email_member_id bigint,
    google_contacts_synced_at timestamp with time zone,
    google_contacts_last_outcome text,
    google_contacts_last_error text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    is_property_seller_shadow boolean DEFAULT false NOT NULL,
    alias public.citext
);

ALTER TABLE panda_realty.entities ALTER COLUMN entity_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.entities_entity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.entity_buyer_requirements (
    entity_buyer_requirement_id bigint NOT NULL,
    entity_id bigint NOT NULL,
    buyer_requirement_id bigint NOT NULL,
    value text,
    created_at timestamp without time zone DEFAULT now()
);

ALTER TABLE panda_realty.entity_buyer_requirements ALTER COLUMN entity_buyer_requirement_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.entity_buyer_requirements_entity_buyer_requirement_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.entity_buyer_statuses (
    entity_buyer_status_id bigint NOT NULL,
    entity_id bigint NOT NULL,
    buyer_status_id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);

ALTER TABLE panda_realty.entity_buyer_statuses ALTER COLUMN entity_buyer_status_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.entity_buyer_statuses_entity_buyer_status_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.entity_categories (
    entity_category_id bigint NOT NULL,
    entity_category_name public.citext NOT NULL,
    slug public.citext GENERATED ALWAYS AS (public.slugify((entity_category_name)::text)) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);

ALTER TABLE panda_realty.entity_categories ALTER COLUMN entity_category_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.entity_categories_entity_category_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.entity_members (
    entity_member_id bigint NOT NULL,
    entity_id bigint NOT NULL,
    member_name public.citext NOT NULL,
    member_address public.citext,
    property_to_sell_address public.citext,
    member_phone_number public.citext,
    member_email_address public.citext,
    member_notes text,
    scheduled_viewing_date timestamp without time zone,
    google_calendar_event_id text,
    esuburb public.citext,
    estate public.citext,
    epostcode public.citext,
    abn public.citext,
    mobile public.citext,
    fax public.citext,
    ref public.citext,
    contact public.citext,
    license_no public.citext,
    is_buyers_representative boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    is_sellers_representative boolean DEFAULT false NOT NULL,
    member_alias public.citext
);

ALTER TABLE panda_realty.entity_members ALTER COLUMN entity_member_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.entity_members_entity_member_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.event_timelines (
    event_timeline_id bigint NOT NULL,
    property_list_id bigint,
    event_order numeric(10,1),
    description public.citext,
    days integer DEFAULT 0,
    is_checked boolean DEFAULT false NOT NULL,
    notes text,
    event_timeline_amount numeric(20,2),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);

ALTER TABLE panda_realty.event_timelines ALTER COLUMN event_timeline_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.event_timelines_event_timeline_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.events (
    event_id bigint NOT NULL,
    event_name public.citext NOT NULL,
    event_order numeric(20,10) NOT NULL,
    event_file text,
    event_file_name public.citext,
    event_file_size numeric(20,10),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);

ALTER TABLE panda_realty.events ALTER COLUMN event_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.events_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.gmail_oauth_tokens (
    id integer DEFAULT 1 NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    token_type text DEFAULT 'Bearer'::text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    scope text,
    email_attachments_folder_id text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE panda_realty.grouped_embeddings (
    table_name character varying,
    record_id character varying
);

CREATE TABLE panda_realty.invoice_document_profiles (
    revision integer NOT NULL,
    profile jsonb NOT NULL,
    changed_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT invoice_document_profiles_profile_check CHECK ((jsonb_typeof(profile) = 'object'::text)),
    CONSTRAINT invoice_document_profiles_revision_check CHECK ((revision > 0))
);

ALTER TABLE panda_realty.invoice_document_profiles ALTER COLUMN revision ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.invoice_document_profiles_revision_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.lead_imports (
    lead_import_id bigint NOT NULL,
    source_email public.citext NOT NULL,
    advertisement_id public.citext NOT NULL,
    entity_id bigint,
    property_entity_id bigint,
    raw_email_text text,
    created_at timestamp without time zone DEFAULT now()
);

ALTER TABLE panda_realty.lead_imports ALTER COLUMN lead_import_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.lead_imports_lead_import_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.lead_sources (
    lead_source_id bigint NOT NULL,
    lead_source public.citext NOT NULL,
    slug public.citext GENERATED ALWAYS AS (public.slugify((lead_source)::text)) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);

ALTER TABLE panda_realty.lead_sources ALTER COLUMN lead_source_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.lead_sources_lead_source_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.note_category_colors (
    category_key text NOT NULL,
    note_color text NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE panda_realty.offer_form_submissions (
    offer_form_submission_id bigint NOT NULL,
    offer_form_token_id bigint NOT NULL,
    property_entity_id bigint NOT NULL,
    property_list_id bigint NOT NULL,
    buyer1_name public.citext,
    buyer2_name public.citext,
    buyer_address text,
    buyer_phone public.citext,
    buyer_email public.citext,
    offer_amount public.citext,
    is_cash_buyer boolean,
    settlement_period public.citext,
    is_subject_to_sale boolean,
    sale_timeframe_days public.citext,
    sale_property_status public.citext,
    sale_settlement_date public.citext,
    is_subject_to_finance boolean,
    finance_pre_approved boolean,
    finance_days_to_approve public.citext,
    finance_bank public.citext,
    finance_bank_phone public.citext,
    solicitor_name public.citext,
    solicitor_phone public.citext,
    solicitor_address text,
    solicitor_email public.citext,
    building_pest_inspection public.citext,
    waive_cooling_off boolean,
    total_deposit public.citext,
    initial_payment public.citext,
    second_payment public.citext,
    sale_property_address text,
    sale_days_before_listing_live integer,
    sale_days_to_get_sale_contract integer,
    sale_days_to_get_unconditional_contract integer,
    sale_days_to_settle_existing_property integer,
    sale_is_unconditional boolean,
    sale_unconditional_date public.citext,
    sale_buyer_settlement_date public.citext,
    sale_active_conditions text[],
    sale_conditions_elaboration text,
    sale_free_appraisal boolean,
    finance_bank_contact_name public.citext,
    finance_bank_contact_phone public.citext,
    finance_bank_contact_email public.citext,
    suggest_building_companies boolean,
    extra_comments text,
    buyers_json jsonb,
    signatures_json jsonb,
    multi_offer_check_highest boolean DEFAULT false,
    multi_offer_check_discretion boolean DEFAULT false,
    multi_offer_check_confidential boolean DEFAULT false,
    submitted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    sale_simultaneous_settlement boolean
);

ALTER TABLE panda_realty.offer_form_submissions ALTER COLUMN offer_form_submission_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.offer_form_submissions_offer_form_submission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.offer_form_tokens (
    offer_form_token_id bigint NOT NULL,
    property_entity_id bigint NOT NULL,
    property_list_id bigint NOT NULL,
    token text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

ALTER TABLE panda_realty.offer_form_tokens ALTER COLUMN offer_form_token_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.offer_form_tokens_offer_form_token_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.panda_address_type_conversions (
    id bigint NOT NULL,
    address_text public.citext NOT NULL,
    variant public.citext NOT NULL
);

ALTER TABLE panda_realty.panda_address_type_conversions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.panda_address_type_conversions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.panda_properties (
    property_list_id bigint NOT NULL,
    property_image public.citext,
    street_address public.citext NOT NULL,
    suburb public.citext NOT NULL,
    state public.citext NOT NULL,
    postcode public.citext NOT NULL,
    property_type public.citext NOT NULL,
    bed integer DEFAULT 0 NOT NULL,
    bath integer DEFAULT 0 NOT NULL,
    car integer DEFAULT 0 NOT NULL,
    building_area integer,
    sale_price numeric(20,2),
    sale_date timestamp without time zone,
    settlement_date timestamp without time zone,
    sale_type public.citext,
    agency public.citext,
    agent public.citext,
    improve public.citext,
    construction public.citext,
    land_use1 public.citext,
    zoning public.citext,
    development_zone public.citext,
    primary_plan public.citext,
    rpd public.citext,
    valuation_no public.citext,
    valuation_type public.citext,
    valuation_amount numeric(20,2),
    valuation_date timestamp without time zone,
    owner1name public.citext,
    owner1address public.citext,
    owner1phone public.citext,
    owner1email public.citext,
    owner2name public.citext,
    owner2address public.citext,
    owner2phone public.citext,
    owner2email public.citext,
    owner3name public.citext,
    owner3address public.citext,
    owner3phone public.citext,
    owner3email public.citext,
    owner1mobile public.citext,
    owner1abn public.citext,
    owner1nameline2 public.citext,
    owner1acn public.citext,
    owner1gstregistered public.citext,
    owner1address2 public.citext,
    owner1fax public.citext,
    owner2mobile public.citext,
    owner2abn public.citext,
    owner2nameline2 public.citext,
    owner2acn public.citext,
    owner2gstregistered public.citext,
    owner2address2 public.citext,
    owner2fax public.citext,
    owner3mobile public.citext,
    owner3abn public.citext,
    owner3nameline2 public.citext,
    owner3acn public.citext,
    owner3gstregistered public.citext,
    owner3address2 public.citext,
    owner3fax public.citext,
    owner1_google_contacts_synced_at timestamp with time zone,
    owner1_google_contacts_last_outcome text,
    owner1_google_contacts_last_error text,
    owner2_google_contacts_synced_at timestamp with time zone,
    owner2_google_contacts_last_outcome text,
    owner2_google_contacts_last_error text,
    owner3_google_contacts_synced_at timestamp with time zone,
    owner3_google_contacts_last_outcome text,
    owner3_google_contacts_last_error text,
    owner_type public.citext,
    vendor1name public.citext,
    vendor1address public.citext,
    vendor2name public.citext,
    vendor2address public.citext,
    vendor3name public.citext,
    vendor3address public.citext,
    relationship public.citext,
    open_in_rpp public.citext,
    price_undisclosed boolean DEFAULT false NOT NULL,
    is_favorite boolean DEFAULT false NOT NULL,
    due_highlight_cleared_at timestamp with time zone,
    next_condition_due timestamp with time zone,
    buyer_name public.citext,
    property_status_id bigint,
    buyer_id bigint,
    appraised_amount numeric(20,2),
    exclude_from_report boolean DEFAULT false NOT NULL,
    property_alt_links text,
    property_alt_link text,
    combined_owner public.citext,
    formatted_t_s public.citext,
    advertisement_id public.citext,
    commission_rate numeric(20,10),
    contract_date timestamp with time zone,
    disclosure_date timestamp with time zone,
    land_size numeric(20,4),
    council_area public.citext,
    year_built integer,
    is_won boolean DEFAULT false NOT NULL,
    is_lost boolean DEFAULT false NOT NULL,
    deal_stage_status_id bigint,
    last_drive_synced_at timestamp with time zone,
    primary_phone_owner_num integer DEFAULT 1,
    primary_email_owner_num integer DEFAULT 1,
    primary_phone_buyer_property_entity_id bigint,
    primary_email_buyer_property_entity_id bigint,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    cooling_off_date timestamp without time zone,
    bpi_due_date timestamp without time zone,
    finance_due_date timestamp without time zone,
    searches_date timestamp without time zone,
    balance_deposit_due_date timestamp without time zone,
    realestate_url public.citext,
    owner1alias public.citext,
    owner2alias public.citext,
    owner3alias public.citext
);

ALTER TABLE panda_realty.panda_properties ALTER COLUMN property_list_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.panda_properties_property_list_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.panda_property_types (
    property_type_id bigint NOT NULL,
    label public.citext NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE panda_realty.panda_property_types ALTER COLUMN property_type_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.panda_property_types_property_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.panda_suburbs (
    suburb_id bigint NOT NULL,
    suburb public.citext NOT NULL,
    state public.citext NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE panda_realty.panda_suburbs ALTER COLUMN suburb_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.panda_suburbs_suburb_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.portal_file_sign_requests (
    id bigint NOT NULL,
    portal_token_id bigint NOT NULL,
    file_id text NOT NULL,
    adobe_sign_agreement_id text NOT NULL,
    signature_status text NOT NULL,
    signer_email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    signed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    provider text DEFAULT 'adobe'::text NOT NULL,
    provider_envelope_id text,
    provider_recipient_id text,
    CONSTRAINT portal_file_sign_requests_signature_status_check CHECK ((signature_status = ANY (ARRAY['pending'::text, 'signed'::text, 'cancelled'::text]))),
    CONSTRAINT portal_file_sign_requests_status_check CHECK ((signature_status = ANY (ARRAY['pending'::text, 'signed'::text, 'cancelled'::text])))
);

ALTER TABLE panda_realty.portal_file_sign_requests ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.portal_file_sign_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.portal_link_sends (
    portal_link_send_id bigint NOT NULL,
    property_list_id bigint NOT NULL,
    portal_token_id bigint,
    recipient_email text NOT NULL,
    recipient_name text,
    sent_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE panda_realty.portal_link_sends ALTER COLUMN portal_link_send_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.portal_link_sends_portal_link_send_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.portal_messages (
    portal_message_id bigint NOT NULL,
    portal_token_id bigint NOT NULL,
    sender_role text NOT NULL,
    body text NOT NULL,
    sent_at timestamp without time zone DEFAULT now(),
    read_at timestamp without time zone,
    read_ack_at timestamp without time zone,
    source text DEFAULT 'portal'::text NOT NULL,
    inbound_email_message_id text,
    CONSTRAINT portal_messages_sender_role_check CHECK ((sender_role = ANY (ARRAY['agent'::text, 'client'::text])))
);

ALTER TABLE panda_realty.portal_messages ALTER COLUMN portal_message_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.portal_messages_portal_message_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.portal_tokens (
    portal_token_id bigint NOT NULL,
    token text NOT NULL,
    role text DEFAULT 'buyer'::text NOT NULL,
    property_entity_id bigint,
    property_list_id bigint NOT NULL,
    revoked_at timestamp without time zone,
    last_accessed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    open_count integer DEFAULT 0 NOT NULL,
    notification_settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    access_scope_id uuid
);

ALTER TABLE panda_realty.portal_tokens ALTER COLUMN portal_token_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.portal_tokens_portal_token_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.property_buyer_receipt_consumptions (
    consumption_id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid NOT NULL,
    listing_id uuid,
    event_key text DEFAULT 'buyer-receipt-consumption'::text NOT NULL,
    receipt_transaction_id bigint NOT NULL,
    kind text DEFAULT 'consumption'::text NOT NULL,
    reverses_id uuid,
    payment_evidence_id uuid NOT NULL,
    buyer_entity_id bigint NOT NULL,
    amount numeric NOT NULL,
    receipt_revision text NOT NULL,
    payment_revision text NOT NULL,
    authority_ref jsonb NOT NULL,
    authority_snapshot jsonb NOT NULL,
    authority_revision text NOT NULL,
    reason text NOT NULL,
    changed_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT property_buyer_receipt_consumptions_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT property_buyer_receipt_consumptions_authority_revision_check CHECK ((authority_revision ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT property_buyer_receipt_consumptions_check CHECK (((kind = 'consumption'::text) = (reverses_id IS NULL))),
    CONSTRAINT property_buyer_receipt_consumptions_kind_check CHECK ((kind = ANY (ARRAY['consumption'::text, 'reversal'::text]))),
    CONSTRAINT property_buyer_receipt_consumptions_payment_revision_check CHECK ((payment_revision ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT property_buyer_receipt_consumptions_reason_check CHECK ((length(TRIM(BOTH FROM reason)) >= 5)),
    CONSTRAINT property_buyer_receipt_consumptions_receipt_revision_check CHECK ((receipt_revision ~ '^[a-f0-9]{64}$'::text))
);

CREATE TABLE panda_realty.property_deposit_contract_reviews (
    attempt_id uuid NOT NULL,
    property_list_id bigint NOT NULL,
    event_key text DEFAULT 'deposit-contract-review'::text NOT NULL,
    source_date date NOT NULL,
    source_reference text NOT NULL,
    source_kind text NOT NULL,
    source_id bigint NOT NULL,
    source_fingerprint text NOT NULL,
    confirmed_at timestamp with time zone,
    changed_by text NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    CONSTRAINT property_deposit_contract_reviews_event_key_check CHECK ((event_key = 'deposit-contract-review'::text)),
    CONSTRAINT property_deposit_contract_reviews_revision_check CHECK ((revision > 0)),
    CONSTRAINT property_deposit_contract_reviews_source_id_check CHECK ((source_id > 0)),
    CONSTRAINT property_deposit_contract_reviews_source_kind_check CHECK ((source_kind = ANY (ARRAY['property-file'::text, 'entity-file'::text]))),
    CONSTRAINT property_deposit_contract_reviews_source_reference_check CHECK (((length(btrim(source_reference)) >= 5) AND (length(btrim(source_reference)) <= 2000)))
);

CREATE TABLE panda_realty.property_document_acknowledgements (
    acknowledgement_id uuid DEFAULT gen_random_uuid() NOT NULL,
    send_id uuid NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid,
    listing_id uuid,
    event_key text DEFAULT 'financial-document-acknowledgement'::text NOT NULL,
    request_nonce uuid NOT NULL,
    request_revision text NOT NULL,
    evidence_ref jsonb NOT NULL,
    source_snapshot jsonb NOT NULL,
    note text NOT NULL,
    changed_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT property_document_acknowledgements_note_check CHECK (((length(btrim(note)) >= 1) AND (length(btrim(note)) <= 2000))),
    CONSTRAINT property_document_acknowledgements_request_revision_check CHECK ((request_revision ~ '^[a-f0-9]{64}$'::text))
);

CREATE TABLE panda_realty.property_document_preparations (
    preparation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid,
    listing_id uuid,
    event_key text DEFAULT 'financial-document-preparation'::text NOT NULL,
    receipt_id bigint NOT NULL,
    source_revision text NOT NULL,
    source_snapshot jsonb NOT NULL,
    name text NOT NULL,
    mime_type text NOT NULL,
    digest text NOT NULL,
    size integer NOT NULL,
    artifact_bytes bytea NOT NULL,
    changed_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT property_document_preparations_check CHECK ((octet_length(artifact_bytes) = size)),
    CONSTRAINT property_document_preparations_digest_check CHECK ((digest ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT property_document_preparations_size_check CHECK (((size >= 1) AND (size <= 10485760))),
    CONSTRAINT property_document_preparations_source_revision_check CHECK ((source_revision ~ '^[a-f0-9]{64}$'::text))
);

CREATE TABLE panda_realty.property_document_sends (
    send_id uuid NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid,
    listing_id uuid,
    event_key text DEFAULT 'financial-document-send'::text NOT NULL,
    kind text NOT NULL,
    document_key text NOT NULL,
    context_snapshot jsonb NOT NULL,
    source_snapshot jsonb NOT NULL,
    preparation_id uuid,
    request_id uuid,
    content_snapshot jsonb NOT NULL,
    content_revision text NOT NULL,
    attachment_bytes bytea[] DEFAULT '{}'::bytea[] NOT NULL,
    status text NOT NULL,
    message_id text,
    thread_id text,
    rfc_message_id text NOT NULL,
    error text,
    changed_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT property_document_sends_check CHECK (((status <> 'sent'::text) OR ((message_id IS NOT NULL) AND (thread_id IS NOT NULL)))),
    CONSTRAINT property_document_sends_check1 CHECK (((kind = 'payment_request'::text) = (request_id IS NOT NULL))),
    CONSTRAINT property_document_sends_check2 CHECK (((kind = 'solicitor_letter'::text) = (preparation_id IS NOT NULL))),
    CONSTRAINT property_document_sends_content_revision_check CHECK ((content_revision ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT property_document_sends_kind_check CHECK ((kind = ANY (ARRAY['payment_request'::text, 'solicitor_letter'::text, 'issued_invoice'::text]))),
    CONSTRAINT property_document_sends_status_check CHECK ((status = ANY (ARRAY['sending'::text, 'sent'::text, 'failed'::text, 'unknown'::text])))
);

CREATE TABLE panda_realty.property_entities (
    property_entity_id bigint NOT NULL,
    entity_id bigint NOT NULL,
    property_list_id bigint,
    property_entity_note public.citext,
    is_original_owner boolean DEFAULT false NOT NULL,
    buyer_pipeline_status_id bigint,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);

ALTER TABLE panda_realty.property_entities ALTER COLUMN property_entity_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.property_entities_property_entity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.property_entity_files (
    property_entity_file_id bigint NOT NULL,
    property_entity_id bigint NOT NULL,
    file_type public.citext,
    file_link text,
    file_name text,
    file_size bigint,
    google_drive_file_id text,
    source public.citext,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    shared_with_portal boolean DEFAULT false NOT NULL,
    shared_with_seller boolean DEFAULT false NOT NULL,
    entity_file_link text,
    entity_file_name text,
    entity_file_size bigint,
    hidden_at timestamp with time zone
);

ALTER TABLE panda_realty.property_entity_files ALTER COLUMN property_entity_file_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.property_entity_files_property_entity_file_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.property_entity_notes (
    property_entity_note_id bigint NOT NULL,
    property_entity_id bigint NOT NULL,
    note text NOT NULL,
    created_by public.citext,
    agent_id bigint,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    shared_with_portal boolean DEFAULT false NOT NULL,
    shared_with_seller boolean DEFAULT false NOT NULL,
    viewed_at timestamp without time zone,
    note_color text,
    is_important boolean DEFAULT false NOT NULL
);

ALTER TABLE panda_realty.property_entity_notes ALTER COLUMN property_entity_note_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.property_entity_notes_property_entity_note_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.property_events (
    property_event_id bigint NOT NULL,
    property_list_id bigint NOT NULL,
    event_type text DEFAULT 'viewing'::text NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    outcome text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);

ALTER TABLE panda_realty.property_events ALTER COLUMN property_event_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.property_events_property_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.property_expense_payments (
    link_id uuid DEFAULT gen_random_uuid() NOT NULL,
    expense_id uuid NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid,
    event_key text DEFAULT 'financial-expense'::text NOT NULL,
    trust_transaction_id bigint,
    source_transaction_id bigint NOT NULL,
    source_snapshot jsonb NOT NULL,
    source_revision text NOT NULL,
    changed_by text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT property_expense_payments_event_key_check CHECK ((event_key = 'financial-expense'::text)),
    CONSTRAINT property_expense_payments_source_revision_check CHECK ((source_revision ~ '^[0-9a-f]{64}$'::text))
);

CREATE TABLE panda_realty.property_expenses (
    expense_id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid,
    listing_id uuid,
    event_key text DEFAULT 'financial-expense'::text NOT NULL,
    supplier_entity_id bigint NOT NULL,
    supplier_name text NOT NULL,
    description text NOT NULL,
    cost_kind text NOT NULL,
    amount numeric,
    source_date date,
    file_id bigint,
    approval_file_id bigint,
    account_context text NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    cancelled boolean DEFAULT false NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    changed_by text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    financial_terms jsonb,
    CONSTRAINT expense_financial_terms_v1 CHECK (((financial_terms IS NULL) OR ((jsonb_typeof(financial_terms) = 'object'::text) AND ((financial_terms ->> 'schemaVersion'::text) = '1'::text)))),
    CONSTRAINT property_expenses_account_context_check CHECK ((account_context = ANY (ARRAY['trust'::text, 'outside-trust'::text, 'unconfirmed'::text]))),
    CONSTRAINT property_expenses_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT property_expenses_cost_kind_check CHECK ((cost_kind = ANY (ARRAY['quote'::text, 'incurred'::text]))),
    CONSTRAINT property_expenses_description_check CHECK (((length(TRIM(BOTH FROM description)) >= 1) AND (length(TRIM(BOTH FROM description)) <= 500))),
    CONSTRAINT property_expenses_event_key_check CHECK ((event_key = 'financial-expense'::text)),
    CONSTRAINT property_expenses_notes_check CHECK ((length(notes) <= 3000)),
    CONSTRAINT property_expenses_revision_check CHECK ((revision > 0))
);

CREATE TABLE panda_realty.property_finance_allocations (
    allocation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    evidence_id uuid NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid,
    listing_id uuid,
    event_key text DEFAULT 'financial-allocation'::text NOT NULL,
    expense_id uuid,
    role text NOT NULL,
    amount numeric NOT NULL,
    paired_allocation_id uuid,
    source_revision text NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    voided boolean DEFAULT false NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    changed_by text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT property_finance_allocations_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT property_finance_allocations_check CHECK (((role = ANY (ARRAY['seller_funding'::text, 'agency_funding'::text, 'supplier_payment'::text])) = (expense_id IS NOT NULL))),
    CONSTRAINT property_finance_allocations_check1 CHECK (((role <> ALL (ARRAY['commission_payment'::text, 'seller_proceeds_payment'::text])) OR (attempt_id IS NOT NULL))),
    CONSTRAINT property_finance_allocations_revision_check CHECK ((revision > 0)),
    CONSTRAINT property_finance_allocations_role_check CHECK ((role = ANY (ARRAY['seller_funding'::text, 'agency_funding'::text, 'supplier_payment'::text, 'commission_payment'::text, 'seller_proceeds_payment'::text]))),
    CONSTRAINT property_finance_allocations_source_revision_check CHECK ((source_revision ~ '^[a-f0-9]{64}$'::text))
);

CREATE TABLE panda_realty.property_finance_due_work (
    due_id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid,
    listing_id uuid,
    event_key text DEFAULT 'financial-due-work'::text NOT NULL,
    target_kind text NOT NULL,
    target_id uuid NOT NULL,
    title text NOT NULL,
    due_date date,
    owner_agent_id bigint,
    source_revision text NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    cancelled boolean DEFAULT false NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    changed_by text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT property_finance_due_work_check CHECK (((due_date IS NULL) = (owner_agent_id IS NULL))),
    CONSTRAINT property_finance_due_work_revision_check CHECK ((revision > 0)),
    CONSTRAINT property_finance_due_work_source_revision_check CHECK ((source_revision ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT property_finance_due_work_target_kind_check CHECK ((target_kind = ANY (ARRAY['request'::text, 'expense'::text, 'invoice_draft'::text, 'invoice_issue'::text, 'obligation'::text, 'delivery'::text]))),
    CONSTRAINT property_finance_due_work_title_check CHECK (((length(title) >= 1) AND (length(title) <= 1000)))
);

CREATE TABLE panda_realty.property_finance_evidence (
    evidence_id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid,
    listing_id uuid,
    event_key text DEFAULT 'financial-evidence'::text NOT NULL,
    source_kind text NOT NULL,
    trust_transaction_id bigint,
    source_transaction_id bigint,
    source_snapshot jsonb NOT NULL,
    source_revision text NOT NULL,
    direction text NOT NULL,
    purpose text NOT NULL,
    account_context text NOT NULL,
    account_ref text DEFAULT ''::text NOT NULL,
    party_entity_id bigint,
    party_name text NOT NULL,
    source_date date,
    file_id bigint,
    source_ref jsonb,
    amount numeric,
    currency text DEFAULT 'AUD'::text NOT NULL,
    verification text NOT NULL,
    external_identity_key text,
    external_provider_key text,
    revision integer DEFAULT 1 NOT NULL,
    voided boolean DEFAULT false NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    changed_by text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT property_finance_evidence_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT property_finance_evidence_check CHECK ((((source_kind = 'trust'::text) AND (source_transaction_id IS NOT NULL) AND (direction = ANY (ARRAY['receipt'::text, 'payment'::text]))) OR ((source_kind = 'external_document'::text) AND (external_identity_key IS NOT NULL) AND (amount IS NOT NULL) AND (direction = ANY (ARRAY['receipt'::text, 'payment'::text])) AND (verification <> 'client_reported'::text)) OR ((source_kind = 'client_statement'::text) AND (amount IS NULL) AND (direction = 'statement'::text) AND (verification = 'client_reported'::text) AND (trust_transaction_id IS NULL) AND (file_id IS NULL)))),
    CONSTRAINT property_finance_evidence_currency_check CHECK ((currency = 'AUD'::text)),
    CONSTRAINT property_finance_evidence_direction_check CHECK ((direction = ANY (ARRAY['receipt'::text, 'payment'::text, 'statement'::text]))),
    CONSTRAINT property_finance_evidence_revision_check CHECK ((revision > 0)),
    CONSTRAINT property_finance_evidence_source_kind_check CHECK ((source_kind = ANY (ARRAY['trust'::text, 'external_document'::text, 'client_statement'::text]))),
    CONSTRAINT property_finance_evidence_source_revision_check CHECK ((source_revision ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT property_finance_evidence_verification_check CHECK ((verification = ANY (ARRAY['client_reported'::text, 'document_supported'::text, 'bank_verified'::text])))
);

CREATE TABLE panda_realty.property_finance_operations (
    property_list_id bigint NOT NULL,
    attempt_id uuid,
    listing_id uuid,
    event_key text DEFAULT 'financial-operation'::text NOT NULL,
    request_nonce uuid NOT NULL,
    request_digest text NOT NULL,
    response jsonb NOT NULL,
    changed_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT property_finance_operations_request_digest_check CHECK ((request_digest ~ '^[a-f0-9]{64}$'::text))
);

CREATE TABLE panda_realty.property_form_recipient_prefs (
    property_list_id bigint NOT NULL,
    property_form_id bigint NOT NULL,
    buyer_enabled boolean NOT NULL,
    seller_enabled boolean NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE panda_realty.property_form_sends (
    property_form_send_id bigint NOT NULL,
    property_form_id bigint NOT NULL,
    property_list_id bigint NOT NULL,
    entity_id bigint,
    recipient_email public.citext,
    recipient_name public.citext,
    message_sent text,
    drive_file_link text,
    prefill_values jsonb,
    sent_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    google_drive_file_id text
);

ALTER TABLE panda_realty.property_form_sends ALTER COLUMN property_form_send_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.property_form_sends_property_form_send_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.property_form_sign_requests (
    id bigint NOT NULL,
    property_form_send_id bigint NOT NULL,
    property_list_id bigint NOT NULL,
    file_id text NOT NULL,
    adobe_sign_agreement_id text,
    signature_status text NOT NULL,
    signer_email text NOT NULL,
    signed_file_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    signed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    provider text DEFAULT 'adobe'::text NOT NULL,
    provider_envelope_id text,
    provider_recipient_id text,
    CONSTRAINT property_form_sign_requests_status_check CHECK ((signature_status = ANY (ARRAY['pending'::text, 'signed'::text, 'cancelled'::text])))
);

ALTER TABLE panda_realty.property_form_sign_requests ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.property_form_sign_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.property_forms (
    property_form_id bigint NOT NULL,
    form_name public.citext NOT NULL,
    description text,
    category public.citext,
    is_active boolean DEFAULT true NOT NULL,
    prefill_strategy public.citext,
    template_values jsonb,
    google_drive_file_id text,
    file_link text,
    file_name text,
    file_size bigint,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);

ALTER TABLE panda_realty.property_forms ALTER COLUMN property_form_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.property_forms_property_form_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.property_import_action_rows (
    import_action_row_id bigint NOT NULL,
    import_action_id uuid NOT NULL,
    import_row_id bigint NOT NULL,
    target_property_list_id bigint,
    outcome text NOT NULL,
    failure_reason text,
    before_values jsonb,
    after_values jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expected_updated_at timestamp with time zone
);

ALTER TABLE panda_realty.property_import_action_rows ALTER COLUMN import_action_row_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.property_import_action_rows_import_action_row_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.property_import_actions (
    import_action_id uuid DEFAULT gen_random_uuid() NOT NULL,
    import_run_id uuid NOT NULL,
    action text NOT NULL,
    status text DEFAULT 'running'::text NOT NULL,
    performed_by_user_id uuid NOT NULL,
    performed_by_email text,
    inserted_count integer DEFAULT 0 NOT NULL,
    updated_count integer DEFAULT 0 NOT NULL,
    deleted_count integer DEFAULT 0 NOT NULL,
    failed_count integer DEFAULT 0 NOT NULL,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    attempts integer DEFAULT 0 NOT NULL,
    started_at timestamp with time zone,
    processed_rows integer DEFAULT 0 NOT NULL,
    total_rows integer DEFAULT 0 NOT NULL,
    source_action_id uuid
);

CREATE TABLE panda_realty.property_import_job_chunks (
    import_job_chunk_id bigint NOT NULL,
    import_run_id uuid NOT NULL,
    chunk_index integer NOT NULL,
    chunk_offset integer NOT NULL,
    rows jsonb NOT NULL,
    status text DEFAULT 'queued'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    error text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    phase text DEFAULT 'stage'::text NOT NULL
);

ALTER TABLE panda_realty.property_import_job_chunks ALTER COLUMN import_job_chunk_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.property_import_job_chunks_import_job_chunk_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.property_import_rows (
    import_row_id bigint NOT NULL,
    import_run_id uuid NOT NULL,
    source_row_index integer NOT NULL,
    property_list_id bigint,
    outcome text NOT NULL,
    failure_reason text,
    before_values jsonb,
    after_values jsonb,
    field_changes jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE panda_realty.property_import_rows ALTER COLUMN import_row_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.property_import_rows_import_row_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.property_import_runs (
    import_run_id uuid DEFAULT gen_random_uuid() NOT NULL,
    mode text NOT NULL,
    status text DEFAULT 'collecting'::text NOT NULL,
    source_file_name text NOT NULL,
    source_file_mime_type text NOT NULL,
    source_file_size bigint NOT NULL,
    source_file_bytes bytea,
    source_drive_file_id text,
    source_drive_web_view_link text,
    source_drive_status text DEFAULT 'pending'::text NOT NULL,
    source_drive_error text,
    imported_by_user_id uuid NOT NULL,
    imported_by_email text,
    total_rows integer DEFAULT 0 NOT NULL,
    inserted_count integer DEFAULT 0 NOT NULL,
    updated_count integer DEFAULT 0 NOT NULL,
    skipped_count integer DEFAULT 0 NOT NULL,
    failed_count integer DEFAULT 0 NOT NULL,
    audit_attempts integer DEFAULT 0 NOT NULL,
    audit_error text,
    retention_expires_at timestamp with time zone NOT NULL,
    audit_completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_rows integer DEFAULT 0 NOT NULL,
    skipped_source_rows integer DEFAULT 0 NOT NULL,
    processing_started_at timestamp with time zone,
    processing_error text,
    notification_status text DEFAULT 'pending'::text NOT NULL,
    notification_error text,
    notification_sent_at timestamp with time zone,
    staged_inserted_count integer DEFAULT 0 NOT NULL,
    staged_updated_count integer DEFAULT 0 NOT NULL,
    staged_skipped_count integer DEFAULT 0 NOT NULL,
    staged_failed_count integer DEFAULT 0 NOT NULL,
    staging_expires_at timestamp with time zone,
    property_change_revision integer DEFAULT 0 NOT NULL
);

CREATE TABLE panda_realty.property_import_staged_rows (
    property_import_staged_row_id bigint NOT NULL,
    import_run_id uuid NOT NULL,
    source_row_index integer NOT NULL,
    row_data jsonb NOT NULL,
    image_drive_file_id text,
    outcome text NOT NULL,
    failure_reason text,
    before_values jsonb,
    field_changes jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    image_error text
);

ALTER TABLE panda_realty.property_import_staged_rows ALTER COLUMN property_import_staged_row_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.property_import_staged_rows_property_import_staged_row_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.property_invoice_artifacts (
    artifact_id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid NOT NULL,
    listing_id uuid,
    issue_id uuid,
    draft_id uuid NOT NULL,
    draft_revision integer NOT NULL,
    kind text NOT NULL,
    format_version integer NOT NULL,
    sha256 text NOT NULL,
    byte_size integer NOT NULL,
    pdf_bytes bytea NOT NULL,
    file_name text NOT NULL,
    event_key text DEFAULT 'financial-invoice-artifact'::text NOT NULL,
    changed_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT property_invoice_artifacts_byte_size_check CHECK (((byte_size > 0) AND (byte_size <= 10485760))),
    CONSTRAINT property_invoice_artifacts_check CHECK ((octet_length(pdf_bytes) = byte_size)),
    CONSTRAINT property_invoice_artifacts_check1 CHECK (((kind = 'original'::text) = (issue_id IS NOT NULL))),
    CONSTRAINT property_invoice_artifacts_format_version_check CHECK ((format_version > 0)),
    CONSTRAINT property_invoice_artifacts_kind_check CHECK ((kind = ANY (ARRAY['draft'::text, 'original'::text]))),
    CONSTRAINT property_invoice_artifacts_sha256_check CHECK ((sha256 ~ '^[a-f0-9]{64}$'::text))
);

CREATE TABLE panda_realty.property_invoice_draft_versions (
    draft_id uuid NOT NULL,
    revision integer NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid NOT NULL,
    listing_id uuid,
    event_key text DEFAULT 'financial-invoice-draft'::text NOT NULL,
    operation text NOT NULL,
    request_nonce uuid NOT NULL,
    request_digest text NOT NULL,
    inputs jsonb NOT NULL,
    calculation_snapshot jsonb NOT NULL,
    source_revision text NOT NULL,
    calculation_version integer NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    changed_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT property_invoice_draft_versions_calculation_version_check CHECK ((calculation_version > 0)),
    CONSTRAINT property_invoice_draft_versions_operation_check CHECK ((operation = ANY (ARRAY['saved'::text, 'reviewed'::text, 'cancelled'::text]))),
    CONSTRAINT property_invoice_draft_versions_request_digest_check CHECK ((request_digest ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT property_invoice_draft_versions_revision_check CHECK ((revision > 0)),
    CONSTRAINT property_invoice_draft_versions_source_revision_check CHECK ((source_revision ~ '^[a-f0-9]{64}$'::text))
);

CREATE TABLE panda_realty.property_invoice_drafts (
    draft_id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid NOT NULL,
    listing_id uuid,
    event_key text DEFAULT 'financial-invoice-draft'::text NOT NULL,
    current_revision integer NOT NULL,
    changed_by text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT property_invoice_drafts_current_revision_check CHECK ((current_revision > 0))
);

CREATE TABLE panda_realty.property_invoice_file_references (
    issue_id uuid NOT NULL,
    file_id bigint NOT NULL
);

CREATE TABLE panda_realty.property_invoice_issue_events (
    event_id uuid DEFAULT gen_random_uuid() NOT NULL,
    issue_id uuid NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid NOT NULL,
    listing_id uuid,
    operation text NOT NULL,
    request_nonce uuid NOT NULL,
    reason text NOT NULL,
    replacement_issue_id uuid,
    event_key text DEFAULT 'financial-invoice-issue'::text NOT NULL,
    changed_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT property_invoice_issue_events_check CHECK (((operation = 'replaced'::text) = (replacement_issue_id IS NOT NULL))),
    CONSTRAINT property_invoice_issue_events_operation_check CHECK ((operation = ANY (ARRAY['cancelled'::text, 'replaced'::text]))),
    CONSTRAINT property_invoice_issue_events_reason_check CHECK ((length(btrim(reason)) >= 5))
);

CREATE TABLE panda_realty.property_invoice_issues (
    issue_id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid NOT NULL,
    listing_id uuid,
    draft_id uuid NOT NULL,
    draft_revision integer NOT NULL,
    profile_revision integer NOT NULL,
    invoice_number text NOT NULL,
    sequence_number integer NOT NULL,
    source_revision text NOT NULL,
    contact_revision text NOT NULL,
    request_nonce uuid NOT NULL,
    request_digest text NOT NULL,
    replaces_issue_id uuid,
    issue_snapshot jsonb NOT NULL,
    event_key text DEFAULT 'financial-invoice-issue'::text NOT NULL,
    changed_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT property_invoice_issues_contact_revision_check CHECK ((contact_revision ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT property_invoice_issues_request_digest_check CHECK ((request_digest ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT property_invoice_issues_sequence_number_check CHECK ((sequence_number > 0)),
    CONSTRAINT property_invoice_issues_source_revision_check CHECK ((source_revision ~ '^[a-f0-9]{64}$'::text))
);

CREATE TABLE panda_realty.property_list_files (
    property_list_file_id bigint NOT NULL,
    property_list_id bigint NOT NULL,
    file_type public.citext,
    file_link text,
    file_name text,
    file_size bigint,
    google_drive_file_id text,
    owner_num smallint,
    source public.citext,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    shared_with_portal boolean DEFAULT false NOT NULL,
    shared_with_seller boolean DEFAULT false NOT NULL,
    hidden_at timestamp with time zone
);

ALTER TABLE panda_realty.property_list_files ALTER COLUMN property_list_file_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.property_list_files_property_list_file_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.property_list_notes (
    property_list_note_id bigint NOT NULL,
    property_list_id bigint NOT NULL,
    note text NOT NULL,
    created_by public.citext,
    agent_id bigint,
    property_entity_id bigint,
    owner_num smallint,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    shared_with_portal boolean DEFAULT false NOT NULL,
    shared_with_seller boolean DEFAULT false NOT NULL,
    viewed_at timestamp without time zone,
    note_color text,
    is_important boolean DEFAULT false NOT NULL,
    portal_message_id bigint
);

ALTER TABLE panda_realty.property_list_notes ALTER COLUMN property_list_note_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.property_list_notes_property_list_note_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.property_meetings (
    property_meeting_id bigint NOT NULL,
    property_list_id bigint NOT NULL,
    property_entity_id bigint,
    type text NOT NULL,
    title text NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    duration_minutes integer,
    notes text,
    google_calendar_event_id text,
    reminders_json text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    share_with_seller boolean DEFAULT true NOT NULL,
    share_with_buyer boolean DEFAULT true NOT NULL,
    shared_description text,
    agent_id bigint
);

ALTER TABLE panda_realty.property_meetings ALTER COLUMN property_meeting_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.property_meetings_property_meeting_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.property_payment_attributions (
    attribution_id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid NOT NULL,
    listing_id uuid,
    event_key text DEFAULT 'payment-attribution'::text NOT NULL,
    obligation_id uuid NOT NULL,
    obligation_revision integer NOT NULL,
    leg text NOT NULL,
    kind text NOT NULL,
    reverses_id uuid,
    evidence_id uuid NOT NULL,
    allocation_id uuid,
    amount numeric NOT NULL,
    source_revision text NOT NULL,
    reason text NOT NULL,
    changed_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT property_payment_attributions_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT property_payment_attributions_check CHECK ((((kind = 'payment'::text) AND (reverses_id IS NULL) AND (allocation_id IS NOT NULL)) OR ((kind = 'reversal'::text) AND (reverses_id IS NOT NULL) AND (allocation_id IS NULL)))),
    CONSTRAINT property_payment_attributions_kind_check CHECK ((kind = ANY (ARRAY['payment'::text, 'reversal'::text]))),
    CONSTRAINT property_payment_attributions_leg_check CHECK ((leg = ANY (ARRAY['trust'::text, 'outside'::text]))),
    CONSTRAINT property_payment_attributions_reason_check CHECK ((length(TRIM(BOTH FROM reason)) >= 5)),
    CONSTRAINT property_payment_attributions_source_revision_check CHECK ((source_revision ~ '^[a-f0-9]{64}$'::text))
);

CREATE TABLE panda_realty.property_payment_obligation_versions (
    obligation_id uuid NOT NULL,
    revision integer NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid NOT NULL,
    listing_id uuid,
    event_key text DEFAULT 'payment-obligation'::text NOT NULL,
    trust_amount numeric NOT NULL,
    outside_amount numeric NOT NULL,
    authority_ref jsonb NOT NULL,
    authority_snapshot jsonb NOT NULL,
    authority_revision text NOT NULL,
    status text NOT NULL,
    reason text NOT NULL,
    changed_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT property_payment_obligation_versions_authority_revision_check CHECK ((authority_revision ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT property_payment_obligation_versions_check CHECK (((trust_amount + outside_amount) > (0)::numeric)),
    CONSTRAINT property_payment_obligation_versions_outside_amount_check CHECK ((outside_amount >= (0)::numeric)),
    CONSTRAINT property_payment_obligation_versions_reason_check CHECK ((length(TRIM(BOTH FROM reason)) >= 5)),
    CONSTRAINT property_payment_obligation_versions_revision_check CHECK ((revision > 0)),
    CONSTRAINT property_payment_obligation_versions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'cancelled'::text]))),
    CONSTRAINT property_payment_obligation_versions_trust_amount_check CHECK ((trust_amount >= (0)::numeric))
);

CREATE TABLE panda_realty.property_payment_obligations (
    obligation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid NOT NULL,
    listing_id uuid,
    event_key text DEFAULT 'payment-obligation'::text NOT NULL,
    purpose text NOT NULL,
    party_entity_id bigint NOT NULL,
    party_name text NOT NULL,
    currency text NOT NULL,
    current_revision integer NOT NULL,
    changed_by text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT property_payment_obligations_currency_check CHECK ((currency = 'AUD'::text)),
    CONSTRAINT property_payment_obligations_current_revision_check CHECK ((current_revision > 0)),
    CONSTRAINT property_payment_obligations_party_name_check CHECK ((length(TRIM(BOTH FROM party_name)) > 0)),
    CONSTRAINT property_payment_obligations_purpose_check CHECK ((purpose = ANY (ARRAY['commission'::text, 'seller_proceeds'::text])))
);

CREATE TABLE panda_realty.property_payment_request_sends (
    send_id uuid NOT NULL,
    request_id uuid NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid,
    event_key text DEFAULT 'financial-request-send'::text NOT NULL,
    request_revision integer NOT NULL,
    source_snapshot jsonb NOT NULL,
    content_snapshot jsonb NOT NULL,
    content_revision text NOT NULL,
    status text NOT NULL,
    message_id text,
    thread_id text,
    rfc_message_id text NOT NULL,
    error text,
    changed_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT property_payment_request_sends_check CHECK (((status <> 'sent'::text) OR (message_id IS NOT NULL))),
    CONSTRAINT property_payment_request_sends_content_revision_check CHECK ((content_revision ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT property_payment_request_sends_error_check CHECK ((length(error) <= 500)),
    CONSTRAINT property_payment_request_sends_event_key_check CHECK ((event_key = 'financial-request-send'::text)),
    CONSTRAINT property_payment_request_sends_status_check CHECK ((status = ANY (ARRAY['sending'::text, 'sent'::text, 'failed'::text, 'unknown'::text])))
);

CREATE TABLE panda_realty.property_payment_requests (
    request_id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid,
    listing_id uuid,
    event_key text NOT NULL,
    expense_id uuid,
    party_entity_id bigint,
    party_name text NOT NULL,
    source_revision text NOT NULL,
    source_snapshot jsonb NOT NULL,
    due_date date,
    notes text DEFAULT ''::text NOT NULL,
    cancelled boolean DEFAULT false NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    changed_by text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_request_kind CHECK (((event_key = 'expense-payment'::text) = (expense_id IS NOT NULL))),
    CONSTRAINT property_payment_requests_event_key_check CHECK ((event_key = ANY (ARRAY['advertising-received'::text, 'initial-deposit-received'::text, 'balance-deposit-received'::text, 'expense-payment'::text]))),
    CONSTRAINT property_payment_requests_notes_check CHECK ((length(notes) <= 3000)),
    CONSTRAINT property_payment_requests_revision_check CHECK ((revision > 0)),
    CONSTRAINT property_payment_requests_source_revision_check CHECK ((source_revision ~ '^[0-9a-f]{64}$'::text))
);

CREATE TABLE panda_realty.property_payment_reviews (
    review_id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid NOT NULL,
    listing_id uuid,
    event_key text DEFAULT 'payment-review'::text NOT NULL,
    attribution_id uuid,
    consumption_id uuid,
    reviewed_snapshot jsonb NOT NULL,
    reason text NOT NULL,
    changed_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT property_payment_reviews_check CHECK (((attribution_id IS NULL) <> (consumption_id IS NULL))),
    CONSTRAINT property_payment_reviews_reason_check CHECK ((length(TRIM(BOTH FROM reason)) >= 5))
);

CREATE TABLE panda_realty.property_status (
    property_status_id bigint NOT NULL,
    property_status_code public.citext NOT NULL,
    property_status public.citext,
    is_shown_on_favorite boolean DEFAULT false NOT NULL,
    pipeline public.citext,
    sort_order integer,
    slug public.citext GENERATED ALWAYS AS (public.slugify((property_status_code)::text)) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    light_mode_color text,
    dark_mode_color text,
    CONSTRAINT property_status_pipeline_check CHECK (((pipeline OPERATOR(public.=) ANY (ARRAY['sellers'::public.citext, 'buyers'::public.citext, 'deal'::public.citext])) OR (pipeline IS NULL)))
);

ALTER TABLE panda_realty.property_status ALTER COLUMN property_status_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.property_status_property_status_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.property_thread_tags (
    property_thread_tag_id bigint NOT NULL,
    property_list_id bigint NOT NULL,
    thread_id text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

ALTER TABLE panda_realty.property_thread_tags ALTER COLUMN property_thread_tag_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.property_thread_tags_property_thread_tag_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.property_timeline_acknowledgements (
    acknowledgement_id bigint NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid,
    event_key text NOT NULL,
    completed_at timestamp with time zone,
    due_date date,
    notes text DEFAULT ''::text NOT NULL,
    changed_by text NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    not_required boolean DEFAULT false NOT NULL,
    maintenance_tasks jsonb DEFAULT '[]'::jsonb NOT NULL,
    preparation_listing_id uuid,
    reviewed_listing_id uuid,
    CONSTRAINT timeline_maintenance_tasks_array CHECK ((jsonb_typeof(maintenance_tasks) = 'array'::text)),
    CONSTRAINT timeline_optional_property_work CHECK ((((NOT not_required) AND (maintenance_tasks = '[]'::jsonb)) OR ((attempt_id IS NULL) AND (event_key = ANY (ARRAY['pool'::text, 'repairs'::text])) AND ((event_key = 'repairs'::text) OR (maintenance_tasks = '[]'::jsonb))))),
    CONSTRAINT timeline_preparation_listing_review_scope CHECK ((((reviewed_listing_id IS NULL) AND (preparation_listing_id IS NULL)) OR ((attempt_id IS NULL) AND (event_key = ANY (ARRAY['pool'::text, 'repairs'::text])))))
);

ALTER TABLE panda_realty.property_timeline_acknowledgements ALTER COLUMN acknowledgement_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.property_timeline_acknowledgements_acknowledgement_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.property_timeline_attempts (
    attempt_id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_list_id bigint NOT NULL,
    buyer_offer_id bigint NOT NULL,
    buyer_entity_id bigint,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    offer_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    property_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    condition_snapshot jsonb DEFAULT '[]'::jsonb NOT NULL
);

CREATE TABLE panda_realty.property_timeline_changes (
    change_id bigint NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid,
    event_key text NOT NULL,
    action text NOT NULL,
    changed_by text,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    before_state jsonb,
    after_state jsonb
);

ALTER TABLE panda_realty.property_timeline_changes ALTER COLUMN change_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.property_timeline_changes_change_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.property_timeline_evidence (
    trust_transaction_id bigint NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid,
    event_key text NOT NULL,
    linked_by text NOT NULL,
    linked_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE panda_realty.property_timeline_evidence ALTER COLUMN trust_transaction_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.property_timeline_evidence_trust_transaction_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.property_timeline_listing_state (
    property_list_id bigint NOT NULL,
    listing_id uuid,
    pending_relist boolean DEFAULT true NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE panda_realty.property_timeline_listing_state ALTER COLUMN property_list_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.property_timeline_listing_state_property_list_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.property_timeline_record_links (
    record_link_id bigint NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid,
    event_key text NOT NULL,
    record_kind text NOT NULL,
    record_id bigint NOT NULL,
    linked_by text NOT NULL,
    linked_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT property_timeline_record_links_record_id_check CHECK ((record_id > 0)),
    CONSTRAINT property_timeline_record_links_record_kind_check CHECK ((record_kind = ANY (ARRAY['property-file'::text, 'entity-file'::text, 'property-note'::text, 'entity-note'::text, 'form-send'::text])))
);

ALTER TABLE panda_realty.property_timeline_record_links ALTER COLUMN record_link_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.property_timeline_record_links_record_link_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.property_timeline_solicitor_preparations (
    trust_transaction_id bigint NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid,
    event_key text NOT NULL,
    source_revision text NOT NULL,
    format_version integer NOT NULL,
    status text NOT NULL,
    failure_message text,
    prepared_at timestamp with time zone,
    changed_by text NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT property_timeline_solicitor_preparations_event_key_check CHECK ((event_key = ANY (ARRAY['initial-receipt-sent'::text, 'balance-receipt-sent'::text]))),
    CONSTRAINT property_timeline_solicitor_preparations_failure_message_check CHECK ((length(failure_message) <= 500)),
    CONSTRAINT property_timeline_solicitor_preparations_format_version_check CHECK ((format_version > 0)),
    CONSTRAINT property_timeline_solicitor_preparations_revision_check CHECK ((revision > 0)),
    CONSTRAINT property_timeline_solicitor_preparations_source_revision_check CHECK ((source_revision ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT property_timeline_solicitor_preparations_status_check CHECK ((status = ANY (ARRAY['prepared'::text, 'failed'::text]))),
    CONSTRAINT timeline_preparation_result CHECK ((((status = 'prepared'::text) AND (prepared_at IS NOT NULL) AND (failure_message IS NULL)) OR ((status = 'failed'::text) AND (prepared_at IS NULL) AND (failure_message IS NOT NULL))))
);

ALTER TABLE panda_realty.property_timeline_solicitor_preparations ALTER COLUMN trust_transaction_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.property_timeline_solicitor_preparatio_trust_transaction_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.public_offer_form_tokens (
    public_offer_form_token_id bigint NOT NULL,
    property_list_id bigint NOT NULL,
    token text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

ALTER TABLE panda_realty.public_offer_form_tokens ALTER COLUMN public_offer_form_token_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.public_offer_form_tokens_public_offer_form_token_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.table_definitions (
    table_name character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    pk_field character varying NOT NULL
);

CREATE TABLE panda_realty.trust_bank_reference_reviews (
    trust_transaction_id bigint NOT NULL,
    status text NOT NULL,
    fingerprint text NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    updated_by text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT trust_bank_reference_reviews_revision_check CHECK ((revision > 0)),
    CONSTRAINT trust_bank_reference_reviews_status_check CHECK ((status = ANY (ARRAY['unreviewed'::text, 'cleared'::text, 'uncleared'::text])))
);

ALTER TABLE panda_realty.trust_bank_reference_reviews ALTER COLUMN trust_transaction_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.trust_bank_reference_reviews_trust_transaction_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.trust_bank_reference_settings (
    id integer DEFAULT 1 NOT NULL,
    opening_date date NOT NULL,
    opening_balance numeric NOT NULL,
    provisional boolean DEFAULT true NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    updated_by text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT trust_bank_reference_settings_id_check CHECK ((id = 1)),
    CONSTRAINT trust_bank_reference_settings_revision_check CHECK ((revision > 0))
);

CREATE TABLE panda_realty.trust_deposit_contexts (
    trust_transaction_id bigint NOT NULL,
    property_list_id bigint NOT NULL,
    attempt_id uuid NOT NULL,
    beneficiary_entity_id bigint NOT NULL,
    event_key text NOT NULL,
    method text NOT NULL,
    review_revision integer NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    needs_review boolean DEFAULT false NOT NULL,
    changed_by text NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT trust_deposit_contexts_check CHECK (((method <> 'review'::text) OR ((length(btrim(reason)) >= 5) AND (length(btrim(reason)) <= 2000)))),
    CONSTRAINT trust_deposit_contexts_event_key_check CHECK ((event_key = ANY (ARRAY['initial-deposit-received'::text, 'balance-deposit-received'::text]))),
    CONSTRAINT trust_deposit_contexts_method_check CHECK ((method = ANY (ARRAY['automatic'::text, 'unassigned'::text, 'review'::text]))),
    CONSTRAINT trust_deposit_contexts_review_revision_check CHECK ((review_revision >= 0)),
    CONSTRAINT trust_deposit_contexts_revision_check CHECK ((revision > 0))
);

ALTER TABLE panda_realty.trust_deposit_contexts ALTER COLUMN trust_transaction_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.trust_deposit_contexts_trust_transaction_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE SEQUENCE panda_realty.trust_payment_number_seq
    START WITH 1001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE panda_realty.trust_property_sync_run_properties (
    trust_property_sync_run_property_id bigint NOT NULL,
    trust_property_sync_run_id bigint NOT NULL,
    legacy_property_id bigint NOT NULL,
    legacy_address text NOT NULL,
    action text NOT NULL,
    panda_property_list_id bigint,
    match_status text,
    match_confidence text,
    match_rules jsonb DEFAULT '[]'::jsonb NOT NULL,
    selection_reason text,
    candidate_property_list_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    payload jsonb NOT NULL
);

ALTER TABLE panda_realty.trust_property_sync_run_properties ALTER COLUMN trust_property_sync_run_property_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.trust_property_sync_run_prope_trust_property_sync_run_prope_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.trust_property_sync_runs (
    trust_property_sync_run_id bigint NOT NULL,
    status text NOT NULL,
    source_file_name text,
    initiated_by public.citext,
    summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    error text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT trust_property_sync_runs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'completed'::text, 'cancelled'::text, 'failed'::text])))
);

ALTER TABLE panda_realty.trust_property_sync_runs ALTER COLUMN trust_property_sync_run_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.trust_property_sync_runs_trust_property_sync_run_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE SEQUENCE panda_realty.trust_receipt_number_seq
    START WITH 1001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE panda_realty.trust_receipt_settings (
    trust_receipt_settings_id integer DEFAULT 1 NOT NULL,
    header_text text DEFAULT 'Agents Financial Administration Act 2014 Trust account receipt\nMy Panda Realty\nLicense No. 4300986'::text NOT NULL,
    email_template_id bigint,
    digital_signature_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT trust_receipt_settings_singleton_check CHECK ((trust_receipt_settings_id = 1))
);

CREATE TABLE panda_realty.trust_reconciliation_outstanding_items (
    trust_reconciliation_outstanding_item_id bigint NOT NULL,
    trust_reconciliation_id bigint NOT NULL,
    item_type text NOT NULL,
    description text NOT NULL,
    amount numeric NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    CONSTRAINT trust_reconciliation_outstanding_items_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT trust_reconciliation_outstanding_items_item_type_check CHECK ((item_type = ANY (ARRAY['deposit'::text, 'cheque'::text])))
);

ALTER TABLE panda_realty.trust_reconciliation_outstanding_items ALTER COLUMN trust_reconciliation_outstanding_item_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.trust_reconciliation_outstand_trust_reconciliation_outstand_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.trust_reconciliations (
    trust_reconciliation_id bigint NOT NULL,
    period date NOT NULL,
    bank_ending_balance numeric DEFAULT 0 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    published_by public.citext,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT trust_reconciliations_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])))
);

ALTER TABLE panda_realty.trust_reconciliations ALTER COLUMN trust_reconciliation_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.trust_reconciliations_trust_reconciliation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.trust_transaction_imports (
    trust_transaction_import_id bigint NOT NULL,
    source_table text NOT NULL,
    source_id bigint NOT NULL,
    trust_transaction_id bigint,
    trust_transaction_sync_run_id bigint,
    source_payload jsonb NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    deleted_by public.citext,
    CONSTRAINT trust_transaction_imports_source_id_check CHECK ((source_id > 0)),
    CONSTRAINT trust_transaction_imports_source_table_check CHECK ((source_table = ANY (ARRAY['tblTrustReceipts'::text, 'tblTrustPayments'::text])))
);

ALTER TABLE panda_realty.trust_transaction_imports ALTER COLUMN trust_transaction_import_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.trust_transaction_imports_trust_transaction_import_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.trust_transaction_sync_run_rows (
    trust_transaction_sync_run_row_id bigint NOT NULL,
    trust_transaction_sync_run_id bigint NOT NULL,
    source_table text NOT NULL,
    source_id bigint NOT NULL,
    transaction_type text NOT NULL,
    action text NOT NULL,
    trust_transaction_id bigint,
    panda_property_list_id bigint,
    property_match_status text,
    property_selection_reason text,
    counterparty_entity_id bigint,
    counterparty_match_status text,
    counterparty_match_reason text,
    counterparty_name text NOT NULL,
    payload jsonb NOT NULL,
    CONSTRAINT trust_transaction_sync_run_rows_source_id_check CHECK ((source_id > 0)),
    CONSTRAINT trust_transaction_sync_run_rows_source_table_check CHECK ((source_table = ANY (ARRAY['tblTrustReceipts'::text, 'tblTrustPayments'::text]))),
    CONSTRAINT trust_transaction_sync_run_rows_transaction_type_check CHECK ((transaction_type = ANY (ARRAY['receipt'::text, 'payment'::text])))
);

ALTER TABLE panda_realty.trust_transaction_sync_run_rows ALTER COLUMN trust_transaction_sync_run_row_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.trust_transaction_sync_run_ro_trust_transaction_sync_run_ro_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.trust_transaction_sync_runs (
    trust_transaction_sync_run_id bigint NOT NULL,
    status text NOT NULL,
    source_file_name text,
    initiated_by public.citext,
    summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    error text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT trust_transaction_sync_runs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'completed'::text, 'cancelled'::text, 'failed'::text])))
);

ALTER TABLE panda_realty.trust_transaction_sync_runs ALTER COLUMN trust_transaction_sync_run_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.trust_transaction_sync_runs_trust_transaction_sync_run_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE panda_realty.trust_transactions (
    trust_transaction_id bigint NOT NULL,
    transaction_type text NOT NULL,
    transaction_number integer DEFAULT 0 NOT NULL,
    property_list_id bigint NOT NULL,
    counterparty_entity_id bigint,
    counterparty_name public.citext NOT NULL,
    transaction_date date NOT NULL,
    completed_date date NOT NULL,
    amount numeric NOT NULL,
    method public.citext DEFAULT 'EFT'::public.citext NOT NULL,
    details public.citext NOT NULL,
    reference_number public.citext,
    completed_by public.citext,
    comments text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    CONSTRAINT trust_transactions_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT trust_transactions_transaction_type_check CHECK ((transaction_type = ANY (ARRAY['receipt'::text, 'payment'::text])))
);

ALTER TABLE panda_realty.trust_transactions ALTER COLUMN trust_transaction_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME panda_realty.trust_transactions_trust_transaction_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE SEQUENCE panda_realty.updated_embeddings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE panda_realty.updated_embeddings (
    id integer DEFAULT nextval('panda_realty.updated_embeddings_id_seq'::regclass) NOT NULL,
    table_name character varying NOT NULL,
    record_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE ONLY panda_realty.admin_html_files
    ADD CONSTRAINT admin_html_files_pkey PRIMARY KEY (html_file_id);

ALTER TABLE ONLY panda_realty.admin_web_links
    ADD CONSTRAINT admin_web_links_pkey PRIMARY KEY (web_link_id);

ALTER TABLE ONLY panda_realty.agent_tasks
    ADD CONSTRAINT agent_tasks_pkey PRIMARY KEY (agent_task_id);

ALTER TABLE ONLY panda_realty.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (agent_id);

ALTER TABLE ONLY panda_realty.audit_events
    ADD CONSTRAINT audit_events_pkey PRIMARY KEY (audit_event_id);

ALTER TABLE ONLY panda_realty.audit_operations
    ADD CONSTRAINT audit_operations_pkey PRIMARY KEY (audit_operation_id);

ALTER TABLE ONLY panda_realty.booking_requests
    ADD CONSTRAINT booking_requests_pkey PRIMARY KEY (booking_request_id);

ALTER TABLE ONLY panda_realty.booking_response_slots
    ADD CONSTRAINT booking_response_slots_booking_response_id_slot_id_key UNIQUE (booking_response_id, slot_id);

ALTER TABLE ONLY panda_realty.booking_response_slots
    ADD CONSTRAINT booking_response_slots_pkey PRIMARY KEY (booking_response_slot_id);

ALTER TABLE ONLY panda_realty.booking_responses
    ADD CONSTRAINT booking_responses_pkey PRIMARY KEY (booking_response_id);

ALTER TABLE ONLY panda_realty.booking_responses
    ADD CONSTRAINT booking_responses_request_party_unique UNIQUE (booking_request_id, party);

ALTER TABLE ONLY panda_realty.booking_slots
    ADD CONSTRAINT booking_slots_pkey PRIMARY KEY (booking_slot_id);

ALTER TABLE ONLY panda_realty.buyer_offers
    ADD CONSTRAINT buyer_offers_accepted_property_unique UNIQUE (accepted_property_id);

ALTER TABLE ONLY panda_realty.buyer_offers
    ADD CONSTRAINT buyer_offers_pkey PRIMARY KEY (buyer_offer_id);

ALTER TABLE ONLY panda_realty.buyer_preferred_features
    ADD CONSTRAINT buyer_preferred_features_pkey PRIMARY KEY (buyer_preferred_feature_id);

ALTER TABLE ONLY panda_realty.buyer_requirement
    ADD CONSTRAINT buyer_requirement_pkey PRIMARY KEY (buyer_requirement_id);

ALTER TABLE ONLY panda_realty.buyer_requirement
    ADD CONSTRAINT buyer_requirement_requirement_key UNIQUE (requirement);

ALTER TABLE ONLY panda_realty.buyer_requirement
    ADD CONSTRAINT buyer_requirement_requirement_unique UNIQUE (requirement);

ALTER TABLE ONLY panda_realty.buyer_status
    ADD CONSTRAINT buyer_status_buyer_status_key UNIQUE (buyer_status);

ALTER TABLE ONLY panda_realty.buyer_status
    ADD CONSTRAINT buyer_status_buyer_status_unique UNIQUE (buyer_status);

ALTER TABLE ONLY panda_realty.buyer_status
    ADD CONSTRAINT buyer_status_pkey PRIMARY KEY (buyer_status_id);

ALTER TABLE ONLY panda_realty.buyer_status
    ADD CONSTRAINT buyer_status_slug_key UNIQUE (slug);

ALTER TABLE ONLY panda_realty.buyer_status
    ADD CONSTRAINT buyer_status_slug_unique UNIQUE (slug);

ALTER TABLE ONLY panda_realty.buyer_viewed_properties
    ADD CONSTRAINT buyer_viewed_properties_pkey PRIMARY KEY (buyer_viewed_property_id);

ALTER TABLE ONLY panda_realty.condition_channel_settings
    ADD CONSTRAINT condition_channel_settings_pkey PRIMARY KEY (property_list_id);

ALTER TABLE ONLY panda_realty.condition_completions
    ADD CONSTRAINT condition_completions_pkey PRIMARY KEY (buyer_offer_id, condition_key);

ALTER TABLE ONLY panda_realty.condition_delivery_attempts
    ADD CONSTRAINT condition_delivery_attempts_pkey PRIMARY KEY (attempt_id);

ALTER TABLE ONLY panda_realty.condition_delivery_events
    ADD CONSTRAINT condition_delivery_events_pkey PRIMARY KEY (event_key);

ALTER TABLE ONLY panda_realty.condition_reminder_deliveries
    ADD CONSTRAINT condition_reminder_deliveries_pkey PRIMARY KEY (delivery_key);

ALTER TABLE ONLY panda_realty.condition_reminder_incidents
    ADD CONSTRAINT condition_reminder_incidents_pkey PRIMARY KEY (incident_key);

ALTER TABLE ONLY panda_realty.condition_reminder_runs
    ADD CONSTRAINT condition_reminder_runs_pkey PRIMARY KEY (run_id);

ALTER TABLE ONLY panda_realty.condition_retention_runs
    ADD CONSTRAINT condition_retention_runs_pkey PRIMARY KEY (retention_run_id);

ALTER TABLE ONLY panda_realty.contact_categories
    ADD CONSTRAINT contact_categories_contact_category_name_key UNIQUE (contact_category_name);

ALTER TABLE ONLY panda_realty.contact_categories
    ADD CONSTRAINT contact_categories_contact_category_name_unique UNIQUE (contact_category_name);

ALTER TABLE ONLY panda_realty.contact_categories
    ADD CONSTRAINT contact_categories_pkey PRIMARY KEY (contact_category_id);

ALTER TABLE ONLY panda_realty.contact_categories
    ADD CONSTRAINT contact_categories_slug_key UNIQUE (slug);

ALTER TABLE ONLY panda_realty.contact_categories
    ADD CONSTRAINT contact_categories_slug_unique UNIQUE (slug);

ALTER TABLE ONLY panda_realty.property_document_acknowledgements
    ADD CONSTRAINT document_acknowledgement_nonce UNIQUE (property_list_id, request_nonce);

ALTER TABLE ONLY panda_realty.email_signatures
    ADD CONSTRAINT email_signatures_pkey PRIMARY KEY (email_signature_id);

ALTER TABLE ONLY panda_realty.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (email_template_id);

ALTER TABLE ONLY panda_realty.entities
    ADD CONSTRAINT entities_pkey PRIMARY KEY (entity_id);

ALTER TABLE ONLY panda_realty.entity_buyer_requirements
    ADD CONSTRAINT entity_buyer_requirements_pkey PRIMARY KEY (entity_buyer_requirement_id);

ALTER TABLE ONLY panda_realty.entity_buyer_statuses
    ADD CONSTRAINT entity_buyer_statuses_entity_id_buyer_status_id_key UNIQUE (entity_id, buyer_status_id);

ALTER TABLE ONLY panda_realty.entity_buyer_statuses
    ADD CONSTRAINT entity_buyer_statuses_pkey PRIMARY KEY (entity_buyer_status_id);

ALTER TABLE ONLY panda_realty.entity_categories
    ADD CONSTRAINT entity_categories_entity_category_name_key UNIQUE (entity_category_name);

ALTER TABLE ONLY panda_realty.entity_categories
    ADD CONSTRAINT entity_categories_entity_category_name_unique UNIQUE (entity_category_name);

ALTER TABLE ONLY panda_realty.entity_categories
    ADD CONSTRAINT entity_categories_pkey PRIMARY KEY (entity_category_id);

ALTER TABLE ONLY panda_realty.entity_categories
    ADD CONSTRAINT entity_categories_slug_key UNIQUE (slug);

ALTER TABLE ONLY panda_realty.entity_categories
    ADD CONSTRAINT entity_categories_slug_unique UNIQUE (slug);

ALTER TABLE ONLY panda_realty.entity_members
    ADD CONSTRAINT entity_members_pkey PRIMARY KEY (entity_member_id);

ALTER TABLE ONLY panda_realty.event_timelines
    ADD CONSTRAINT event_timelines_pkey PRIMARY KEY (event_timeline_id);

ALTER TABLE ONLY panda_realty.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (event_id);

ALTER TABLE ONLY panda_realty.gmail_oauth_tokens
    ADD CONSTRAINT gmail_oauth_tokens_pkey PRIMARY KEY (id);

ALTER TABLE ONLY panda_realty.invoice_document_profiles
    ADD CONSTRAINT invoice_document_profiles_pkey PRIMARY KEY (revision);

ALTER TABLE ONLY panda_realty.lead_imports
    ADD CONSTRAINT lead_imports_pkey PRIMARY KEY (lead_import_id);

ALTER TABLE ONLY panda_realty.lead_imports
    ADD CONSTRAINT lead_imports_source_email_advertisement_id_key UNIQUE (source_email, advertisement_id);

ALTER TABLE ONLY panda_realty.lead_sources
    ADD CONSTRAINT lead_sources_lead_source_key UNIQUE (lead_source);

ALTER TABLE ONLY panda_realty.lead_sources
    ADD CONSTRAINT lead_sources_lead_source_unique UNIQUE (lead_source);

ALTER TABLE ONLY panda_realty.lead_sources
    ADD CONSTRAINT lead_sources_pkey PRIMARY KEY (lead_source_id);

ALTER TABLE ONLY panda_realty.lead_sources
    ADD CONSTRAINT lead_sources_slug_key UNIQUE (slug);

ALTER TABLE ONLY panda_realty.lead_sources
    ADD CONSTRAINT lead_sources_slug_unique UNIQUE (slug);

ALTER TABLE ONLY panda_realty.note_category_colors
    ADD CONSTRAINT note_category_colors_pkey PRIMARY KEY (category_key);

ALTER TABLE ONLY panda_realty.offer_form_submissions
    ADD CONSTRAINT offer_form_submissions_pkey PRIMARY KEY (offer_form_submission_id);

ALTER TABLE ONLY panda_realty.offer_form_tokens
    ADD CONSTRAINT offer_form_tokens_pkey PRIMARY KEY (offer_form_token_id);

ALTER TABLE ONLY panda_realty.offer_form_tokens
    ADD CONSTRAINT offer_form_tokens_token_key UNIQUE (token);

ALTER TABLE ONLY panda_realty.offer_form_tokens
    ADD CONSTRAINT offer_form_tokens_token_unique UNIQUE (token);

ALTER TABLE ONLY panda_realty.panda_address_type_conversions
    ADD CONSTRAINT panda_address_type_conversions_address_text_unique UNIQUE (address_text);

ALTER TABLE ONLY panda_realty.panda_address_type_conversions
    ADD CONSTRAINT panda_address_type_conversions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY panda_realty.panda_properties
    ADD CONSTRAINT panda_properties_open_in_rpp_unique UNIQUE (open_in_rpp);

ALTER TABLE ONLY panda_realty.panda_properties
    ADD CONSTRAINT panda_properties_pkey PRIMARY KEY (property_list_id);

ALTER TABLE ONLY panda_realty.panda_property_types
    ADD CONSTRAINT panda_property_types_label_key UNIQUE (label);

ALTER TABLE ONLY panda_realty.panda_property_types
    ADD CONSTRAINT panda_property_types_label_unique UNIQUE (label);

ALTER TABLE ONLY panda_realty.panda_property_types
    ADD CONSTRAINT panda_property_types_pkey PRIMARY KEY (property_type_id);

ALTER TABLE ONLY panda_realty.panda_suburbs
    ADD CONSTRAINT panda_suburbs_pkey PRIMARY KEY (suburb_id);

ALTER TABLE ONLY panda_realty.panda_suburbs
    ADD CONSTRAINT panda_suburbs_suburb_state_unique UNIQUE (suburb, state);

ALTER TABLE ONLY panda_realty.portal_file_sign_requests
    ADD CONSTRAINT portal_file_sign_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY panda_realty.portal_link_sends
    ADD CONSTRAINT portal_link_sends_pkey PRIMARY KEY (portal_link_send_id);

ALTER TABLE ONLY panda_realty.portal_messages
    ADD CONSTRAINT portal_messages_pkey PRIMARY KEY (portal_message_id);

ALTER TABLE ONLY panda_realty.portal_tokens
    ADD CONSTRAINT portal_tokens_pkey PRIMARY KEY (portal_token_id);

ALTER TABLE ONLY panda_realty.portal_tokens
    ADD CONSTRAINT portal_tokens_token_key UNIQUE (token);

ALTER TABLE ONLY panda_realty.portal_tokens
    ADD CONSTRAINT portal_tokens_token_unique UNIQUE (token);

ALTER TABLE ONLY panda_realty.property_buyer_receipt_consumptions
    ADD CONSTRAINT property_buyer_receipt_consumptions_pkey PRIMARY KEY (consumption_id);

ALTER TABLE ONLY panda_realty.property_deposit_contract_reviews
    ADD CONSTRAINT property_deposit_contract_reviews_pkey PRIMARY KEY (attempt_id);

ALTER TABLE ONLY panda_realty.property_document_acknowledgements
    ADD CONSTRAINT property_document_acknowledgements_pkey PRIMARY KEY (acknowledgement_id);

ALTER TABLE ONLY panda_realty.property_document_preparations
    ADD CONSTRAINT property_document_preparations_pkey PRIMARY KEY (preparation_id);

ALTER TABLE ONLY panda_realty.property_document_sends
    ADD CONSTRAINT property_document_sends_pkey PRIMARY KEY (send_id);

ALTER TABLE ONLY panda_realty.property_document_sends
    ADD CONSTRAINT property_document_sends_rfc_message_id_key UNIQUE (rfc_message_id);

ALTER TABLE ONLY panda_realty.property_entities
    ADD CONSTRAINT property_entities_accepted_property_pair UNIQUE (property_entity_id, property_list_id);

ALTER TABLE ONLY panda_realty.property_entities
    ADD CONSTRAINT property_entities_pkey PRIMARY KEY (property_entity_id);

ALTER TABLE ONLY panda_realty.property_entity_files
    ADD CONSTRAINT property_entity_files_pkey PRIMARY KEY (property_entity_file_id);

ALTER TABLE ONLY panda_realty.property_entity_notes
    ADD CONSTRAINT property_entity_notes_pkey PRIMARY KEY (property_entity_note_id);

ALTER TABLE ONLY panda_realty.property_events
    ADD CONSTRAINT property_events_pkey PRIMARY KEY (property_event_id);

ALTER TABLE ONLY panda_realty.property_expense_payments
    ADD CONSTRAINT property_expense_payments_pkey PRIMARY KEY (link_id);

ALTER TABLE ONLY panda_realty.property_expense_payments
    ADD CONSTRAINT property_expense_payments_trust_transaction_id_key UNIQUE (trust_transaction_id);

ALTER TABLE ONLY panda_realty.property_expenses
    ADD CONSTRAINT property_expenses_pkey PRIMARY KEY (expense_id);

ALTER TABLE ONLY panda_realty.property_finance_allocations
    ADD CONSTRAINT property_finance_allocations_pkey PRIMARY KEY (allocation_id);

ALTER TABLE ONLY panda_realty.property_finance_due_work
    ADD CONSTRAINT property_finance_due_work_pkey PRIMARY KEY (due_id);

ALTER TABLE ONLY panda_realty.property_finance_due_work
    ADD CONSTRAINT property_finance_due_work_property_list_id_target_kind_targ_key UNIQUE (property_list_id, target_kind, target_id);

ALTER TABLE ONLY panda_realty.property_finance_evidence
    ADD CONSTRAINT property_finance_evidence_external_identity_key_key UNIQUE (external_identity_key);

ALTER TABLE ONLY panda_realty.property_finance_evidence
    ADD CONSTRAINT property_finance_evidence_external_provider_key_key UNIQUE (external_provider_key);

ALTER TABLE ONLY panda_realty.property_finance_evidence
    ADD CONSTRAINT property_finance_evidence_pkey PRIMARY KEY (evidence_id);

ALTER TABLE ONLY panda_realty.property_finance_evidence
    ADD CONSTRAINT property_finance_evidence_trust_transaction_id_key UNIQUE (trust_transaction_id);

ALTER TABLE ONLY panda_realty.property_finance_operations
    ADD CONSTRAINT property_finance_operations_pkey PRIMARY KEY (property_list_id, request_nonce);

ALTER TABLE ONLY panda_realty.property_form_recipient_prefs
    ADD CONSTRAINT property_form_recipient_prefs_pkey PRIMARY KEY (property_list_id, property_form_id);

ALTER TABLE ONLY panda_realty.property_form_sends
    ADD CONSTRAINT property_form_sends_pkey PRIMARY KEY (property_form_send_id);

ALTER TABLE ONLY panda_realty.property_form_sign_requests
    ADD CONSTRAINT property_form_sign_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY panda_realty.property_forms
    ADD CONSTRAINT property_forms_pkey PRIMARY KEY (property_form_id);

ALTER TABLE ONLY panda_realty.property_import_action_rows
    ADD CONSTRAINT property_import_action_rows_pkey PRIMARY KEY (import_action_row_id);

ALTER TABLE ONLY panda_realty.property_import_actions
    ADD CONSTRAINT property_import_actions_pkey PRIMARY KEY (import_action_id);

ALTER TABLE ONLY panda_realty.property_import_job_chunks
    ADD CONSTRAINT property_import_job_chunks_pkey PRIMARY KEY (import_job_chunk_id);

ALTER TABLE ONLY panda_realty.property_import_job_chunks
    ADD CONSTRAINT property_import_job_chunks_run_index_unique UNIQUE (import_run_id, chunk_index);

ALTER TABLE ONLY panda_realty.property_import_rows
    ADD CONSTRAINT property_import_rows_pkey PRIMARY KEY (import_row_id);

ALTER TABLE ONLY panda_realty.property_import_runs
    ADD CONSTRAINT property_import_runs_pkey PRIMARY KEY (import_run_id);

ALTER TABLE ONLY panda_realty.property_import_staged_rows
    ADD CONSTRAINT property_import_staged_rows_import_run_id_source_row_index_key UNIQUE (import_run_id, source_row_index);

ALTER TABLE ONLY panda_realty.property_import_staged_rows
    ADD CONSTRAINT property_import_staged_rows_pkey PRIMARY KEY (property_import_staged_row_id);

ALTER TABLE ONLY panda_realty.property_invoice_artifacts
    ADD CONSTRAINT property_invoice_artifacts_issue_id_key UNIQUE (issue_id);

ALTER TABLE ONLY panda_realty.property_invoice_artifacts
    ADD CONSTRAINT property_invoice_artifacts_pkey PRIMARY KEY (artifact_id);

ALTER TABLE ONLY panda_realty.property_invoice_draft_versions
    ADD CONSTRAINT property_invoice_draft_versions_draft_id_request_nonce_key UNIQUE (draft_id, request_nonce);

ALTER TABLE ONLY panda_realty.property_invoice_draft_versions
    ADD CONSTRAINT property_invoice_draft_versions_pkey PRIMARY KEY (draft_id, revision);

ALTER TABLE ONLY panda_realty.property_invoice_drafts
    ADD CONSTRAINT property_invoice_drafts_pkey PRIMARY KEY (draft_id);

ALTER TABLE ONLY panda_realty.property_invoice_drafts
    ADD CONSTRAINT property_invoice_drafts_property_list_id_attempt_id_listing_key UNIQUE NULLS NOT DISTINCT (property_list_id, attempt_id, listing_id);

ALTER TABLE ONLY panda_realty.property_invoice_file_references
    ADD CONSTRAINT property_invoice_file_references_pkey PRIMARY KEY (issue_id, file_id);

ALTER TABLE ONLY panda_realty.property_invoice_issue_events
    ADD CONSTRAINT property_invoice_issue_events_issue_id_operation_key UNIQUE (issue_id, operation);

ALTER TABLE ONLY panda_realty.property_invoice_issue_events
    ADD CONSTRAINT property_invoice_issue_events_pkey PRIMARY KEY (event_id);

ALTER TABLE ONLY panda_realty.property_invoice_issue_events
    ADD CONSTRAINT property_invoice_issue_events_property_list_id_request_nonc_key UNIQUE (property_list_id, request_nonce);

ALTER TABLE ONLY panda_realty.property_invoice_issues
    ADD CONSTRAINT property_invoice_issues_draft_id_draft_revision_key UNIQUE (draft_id, draft_revision);

ALTER TABLE ONLY panda_realty.property_invoice_issues
    ADD CONSTRAINT property_invoice_issues_invoice_number_key UNIQUE (invoice_number);

ALTER TABLE ONLY panda_realty.property_invoice_issues
    ADD CONSTRAINT property_invoice_issues_pkey PRIMARY KEY (issue_id);

ALTER TABLE ONLY panda_realty.property_invoice_issues
    ADD CONSTRAINT property_invoice_issues_property_list_id_request_nonce_key UNIQUE (property_list_id, request_nonce);

ALTER TABLE ONLY panda_realty.property_invoice_issues
    ADD CONSTRAINT property_invoice_issues_replaces_issue_id_key UNIQUE (replaces_issue_id);

ALTER TABLE ONLY panda_realty.property_list_files
    ADD CONSTRAINT property_list_files_pkey PRIMARY KEY (property_list_file_id);

ALTER TABLE ONLY panda_realty.property_list_notes
    ADD CONSTRAINT property_list_notes_pkey PRIMARY KEY (property_list_note_id);

ALTER TABLE ONLY panda_realty.property_list_notes
    ADD CONSTRAINT property_list_notes_portal_message_id_key UNIQUE (portal_message_id);

ALTER TABLE ONLY panda_realty.property_meetings
    ADD CONSTRAINT property_meetings_pkey PRIMARY KEY (property_meeting_id);

ALTER TABLE ONLY panda_realty.property_payment_attributions
    ADD CONSTRAINT property_payment_attributions_allocation_id_key UNIQUE (allocation_id);

ALTER TABLE ONLY panda_realty.property_payment_attributions
    ADD CONSTRAINT property_payment_attributions_pkey PRIMARY KEY (attribution_id);

ALTER TABLE ONLY panda_realty.property_payment_obligation_versions
    ADD CONSTRAINT property_payment_obligation_versions_pkey PRIMARY KEY (obligation_id, revision);

ALTER TABLE ONLY panda_realty.property_payment_obligations
    ADD CONSTRAINT property_payment_obligations_pkey PRIMARY KEY (obligation_id);

ALTER TABLE ONLY panda_realty.property_payment_request_sends
    ADD CONSTRAINT property_payment_request_sends_pkey PRIMARY KEY (send_id);

ALTER TABLE ONLY panda_realty.property_payment_request_sends
    ADD CONSTRAINT property_payment_request_sends_rfc_message_id_key UNIQUE (rfc_message_id);

ALTER TABLE ONLY panda_realty.property_payment_requests
    ADD CONSTRAINT property_payment_requests_pkey PRIMARY KEY (request_id);

ALTER TABLE ONLY panda_realty.property_payment_requests
    ADD CONSTRAINT property_payment_requests_property_list_id_attempt_id_listi_key UNIQUE NULLS NOT DISTINCT (property_list_id, attempt_id, listing_id, event_key, expense_id);

ALTER TABLE ONLY panda_realty.property_payment_reviews
    ADD CONSTRAINT property_payment_reviews_pkey PRIMARY KEY (review_id);

ALTER TABLE ONLY panda_realty.property_status
    ADD CONSTRAINT property_status_pkey PRIMARY KEY (property_status_id);

ALTER TABLE ONLY panda_realty.property_status
    ADD CONSTRAINT property_status_property_status_code_key UNIQUE (property_status_code);

ALTER TABLE ONLY panda_realty.property_status
    ADD CONSTRAINT property_status_property_status_code_unique UNIQUE (property_status_code);

ALTER TABLE ONLY panda_realty.property_status
    ADD CONSTRAINT property_status_slug_key UNIQUE (slug);

ALTER TABLE ONLY panda_realty.property_status
    ADD CONSTRAINT property_status_slug_unique UNIQUE (slug);

ALTER TABLE ONLY panda_realty.property_thread_tags
    ADD CONSTRAINT property_thread_tags_pkey PRIMARY KEY (property_thread_tag_id);

ALTER TABLE ONLY panda_realty.property_timeline_acknowledgements
    ADD CONSTRAINT property_timeline_ack_scope_unique UNIQUE NULLS NOT DISTINCT (property_list_id, attempt_id, event_key);

ALTER TABLE ONLY panda_realty.property_timeline_acknowledgements
    ADD CONSTRAINT property_timeline_acknowledgements_pkey PRIMARY KEY (acknowledgement_id);

ALTER TABLE ONLY panda_realty.property_timeline_attempts
    ADD CONSTRAINT property_timeline_attempts_pkey PRIMARY KEY (attempt_id);

ALTER TABLE ONLY panda_realty.property_timeline_changes
    ADD CONSTRAINT property_timeline_changes_pkey PRIMARY KEY (change_id);

ALTER TABLE ONLY panda_realty.property_timeline_evidence
    ADD CONSTRAINT property_timeline_evidence_pkey PRIMARY KEY (trust_transaction_id);

ALTER TABLE ONLY panda_realty.property_timeline_listing_state
    ADD CONSTRAINT property_timeline_listing_state_pkey PRIMARY KEY (property_list_id);

ALTER TABLE ONLY panda_realty.property_timeline_record_links
    ADD CONSTRAINT property_timeline_record_link_property_list_id_attempt_id_e_key UNIQUE NULLS NOT DISTINCT (property_list_id, attempt_id, event_key, record_kind, record_id);

ALTER TABLE ONLY panda_realty.property_timeline_record_links
    ADD CONSTRAINT property_timeline_record_links_pkey PRIMARY KEY (record_link_id);

ALTER TABLE ONLY panda_realty.property_timeline_solicitor_preparations
    ADD CONSTRAINT property_timeline_solicitor_preparations_pkey PRIMARY KEY (trust_transaction_id);

ALTER TABLE ONLY panda_realty.public_offer_form_tokens
    ADD CONSTRAINT public_offer_form_tokens_pkey PRIMARY KEY (public_offer_form_token_id);

ALTER TABLE ONLY panda_realty.public_offer_form_tokens
    ADD CONSTRAINT public_offer_form_tokens_property_list_id_unique UNIQUE (property_list_id);

ALTER TABLE ONLY panda_realty.public_offer_form_tokens
    ADD CONSTRAINT public_offer_form_tokens_token_key UNIQUE (token);

ALTER TABLE ONLY panda_realty.table_definitions
    ADD CONSTRAINT table_definitions_table_name_key UNIQUE (table_name);

ALTER TABLE ONLY panda_realty.trust_bank_reference_reviews
    ADD CONSTRAINT trust_bank_reference_reviews_pkey PRIMARY KEY (trust_transaction_id);

ALTER TABLE ONLY panda_realty.trust_bank_reference_settings
    ADD CONSTRAINT trust_bank_reference_settings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY panda_realty.trust_deposit_contexts
    ADD CONSTRAINT trust_deposit_contexts_pkey PRIMARY KEY (trust_transaction_id);

ALTER TABLE ONLY panda_realty.trust_property_sync_run_properties
    ADD CONSTRAINT trust_property_sync_run_properties_pkey PRIMARY KEY (trust_property_sync_run_property_id);

ALTER TABLE ONLY panda_realty.trust_property_sync_runs
    ADD CONSTRAINT trust_property_sync_runs_pkey PRIMARY KEY (trust_property_sync_run_id);

ALTER TABLE ONLY panda_realty.trust_receipt_settings
    ADD CONSTRAINT trust_receipt_settings_pkey PRIMARY KEY (trust_receipt_settings_id);

ALTER TABLE ONLY panda_realty.trust_reconciliation_outstanding_items
    ADD CONSTRAINT trust_reconciliation_outstanding_items_pkey PRIMARY KEY (trust_reconciliation_outstanding_item_id);

ALTER TABLE ONLY panda_realty.trust_reconciliations
    ADD CONSTRAINT trust_reconciliations_period_unique UNIQUE (period);

ALTER TABLE ONLY panda_realty.trust_reconciliations
    ADD CONSTRAINT trust_reconciliations_pkey PRIMARY KEY (trust_reconciliation_id);

ALTER TABLE ONLY panda_realty.trust_transaction_imports
    ADD CONSTRAINT trust_transaction_imports_pkey PRIMARY KEY (trust_transaction_import_id);

ALTER TABLE ONLY panda_realty.trust_transaction_imports
    ADD CONSTRAINT trust_transaction_imports_source_unique UNIQUE (source_table, source_id);

ALTER TABLE ONLY panda_realty.trust_transaction_sync_run_rows
    ADD CONSTRAINT trust_transaction_sync_run_rows_pkey PRIMARY KEY (trust_transaction_sync_run_row_id);

ALTER TABLE ONLY panda_realty.trust_transaction_sync_runs
    ADD CONSTRAINT trust_transaction_sync_runs_pkey PRIMARY KEY (trust_transaction_sync_run_id);

ALTER TABLE ONLY panda_realty.trust_transactions
    ADD CONSTRAINT trust_transactions_pkey PRIMARY KEY (trust_transaction_id);

ALTER TABLE ONLY panda_realty.trust_transactions
    ADD CONSTRAINT trust_transactions_type_number_unique UNIQUE (transaction_type, transaction_number) DEFERRABLE;

ALTER TABLE ONLY panda_realty.updated_embeddings
    ADD CONSTRAINT updated_embeddings_pkey PRIMARY KEY (id);

CREATE INDEX admin_html_files_user_email_idx ON panda_realty.admin_html_files USING btree (user_email);

CREATE INDEX admin_web_links_user_email_idx ON panda_realty.admin_web_links USING btree (user_email);

CREATE UNIQUE INDEX audit_events_legacy_fingerprint_unique ON panda_realty.audit_events USING btree (legacy_fingerprint) WHERE (legacy_fingerprint IS NOT NULL);

CREATE INDEX audit_events_occurred_at_idx ON panda_realty.audit_events USING btree (occurred_at);

CREATE INDEX audit_events_operation_id_idx ON panda_realty.audit_events USING btree (audit_operation_id);

CREATE INDEX audit_events_table_primary_key_idx ON panda_realty.audit_events USING btree (table_name, audit_event_id);

CREATE INDEX audit_operations_actor_user_id_idx ON panda_realty.audit_operations USING btree (actor_user_id);

CREATE INDEX audit_operations_created_at_idx ON panda_realty.audit_operations USING btree (created_at);

CREATE INDEX booking_requests_property_entity_idx ON panda_realty.booking_requests USING btree (property_entity_id);

CREATE INDEX booking_requests_property_list_idx ON panda_realty.booking_requests USING btree (property_list_id);

CREATE INDEX booking_responses_request_idx ON panda_realty.booking_responses USING btree (booking_request_id);

CREATE INDEX booking_slots_request_idx ON panda_realty.booking_slots USING btree (booking_request_id);

CREATE INDEX buyer_consumption_outgoing ON panda_realty.property_buyer_receipt_consumptions USING btree (payment_evidence_id);

CREATE INDEX buyer_consumption_receipt ON panda_realty.property_buyer_receipt_consumptions USING btree (receipt_transaction_id);

CREATE INDEX condition_delivery_attempts_check_idx ON panda_realty.condition_delivery_attempts USING btree (checked_at, created_at) WHERE (outcome = ANY (ARRAY['pending'::text, 'accepted'::text, 'unknown'::text, 'partial'::text]));

CREATE INDEX condition_delivery_attempts_delivery_idx ON panda_realty.condition_delivery_attempts USING btree (delivery_key);

CREATE INDEX condition_delivery_attempts_provider_idx ON panda_realty.condition_delivery_attempts USING btree (provider_message_id, recipient) WHERE (channel = 'sms'::text);

CREATE INDEX condition_delivery_events_attempt_idx ON panda_realty.condition_delivery_events USING btree (attempt_id);

CREATE INDEX deposit_contract_review_property ON panda_realty.property_deposit_contract_reviews USING btree (property_list_id) WHERE (confirmed_at IS NOT NULL);

CREATE INDEX deposit_contract_review_source ON panda_realty.property_deposit_contract_reviews USING btree (source_kind, source_id) WHERE (confirmed_at IS NOT NULL);

CREATE INDEX document_acknowledgement_property ON panda_realty.property_document_acknowledgements USING btree (property_list_id, created_at DESC);

CREATE INDEX document_send_property ON panda_realty.property_document_sends USING btree (property_list_id, created_at DESC);

CREATE UNIQUE INDEX document_send_unresolved ON panda_realty.property_document_sends USING btree (property_list_id, document_key) WHERE (status = ANY (ARRAY['sending'::text, 'unknown'::text]));

CREATE UNIQUE INDEX email_signatures_single_default_idx ON panda_realty.email_signatures USING btree (is_default) WHERE (is_default = true);

CREATE UNIQUE INDEX entity_members_one_buyers_rep_per_entity ON panda_realty.entity_members USING btree (entity_id) WHERE (is_buyers_representative = true);

CREATE UNIQUE INDEX entity_members_one_sellers_rep_per_entity ON panda_realty.entity_members USING btree (entity_id) WHERE (is_sellers_representative = true);

CREATE INDEX expense_payment_property ON panda_realty.property_expense_payments USING btree (property_list_id);

CREATE INDEX finance_allocation_property ON panda_realty.property_finance_allocations USING btree (property_list_id, updated_at);

CREATE INDEX finance_allocation_source ON panda_realty.property_finance_allocations USING btree (evidence_id) WHERE (NOT voided);

CREATE INDEX finance_due_calendar ON panda_realty.property_finance_due_work USING btree (due_date) WHERE ((NOT cancelled) AND (due_date IS NOT NULL));

CREATE INDEX finance_due_property ON panda_realty.property_finance_due_work USING btree (property_list_id, updated_at);

CREATE INDEX finance_evidence_property ON panda_realty.property_finance_evidence USING btree (property_list_id, updated_at);

CREATE INDEX idx_contact_category_id ON panda_realty.entities USING btree (contact_category_id);

CREATE INDEX idx_created_updated_buyer_offers ON panda_realty.buyer_offers USING btree (created_at, updated_at);

CREATE INDEX idx_created_updated_buyer_status ON panda_realty.buyer_status USING btree (created_at, updated_at);

CREATE INDEX idx_created_updated_contact_categories ON panda_realty.contact_categories USING btree (created_at, updated_at);

CREATE INDEX idx_created_updated_entities ON panda_realty.entities USING btree (created_at, updated_at);

CREATE INDEX idx_created_updated_entity_categories ON panda_realty.entity_categories USING btree (created_at, updated_at);

CREATE INDEX idx_created_updated_entity_members ON panda_realty.entity_members USING btree (created_at, updated_at);

CREATE INDEX idx_created_updated_event_timelines ON panda_realty.event_timelines USING btree (created_at, updated_at);

CREATE INDEX idx_created_updated_events ON panda_realty.events USING btree (created_at, updated_at);

CREATE INDEX idx_created_updated_lead_sources ON panda_realty.lead_sources USING btree (created_at, updated_at);

CREATE INDEX idx_created_updated_panda_properties ON panda_realty.panda_properties USING btree (created_at, updated_at);

CREATE INDEX idx_created_updated_property_entities ON panda_realty.property_entities USING btree (created_at, updated_at);

CREATE INDEX idx_created_updated_property_entity_files ON panda_realty.property_entity_files USING btree (created_at, updated_at);

CREATE INDEX idx_created_updated_property_status ON panda_realty.property_status USING btree (created_at, updated_at);

CREATE INDEX idx_deleted_records_created_at ON panda_realty.deleted_records USING btree (created_at);

CREATE INDEX idx_entity_buyer_statuses_buyer_status_id ON panda_realty.entity_buyer_statuses USING btree (buyer_status_id);

CREATE INDEX idx_entity_buyer_statuses_entity_id ON panda_realty.entity_buyer_statuses USING btree (entity_id);

CREATE INDEX idx_entity_category_id ON panda_realty.entities USING btree (entity_category_id);

CREATE INDEX idx_entity_id ON panda_realty.entity_members USING btree (entity_id);

CREATE UNIQUE INDEX idx_entity_property_unique ON panda_realty.property_entities USING btree (entity_id, property_list_id);

CREATE INDEX idx_lead_source_id ON panda_realty.entities USING btree (lead_source_id);

CREATE INDEX idx_panda_street_key ON panda_realty.panda_properties USING btree (panda_realty.panda_street_key((street_address)::text));

CREATE INDEX idx_property_list_id ON panda_realty.property_entities USING btree (property_list_id);

CREATE INDEX idx_property_status_id ON panda_realty.panda_properties USING btree (property_status_id);

CREATE INDEX invoice_artifact_property ON panda_realty.property_invoice_artifacts USING btree (property_list_id, created_at DESC, artifact_id);

CREATE UNIQUE INDEX invoice_draft_original_export ON panda_realty.property_invoice_artifacts USING btree (draft_id, draft_revision, kind) WHERE (kind = 'draft'::text);

CREATE INDEX invoice_issue_property ON panda_realty.property_invoice_issues USING btree (property_list_id, created_at DESC, issue_id);

CREATE INDEX invoice_versions_property ON panda_realty.property_invoice_draft_versions USING btree (property_list_id, created_at DESC);

CREATE INDEX panda_properties_favorite_property_list_id_idx ON panda_realty.panda_properties USING btree (property_list_id) WHERE is_favorite;

CREATE INDEX panda_properties_rp_identity_idx ON panda_realty.panda_properties USING btree (panda_realty.property_rp_identity((open_in_rpp)::text));

CREATE INDEX payment_attribution_evidence ON panda_realty.property_payment_attributions USING btree (evidence_id);

CREATE INDEX payment_attribution_property ON panda_realty.property_payment_attributions USING btree (property_list_id, created_at DESC);

CREATE INDEX payment_obligation_property ON panda_realty.property_payment_obligations USING btree (property_list_id);

CREATE INDEX payment_request_property ON panda_realty.property_payment_requests USING btree (property_list_id);

CREATE UNIQUE INDEX payment_request_unresolved_send ON panda_realty.property_payment_request_sends USING btree (request_id) WHERE (status = ANY (ARRAY['sending'::text, 'unknown'::text]));

CREATE INDEX payment_review_property ON panda_realty.property_payment_reviews USING btree (property_list_id, created_at DESC);

CREATE INDEX portal_file_sign_requests_agreement_id_idx ON panda_realty.portal_file_sign_requests USING btree (adobe_sign_agreement_id);

CREATE INDEX portal_file_sign_requests_provider_envelope_id_idx ON panda_realty.portal_file_sign_requests USING btree (provider_envelope_id);

CREATE UNIQUE INDEX portal_messages_inbound_email_message_id_key ON panda_realty.portal_messages USING btree (inbound_email_message_id);

CREATE INDEX portal_messages_token_sent_idx ON panda_realty.portal_messages USING btree (portal_token_id, sent_at DESC);

CREATE UNIQUE INDEX portal_tokens_one_active_buyer ON panda_realty.portal_tokens USING btree (property_entity_id) WHERE ((role = 'buyer'::text) AND (revoked_at IS NULL));

CREATE UNIQUE INDEX portal_tokens_one_active_seller ON panda_realty.portal_tokens USING btree (property_list_id) WHERE ((role = 'seller'::text) AND (revoked_at IS NULL));

CREATE INDEX property_events_property_list_id_idx ON panda_realty.property_events USING btree (property_list_id);

CREATE INDEX property_expense_property ON panda_realty.property_expenses USING btree (property_list_id);

CREATE INDEX property_form_sign_requests_agreement_id_idx ON panda_realty.property_form_sign_requests USING btree (adobe_sign_agreement_id);

CREATE INDEX property_form_sign_requests_provider_envelope_id_idx ON panda_realty.property_form_sign_requests USING btree (provider_envelope_id);

CREATE INDEX property_form_sign_requests_send_id_idx ON panda_realty.property_form_sign_requests USING btree (property_form_send_id);

CREATE INDEX property_import_action_rows_action_id_idx ON panda_realty.property_import_action_rows USING btree (import_action_id);

CREATE UNIQUE INDEX property_import_action_rows_source_unique ON panda_realty.property_import_action_rows USING btree (import_action_id, import_row_id);

CREATE UNIQUE INDEX property_import_actions_active_run_unique ON panda_realty.property_import_actions USING btree (import_run_id) WHERE (status = ANY (ARRAY['queued'::text, 'running'::text]));

CREATE INDEX property_import_actions_run_id_idx ON panda_realty.property_import_actions USING btree (import_run_id);

CREATE INDEX property_import_job_chunks_run_id_idx ON panda_realty.property_import_job_chunks USING btree (import_run_id);

CREATE INDEX property_import_job_chunks_status_idx ON panda_realty.property_import_job_chunks USING btree (status);

CREATE INDEX property_import_rows_property_id_idx ON panda_realty.property_import_rows USING btree (property_list_id);

CREATE INDEX property_import_rows_run_id_idx ON panda_realty.property_import_rows USING btree (import_run_id);

CREATE UNIQUE INDEX property_import_rows_run_source_unique ON panda_realty.property_import_rows USING btree (import_run_id, source_row_index);

CREATE INDEX property_import_runs_created_at_idx ON panda_realty.property_import_runs USING btree (created_at);

CREATE INDEX property_import_runs_status_idx ON panda_realty.property_import_runs USING btree (status);

CREATE INDEX property_import_staged_rows_run_id_idx ON panda_realty.property_import_staged_rows USING btree (import_run_id);

CREATE INDEX property_import_staged_rows_run_outcome_idx ON panda_realty.property_import_staged_rows USING btree (import_run_id, outcome);

CREATE INDEX property_list_files_property_list_id_idx ON panda_realty.property_list_files USING btree (property_list_id);

CREATE UNIQUE INDEX property_thread_tags_property_thread_unique ON panda_realty.property_thread_tags USING btree (property_list_id, thread_id);

CREATE UNIQUE INDEX property_timeline_active_attempt ON panda_realty.property_timeline_attempts USING btree (property_list_id) WHERE (ended_at IS NULL);

CREATE INDEX property_timeline_attempt_history ON panda_realty.property_timeline_attempts USING btree (property_list_id, started_at);

CREATE INDEX property_timeline_changes_property_scope_idx ON panda_realty.property_timeline_changes USING btree (property_list_id, attempt_id, change_id DESC);

CREATE INDEX request_send_property ON panda_realty.property_payment_request_sends USING btree (property_list_id, request_id, created_at DESC);

CREATE INDEX timeline_preparation_property ON panda_realty.property_timeline_solicitor_preparations USING btree (property_list_id, attempt_id, event_key);

CREATE INDEX trust_property_sync_run_properties_legacy_property_idx ON panda_realty.trust_property_sync_run_properties USING btree (legacy_property_id);

CREATE INDEX trust_property_sync_run_properties_run_idx ON panda_realty.trust_property_sync_run_properties USING btree (trust_property_sync_run_id);

CREATE INDEX trust_property_sync_runs_started_at_idx ON panda_realty.trust_property_sync_runs USING btree (started_at DESC);

CREATE INDEX trust_reconciliation_outstanding_items_reconciliation_idx ON panda_realty.trust_reconciliation_outstanding_items USING btree (trust_reconciliation_id, display_order);

CREATE INDEX trust_transaction_imports_run_idx ON panda_realty.trust_transaction_imports USING btree (trust_transaction_sync_run_id);

CREATE INDEX trust_transaction_imports_transaction_idx ON panda_realty.trust_transaction_imports USING btree (trust_transaction_id);

CREATE INDEX trust_transaction_sync_run_rows_run_idx ON panda_realty.trust_transaction_sync_run_rows USING btree (trust_transaction_sync_run_id);

CREATE INDEX trust_transaction_sync_run_rows_source_idx ON panda_realty.trust_transaction_sync_run_rows USING btree (source_table, source_id);

CREATE INDEX trust_transaction_sync_runs_started_at_idx ON panda_realty.trust_transaction_sync_runs USING btree (started_at DESC);

CREATE INDEX trust_transactions_counterparty_entity_idx ON panda_realty.trust_transactions USING btree (counterparty_entity_id);

CREATE INDEX trust_transactions_property_date_idx ON panda_realty.trust_transactions USING btree (property_list_id, transaction_date, trust_transaction_id);

CREATE TRIGGER accepted_links_no_truncate BEFORE TRUNCATE ON panda_realty.property_entities FOR EACH STATEMENT EXECUTE FUNCTION panda_realty.reject_accepted_property_truncate();

CREATE TRIGGER accepted_offer_withdraw_before_delete BEFORE DELETE ON panda_realty.buyer_offers FOR EACH ROW EXECUTE FUNCTION panda_realty.guard_accepted_offer_delete();

CREATE TRIGGER accepted_offers_no_truncate BEFORE TRUNCATE ON panda_realty.buyer_offers FOR EACH STATEMENT EXECUTE FUNCTION panda_realty.reject_accepted_property_truncate();

CREATE TRIGGER accepted_properties_no_truncate BEFORE TRUNCATE ON panda_realty.panda_properties FOR EACH STATEMENT EXECUTE FUNCTION panda_realty.reject_accepted_property_truncate();

CREATE TRIGGER accepted_property_link_change BEFORE DELETE OR UPDATE OF property_list_id, property_entity_id ON panda_realty.property_entities FOR EACH ROW EXECUTE FUNCTION panda_realty.guard_accepted_property_link_change();

CREATE TRIGGER assign_trust_transaction_number BEFORE INSERT ON panda_realty.trust_transactions FOR EACH ROW EXECUTE FUNCTION panda_realty.assign_trust_transaction_number();

CREATE TRIGGER audit_events_append_only BEFORE DELETE OR UPDATE ON panda_realty.audit_events FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_reject_mutation();

CREATE TRIGGER audit_operations_append_only BEFORE DELETE OR UPDATE ON panda_realty.audit_operations FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_reject_mutation();

CREATE TRIGGER audit_row_change_booking_requests AFTER INSERT OR DELETE OR UPDATE ON panda_realty.booking_requests FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('booking_request_id');

CREATE TRIGGER audit_row_change_booking_response_slots AFTER INSERT OR DELETE OR UPDATE ON panda_realty.booking_response_slots FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('booking_response_slot_id');

CREATE TRIGGER audit_row_change_booking_responses AFTER INSERT OR DELETE OR UPDATE ON panda_realty.booking_responses FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('booking_response_id');

CREATE TRIGGER audit_row_change_booking_slots AFTER INSERT OR DELETE OR UPDATE ON panda_realty.booking_slots FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('booking_slot_id');

CREATE TRIGGER audit_row_change_buyer_offers AFTER INSERT OR DELETE OR UPDATE ON panda_realty.buyer_offers FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('buyer_offer_id');

CREATE TRIGGER audit_row_change_buyer_preferred_features AFTER INSERT OR DELETE OR UPDATE ON panda_realty.buyer_preferred_features FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('buyer_preferred_feature_id');

CREATE TRIGGER audit_row_change_buyer_requirement AFTER INSERT OR DELETE OR UPDATE ON panda_realty.buyer_requirement FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('buyer_requirement_id');

CREATE TRIGGER audit_row_change_buyer_status AFTER INSERT OR DELETE OR UPDATE ON panda_realty.buyer_status FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('buyer_status_id');

CREATE TRIGGER audit_row_change_buyer_viewed_properties AFTER INSERT OR DELETE OR UPDATE ON panda_realty.buyer_viewed_properties FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('buyer_viewed_property_id');

CREATE TRIGGER audit_row_change_contact_categories AFTER INSERT OR DELETE OR UPDATE ON panda_realty.contact_categories FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('contact_category_id');

CREATE TRIGGER audit_row_change_email_signatures AFTER INSERT OR DELETE OR UPDATE ON panda_realty.email_signatures FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('email_signature_id');

CREATE TRIGGER audit_row_change_email_templates AFTER INSERT OR DELETE OR UPDATE ON panda_realty.email_templates FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('email_template_id');

CREATE TRIGGER audit_row_change_entities AFTER INSERT OR DELETE OR UPDATE ON panda_realty.entities FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('entity_id');

CREATE TRIGGER audit_row_change_entity_buyer_requirements AFTER INSERT OR DELETE OR UPDATE ON panda_realty.entity_buyer_requirements FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('entity_buyer_requirement_id');

CREATE TRIGGER audit_row_change_entity_buyer_statuses AFTER INSERT OR DELETE OR UPDATE ON panda_realty.entity_buyer_statuses FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('entity_buyer_status_id');

CREATE TRIGGER audit_row_change_entity_categories AFTER INSERT OR DELETE OR UPDATE ON panda_realty.entity_categories FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('entity_category_id');

CREATE TRIGGER audit_row_change_entity_members AFTER INSERT OR DELETE OR UPDATE ON panda_realty.entity_members FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('entity_member_id');

CREATE TRIGGER audit_row_change_event_timelines AFTER INSERT OR DELETE OR UPDATE ON panda_realty.event_timelines FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('event_timeline_id');

CREATE TRIGGER audit_row_change_events AFTER INSERT OR DELETE OR UPDATE ON panda_realty.events FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('event_id');

CREATE TRIGGER audit_row_change_lead_sources AFTER INSERT OR DELETE OR UPDATE ON panda_realty.lead_sources FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('lead_source_id');

CREATE TRIGGER audit_row_change_panda_properties AFTER INSERT OR DELETE OR UPDATE ON panda_realty.panda_properties FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_list_id');

CREATE TRIGGER audit_row_change_panda_property_types AFTER INSERT OR DELETE OR UPDATE ON panda_realty.panda_property_types FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_type_id');

CREATE TRIGGER audit_row_change_panda_suburbs AFTER INSERT OR DELETE OR UPDATE ON panda_realty.panda_suburbs FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('suburb_id');

CREATE TRIGGER audit_row_change_portal_link_sends AFTER INSERT OR DELETE OR UPDATE ON panda_realty.portal_link_sends FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('portal_link_send_id');

CREATE TRIGGER audit_row_change_portal_messages AFTER INSERT OR DELETE OR UPDATE ON panda_realty.portal_messages FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('portal_message_id', 'inbound_email_message_id');

CREATE TRIGGER audit_row_change_property_entities AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_entities FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_entity_id');

CREATE TRIGGER audit_row_change_property_entity_files AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_entity_files FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_entity_file_id', 'google_drive_file_id');

CREATE TRIGGER audit_row_change_property_entity_notes AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_entity_notes FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_entity_note_id');

CREATE TRIGGER audit_row_change_property_events AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_events FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_event_id');

CREATE TRIGGER audit_row_change_property_form_recipient_prefs AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_form_recipient_prefs FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_list_id,property_form_id');

CREATE TRIGGER audit_row_change_property_form_sends AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_form_sends FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_form_send_id', 'google_drive_file_id');

CREATE TRIGGER audit_row_change_property_form_sign_requests AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_form_sign_requests FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('id', 'adobe_sign_agreement_id', 'provider_envelope_id', 'provider_recipient_id', 'file_id', 'signed_file_id');

CREATE TRIGGER audit_row_change_property_forms AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_forms FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_form_id', 'google_drive_file_id');

CREATE TRIGGER audit_row_change_property_list_files AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_list_files FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_list_file_id', 'google_drive_file_id');

CREATE TRIGGER audit_row_change_property_list_notes AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_list_notes FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_list_note_id');

CREATE TRIGGER audit_row_change_property_meetings AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_meetings FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_meeting_id', 'google_calendar_event_id');

CREATE TRIGGER audit_row_change_property_status AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_status FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_status_id');

CREATE TRIGGER audit_row_change_property_thread_tags AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_thread_tags FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('property_thread_tag_id', 'thread_id');

CREATE TRIGGER audit_row_change_trust_transactions AFTER INSERT OR DELETE OR UPDATE ON panda_realty.trust_transactions FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_capture_row_change('trust_transaction_id');

CREATE TRIGGER deposit_contract_review_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_deposit_contract_reviews FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();

CREATE TRIGGER deposit_contract_review_scope BEFORE INSERT OR UPDATE ON panda_realty.property_deposit_contract_reviews FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_deposit_metadata_scope();

CREATE TRIGGER deposit_contract_source_changed AFTER UPDATE OF contract_date ON panda_realty.panda_properties FOR EACH ROW EXECUTE FUNCTION panda_realty.invalidate_deposit_contract_review();

CREATE TRIGGER deposit_entity_file_changed AFTER DELETE OR UPDATE ON panda_realty.property_entity_files FOR EACH ROW EXECUTE FUNCTION panda_realty.invalidate_deposit_supporting_source();

CREATE TRIGGER deposit_property_file_changed AFTER DELETE OR UPDATE ON panda_realty.property_list_files FOR EACH ROW EXECUTE FUNCTION panda_realty.invalidate_deposit_supporting_source();

CREATE TRIGGER document_audit AFTER INSERT OR UPDATE ON panda_realty.property_document_acknowledgements FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_document_delivery();

CREATE TRIGGER document_audit AFTER INSERT OR UPDATE ON panda_realty.property_document_preparations FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_document_delivery();

CREATE TRIGGER document_audit AFTER INSERT OR UPDATE ON panda_realty.property_document_sends FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_document_delivery();

CREATE TRIGGER document_binding BEFORE INSERT ON panda_realty.property_document_acknowledgements FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_document_delivery_scope();

CREATE TRIGGER document_binding BEFORE INSERT ON panda_realty.property_document_preparations FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_document_delivery_scope();

CREATE TRIGGER document_binding BEFORE INSERT ON panda_realty.property_document_sends FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_document_delivery_scope();

CREATE TRIGGER document_immutable BEFORE DELETE OR UPDATE ON panda_realty.property_document_acknowledgements FOR EACH ROW EXECUTE FUNCTION panda_realty.guard_document_delivery_immutable();

CREATE TRIGGER document_immutable BEFORE DELETE OR UPDATE ON panda_realty.property_document_preparations FOR EACH ROW EXECUTE FUNCTION panda_realty.guard_document_delivery_immutable();

CREATE TRIGGER document_immutable BEFORE DELETE OR UPDATE ON panda_realty.property_document_sends FOR EACH ROW EXECUTE FUNCTION panda_realty.guard_document_delivery_immutable();

CREATE TRIGGER document_scope BEFORE INSERT ON panda_realty.property_document_acknowledgements FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();

CREATE TRIGGER document_scope BEFORE INSERT ON panda_realty.property_document_preparations FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();

CREATE TRIGGER document_scope BEFORE INSERT ON panda_realty.property_document_sends FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();

CREATE TRIGGER finance_due_identity BEFORE DELETE OR UPDATE ON panda_realty.property_finance_due_work FOR EACH ROW EXECUTE FUNCTION panda_realty.guard_finance_due_identity();

CREATE TRIGGER finance_operations_append_only BEFORE DELETE OR UPDATE ON panda_realty.property_finance_operations FOR EACH ROW EXECUTE FUNCTION panda_realty.reject_invoice_history_mutation();

CREATE TRIGGER financial_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_expense_payments FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();

CREATE TRIGGER financial_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_expenses FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();

CREATE TRIGGER financial_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_finance_allocations FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();

CREATE TRIGGER financial_audit AFTER INSERT OR UPDATE ON panda_realty.property_finance_due_work FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();

CREATE TRIGGER financial_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_finance_evidence FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();

CREATE TRIGGER financial_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_finance_operations FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();

CREATE TRIGGER financial_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_invoice_draft_versions FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();

CREATE TRIGGER financial_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_invoice_drafts FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();

CREATE TRIGGER financial_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_payment_request_sends FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();

CREATE TRIGGER financial_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_payment_requests FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();

CREATE TRIGGER financial_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_expenses FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();

CREATE TRIGGER financial_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_finance_allocations FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();

CREATE TRIGGER financial_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_finance_due_work FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();

CREATE TRIGGER financial_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_finance_evidence FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();

CREATE TRIGGER financial_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_finance_operations FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();

CREATE TRIGGER financial_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_invoice_draft_versions FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();

CREATE TRIGGER financial_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_invoice_drafts FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();

CREATE TRIGGER financial_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_payment_requests FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();

CREATE TRIGGER invoice_document_audit AFTER INSERT ON panda_realty.property_invoice_artifacts FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_invoice_artifact_metadata();

CREATE TRIGGER invoice_document_audit AFTER INSERT ON panda_realty.property_invoice_issue_events FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();

CREATE TRIGGER invoice_document_audit AFTER INSERT ON panda_realty.property_invoice_issues FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();

CREATE TRIGGER invoice_document_current_scope BEFORE INSERT ON panda_realty.property_invoice_artifacts FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();

CREATE TRIGGER invoice_document_current_scope BEFORE INSERT ON panda_realty.property_invoice_issue_events FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();

CREATE TRIGGER invoice_document_current_scope BEFORE INSERT ON panda_realty.property_invoice_issues FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();

CREATE TRIGGER invoice_document_immutable BEFORE DELETE OR UPDATE ON panda_realty.invoice_document_profiles FOR EACH ROW EXECUTE FUNCTION panda_realty.reject_invoice_history_mutation();

CREATE TRIGGER invoice_document_immutable BEFORE DELETE OR UPDATE ON panda_realty.property_invoice_artifacts FOR EACH ROW EXECUTE FUNCTION panda_realty.reject_invoice_history_mutation();

CREATE TRIGGER invoice_document_immutable BEFORE DELETE OR UPDATE ON panda_realty.property_invoice_file_references FOR EACH ROW EXECUTE FUNCTION panda_realty.reject_invoice_history_mutation();

CREATE TRIGGER invoice_document_immutable BEFORE DELETE OR UPDATE ON panda_realty.property_invoice_issue_events FOR EACH ROW EXECUTE FUNCTION panda_realty.reject_invoice_history_mutation();

CREATE TRIGGER invoice_document_immutable BEFORE DELETE OR UPDATE ON panda_realty.property_invoice_issues FOR EACH ROW EXECUTE FUNCTION panda_realty.reject_invoice_history_mutation();

CREATE TRIGGER invoice_document_scope BEFORE INSERT ON panda_realty.property_invoice_artifacts FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_invoice_document_scope();

CREATE TRIGGER invoice_document_scope BEFORE INSERT ON panda_realty.property_invoice_file_references FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_invoice_document_scope();

CREATE TRIGGER invoice_document_scope BEFORE INSERT ON panda_realty.property_invoice_issue_events FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_invoice_document_scope();

CREATE TRIGGER invoice_document_scope BEFORE INSERT ON panda_realty.property_invoice_issues FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_invoice_document_scope();

CREATE TRIGGER invoice_metadata_scope BEFORE INSERT OR UPDATE ON panda_realty.property_finance_allocations FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_invoice_metadata_scope();

CREATE TRIGGER invoice_metadata_scope BEFORE INSERT OR UPDATE ON panda_realty.property_finance_evidence FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_invoice_metadata_scope();

CREATE TRIGGER invoice_metadata_scope BEFORE INSERT OR UPDATE ON panda_realty.property_finance_operations FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_invoice_metadata_scope();

CREATE TRIGGER invoice_metadata_scope BEFORE INSERT OR UPDATE ON panda_realty.property_invoice_draft_versions FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_invoice_metadata_scope();

CREATE TRIGGER invoice_metadata_scope BEFORE INSERT OR UPDATE ON panda_realty.property_invoice_drafts FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_invoice_metadata_scope();

CREATE TRIGGER invoice_versions_append_only BEFORE DELETE OR UPDATE ON panda_realty.property_invoice_draft_versions FOR EACH ROW EXECUTE FUNCTION panda_realty.reject_invoice_history_mutation();

CREATE TRIGGER payment_append_only BEFORE DELETE OR UPDATE ON panda_realty.property_buyer_receipt_consumptions FOR EACH ROW EXECUTE FUNCTION panda_realty.reject_invoice_history_mutation();

CREATE TRIGGER payment_append_only BEFORE DELETE OR UPDATE ON panda_realty.property_payment_attributions FOR EACH ROW EXECUTE FUNCTION panda_realty.reject_invoice_history_mutation();

CREATE TRIGGER payment_append_only BEFORE DELETE OR UPDATE ON panda_realty.property_payment_obligation_versions FOR EACH ROW EXECUTE FUNCTION panda_realty.reject_invoice_history_mutation();

CREATE TRIGGER payment_append_only BEFORE DELETE OR UPDATE ON panda_realty.property_payment_reviews FOR EACH ROW EXECUTE FUNCTION panda_realty.reject_invoice_history_mutation();

CREATE TRIGGER payment_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_buyer_receipt_consumptions FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();

CREATE TRIGGER payment_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_payment_attributions FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();

CREATE TRIGGER payment_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_payment_obligation_versions FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();

CREATE TRIGGER payment_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_payment_obligations FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();

CREATE TRIGGER payment_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_payment_reviews FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();

CREATE TRIGGER payment_metadata_scope BEFORE INSERT OR DELETE OR UPDATE ON panda_realty.property_buyer_receipt_consumptions FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_payment_lifecycle_scope();

CREATE TRIGGER payment_metadata_scope BEFORE INSERT OR DELETE OR UPDATE ON panda_realty.property_payment_attributions FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_payment_lifecycle_scope();

CREATE TRIGGER payment_metadata_scope BEFORE INSERT OR DELETE OR UPDATE ON panda_realty.property_payment_obligation_versions FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_payment_lifecycle_scope();

CREATE TRIGGER payment_metadata_scope BEFORE INSERT OR DELETE OR UPDATE ON panda_realty.property_payment_obligations FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_payment_lifecycle_scope();

CREATE TRIGGER payment_metadata_scope BEFORE INSERT OR DELETE OR UPDATE ON panda_realty.property_payment_reviews FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_payment_lifecycle_scope();

CREATE TRIGGER payment_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_buyer_receipt_consumptions FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();

CREATE TRIGGER payment_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_payment_attributions FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();

CREATE TRIGGER payment_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_payment_obligation_versions FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();

CREATE TRIGGER payment_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_payment_obligations FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();

CREATE TRIGGER payment_scope BEFORE INSERT OR UPDATE OF property_list_id, attempt_id, listing_id ON panda_realty.property_payment_reviews FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();

CREATE TRIGGER property_entities_accepted_identity_guard BEFORE UPDATE OF entity_id ON panda_realty.property_entities FOR EACH ROW EXECUTE FUNCTION panda_realty.guard_accepted_buyer_identity();

CREATE TRIGGER property_timeline_ack_audit AFTER INSERT OR UPDATE ON panda_realty.property_timeline_acknowledgements FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();

CREATE TRIGGER property_timeline_ack_scope BEFORE INSERT OR UPDATE ON panda_realty.property_timeline_acknowledgements FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();

CREATE TRIGGER property_timeline_evidence_audit AFTER INSERT OR DELETE ON panda_realty.property_timeline_evidence FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();

CREATE TRIGGER property_timeline_evidence_scope BEFORE INSERT OR UPDATE ON panda_realty.property_timeline_evidence FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();

CREATE TRIGGER property_timeline_listing_preparation AFTER UPDATE ON panda_realty.panda_properties FOR EACH ROW EXECUTE FUNCTION panda_realty.capture_timeline_listing_preparation();

CREATE TRIGGER property_timeline_listing_state_audit AFTER INSERT OR UPDATE ON panda_realty.property_timeline_listing_state FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_timeline_listing_preparation();

CREATE TRIGGER property_timeline_offer_attempt AFTER INSERT OR DELETE OR UPDATE OF is_accepted, property_entity_id, accepted_property_id ON panda_realty.buyer_offers FOR EACH ROW EXECUTE FUNCTION panda_realty.capture_property_timeline_attempt();

CREATE TRIGGER property_timeline_record_audit AFTER INSERT OR DELETE ON panda_realty.property_timeline_record_links FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();

CREATE TRIGGER property_timeline_record_scope BEFORE INSERT OR UPDATE ON panda_realty.property_timeline_record_links FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();

CREATE TRIGGER set_panda_realty_buyer_offers_updated_at BEFORE UPDATE ON panda_realty.buyer_offers FOR EACH ROW EXECUTE FUNCTION public.moddatetime('updated_at');

CREATE TRIGGER set_panda_realty_buyer_status_updated_at BEFORE UPDATE ON panda_realty.buyer_status FOR EACH ROW EXECUTE FUNCTION public.moddatetime('updated_at');

CREATE TRIGGER set_panda_realty_contact_categories_updated_at BEFORE UPDATE ON panda_realty.contact_categories FOR EACH ROW EXECUTE FUNCTION public.moddatetime('updated_at');

CREATE TRIGGER set_panda_realty_entities_updated_at BEFORE UPDATE ON panda_realty.entities FOR EACH ROW EXECUTE FUNCTION public.moddatetime('updated_at');

CREATE TRIGGER set_panda_realty_entity_categories_updated_at BEFORE UPDATE ON panda_realty.entity_categories FOR EACH ROW EXECUTE FUNCTION public.moddatetime('updated_at');

CREATE TRIGGER set_panda_realty_entity_members_updated_at BEFORE UPDATE ON panda_realty.entity_members FOR EACH ROW EXECUTE FUNCTION public.moddatetime('updated_at');

CREATE TRIGGER set_panda_realty_event_timelines_updated_at BEFORE UPDATE ON panda_realty.event_timelines FOR EACH ROW EXECUTE FUNCTION public.moddatetime('updated_at');

CREATE TRIGGER set_panda_realty_events_updated_at BEFORE UPDATE ON panda_realty.events FOR EACH ROW EXECUTE FUNCTION public.moddatetime('updated_at');

CREATE TRIGGER set_panda_realty_lead_sources_updated_at BEFORE UPDATE ON panda_realty.lead_sources FOR EACH ROW EXECUTE FUNCTION public.moddatetime('updated_at');

CREATE TRIGGER set_panda_realty_panda_properties_updated_at BEFORE UPDATE ON panda_realty.panda_properties FOR EACH ROW EXECUTE FUNCTION public.moddatetime('updated_at');

CREATE TRIGGER set_panda_realty_property_entities_updated_at BEFORE UPDATE ON panda_realty.property_entities FOR EACH ROW EXECUTE FUNCTION public.moddatetime('updated_at');

CREATE TRIGGER set_panda_realty_property_entity_files_updated_at BEFORE UPDATE ON panda_realty.property_entity_files FOR EACH ROW EXECUTE FUNCTION public.moddatetime('updated_at');

CREATE TRIGGER set_panda_realty_property_status_updated_at BEFORE UPDATE ON panda_realty.property_status FOR EACH ROW EXECUTE FUNCTION public.moddatetime('updated_at');

CREATE TRIGGER timeline_preparation_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.property_timeline_solicitor_preparations FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();

CREATE TRIGGER timeline_preparation_receipt BEFORE INSERT OR UPDATE ON panda_realty.property_timeline_solicitor_preparations FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_timeline_preparation_receipt();

CREATE TRIGGER timeline_preparation_sale BEFORE INSERT OR UPDATE ON panda_realty.property_timeline_solicitor_preparations FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_property_timeline_scope();

CREATE TRIGGER trg_buyer_offer_accepted_unique BEFORE INSERT OR UPDATE ON panda_realty.buyer_offers FOR EACH ROW EXECUTE FUNCTION panda_realty.check_buyer_offer_accepted_unique();

CREATE TRIGGER trg_property_entities_buyer_status_updated_at BEFORE UPDATE ON panda_realty.property_entities FOR EACH ROW EXECUTE FUNCTION panda_realty.set_updated_at_on_buyer_status_change();

CREATE TRIGGER trigger_before_delete_buyer_offers BEFORE DELETE ON panda_realty.buyer_offers FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_buyer_offers();

CREATE TRIGGER trigger_before_delete_buyer_status BEFORE DELETE ON panda_realty.buyer_status FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_buyer_status();

CREATE TRIGGER trigger_before_delete_contact_categories BEFORE DELETE ON panda_realty.contact_categories FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_contact_categories();

CREATE TRIGGER trigger_before_delete_entities BEFORE DELETE ON panda_realty.entities FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_entities();

CREATE TRIGGER trigger_before_delete_entity_categories BEFORE DELETE ON panda_realty.entity_categories FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_entity_categories();

CREATE TRIGGER trigger_before_delete_entity_members BEFORE DELETE ON panda_realty.entity_members FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_entity_members();

CREATE TRIGGER trigger_before_delete_event_timelines BEFORE DELETE ON panda_realty.event_timelines FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_event_timelines();

CREATE TRIGGER trigger_before_delete_events BEFORE DELETE ON panda_realty.events FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_events();

CREATE TRIGGER trigger_before_delete_lead_sources BEFORE DELETE ON panda_realty.lead_sources FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_lead_sources();

CREATE TRIGGER trigger_before_delete_panda_properties BEFORE DELETE ON panda_realty.panda_properties FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_panda_properties();

CREATE TRIGGER trigger_before_delete_property_entities BEFORE DELETE ON panda_realty.property_entities FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_property_entities();

CREATE TRIGGER trigger_before_delete_property_entity_files BEFORE DELETE ON panda_realty.property_entity_files FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_property_entity_files();

CREATE TRIGGER trigger_before_delete_property_status BEFORE DELETE ON panda_realty.property_status FOR EACH ROW EXECUTE FUNCTION panda_realty.track_deleted_property_status();

CREATE TRIGGER trust_deposit_context_audit AFTER INSERT OR DELETE OR UPDATE ON panda_realty.trust_deposit_contexts FOR EACH ROW EXECUTE FUNCTION panda_realty.audit_property_timeline_change();

CREATE TRIGGER trust_deposit_context_scope BEFORE INSERT OR UPDATE ON panda_realty.trust_deposit_contexts FOR EACH ROW EXECUTE FUNCTION panda_realty.validate_deposit_metadata_scope();

CREATE TRIGGER trust_deposit_source_changed AFTER UPDATE ON panda_realty.trust_transactions FOR EACH ROW EXECUTE FUNCTION panda_realty.invalidate_trust_deposit_context();

ALTER TABLE ONLY panda_realty.agent_tasks
    ADD CONSTRAINT agent_tasks_agent_id_agents_agent_id_fk FOREIGN KEY (agent_id) REFERENCES panda_realty.agents(agent_id);

ALTER TABLE ONLY panda_realty.agent_tasks
    ADD CONSTRAINT agent_tasks_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES panda_realty.agents(agent_id);

ALTER TABLE ONLY panda_realty.audit_events
    ADD CONSTRAINT audit_events_audit_operation_id_fkey FOREIGN KEY (audit_operation_id) REFERENCES panda_realty.audit_operations(audit_operation_id);

ALTER TABLE ONLY panda_realty.booking_requests
    ADD CONSTRAINT booking_requests_property_entity_id_fkey FOREIGN KEY (property_entity_id) REFERENCES panda_realty.property_entities(property_entity_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.booking_requests
    ADD CONSTRAINT booking_requests_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.booking_response_slots
    ADD CONSTRAINT booking_response_slots_booking_response_id_fkey FOREIGN KEY (booking_response_id) REFERENCES panda_realty.booking_responses(booking_response_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.booking_response_slots
    ADD CONSTRAINT booking_response_slots_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES panda_realty.booking_slots(booking_slot_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.booking_responses
    ADD CONSTRAINT booking_responses_booking_request_id_fkey FOREIGN KEY (booking_request_id) REFERENCES panda_realty.booking_requests(booking_request_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.booking_slots
    ADD CONSTRAINT booking_slots_booking_request_id_fkey FOREIGN KEY (booking_request_id) REFERENCES panda_realty.booking_requests(booking_request_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.buyer_offers
    ADD CONSTRAINT buyer_offers_accepted_link_property_fk FOREIGN KEY (property_entity_id, accepted_property_id) REFERENCES panda_realty.property_entities(property_entity_id, property_list_id) ON UPDATE CASCADE;

ALTER TABLE ONLY panda_realty.buyer_offers
    ADD CONSTRAINT buyer_offers_accepted_property_fk FOREIGN KEY (accepted_property_id) REFERENCES panda_realty.panda_properties(property_list_id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.buyer_offers
    ADD CONSTRAINT buyer_offers_property_entity_id_fkey FOREIGN KEY (property_entity_id) REFERENCES panda_realty.property_entities(property_entity_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.buyer_preferred_features
    ADD CONSTRAINT buyer_preferred_features_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES panda_realty.entities(entity_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.buyer_viewed_properties
    ADD CONSTRAINT buyer_viewed_properties_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES panda_realty.entities(entity_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.buyer_viewed_properties
    ADD CONSTRAINT buyer_viewed_properties_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.condition_delivery_attempts
    ADD CONSTRAINT condition_delivery_attempts_delivery_key_fkey FOREIGN KEY (delivery_key) REFERENCES panda_realty.condition_reminder_deliveries(delivery_key);

ALTER TABLE ONLY panda_realty.condition_delivery_events
    ADD CONSTRAINT condition_delivery_events_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.condition_delivery_attempts(attempt_id);

ALTER TABLE ONLY panda_realty.entities
    ADD CONSTRAINT entities_primary_email_member_id_fkey FOREIGN KEY (primary_email_member_id) REFERENCES panda_realty.entity_members(entity_member_id) ON DELETE SET NULL;

ALTER TABLE ONLY panda_realty.entities
    ADD CONSTRAINT entities_primary_phone_member_id_fkey FOREIGN KEY (primary_phone_member_id) REFERENCES panda_realty.entity_members(entity_member_id) ON DELETE SET NULL;

ALTER TABLE ONLY panda_realty.entity_buyer_statuses
    ADD CONSTRAINT entity_buyer_statuses_buyer_status_id_fkey FOREIGN KEY (buyer_status_id) REFERENCES panda_realty.buyer_status(buyer_status_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.entity_buyer_statuses
    ADD CONSTRAINT entity_buyer_statuses_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES panda_realty.entities(entity_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.entities
    ADD CONSTRAINT fk_contact_categories_contact_category_id FOREIGN KEY (contact_category_id) REFERENCES panda_realty.contact_categories(contact_category_id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY panda_realty.entity_members
    ADD CONSTRAINT fk_entities_entity_id FOREIGN KEY (entity_id) REFERENCES panda_realty.entities(entity_id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_entities
    ADD CONSTRAINT fk_entities_entity_id FOREIGN KEY (entity_id) REFERENCES panda_realty.entities(entity_id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY panda_realty.entities
    ADD CONSTRAINT fk_entity_categories_entity_category_id FOREIGN KEY (entity_category_id) REFERENCES panda_realty.entity_categories(entity_category_id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.entities
    ADD CONSTRAINT fk_lead_sources_lead_source_id FOREIGN KEY (lead_source_id) REFERENCES panda_realty.lead_sources(lead_source_id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY panda_realty.event_timelines
    ADD CONSTRAINT fk_panda_properties_property_list_id FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_entities
    ADD CONSTRAINT fk_panda_properties_property_list_id FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY panda_realty.property_entity_files
    ADD CONSTRAINT fk_property_entities_property_entity_id FOREIGN KEY (property_entity_id) REFERENCES panda_realty.property_entities(property_entity_id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.panda_properties
    ADD CONSTRAINT fk_property_status_property_status_id FOREIGN KEY (property_status_id) REFERENCES panda_realty.property_status(property_status_id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY panda_realty.offer_form_submissions
    ADD CONSTRAINT offer_form_submissions_offer_form_token_id_fkey FOREIGN KEY (offer_form_token_id) REFERENCES panda_realty.offer_form_tokens(offer_form_token_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.offer_form_submissions
    ADD CONSTRAINT offer_form_submissions_offer_form_token_id_offer_form_tokens_of FOREIGN KEY (offer_form_token_id) REFERENCES panda_realty.offer_form_tokens(offer_form_token_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.offer_form_submissions
    ADD CONSTRAINT offer_form_submissions_property_entity_id_fkey FOREIGN KEY (property_entity_id) REFERENCES panda_realty.property_entities(property_entity_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.offer_form_submissions
    ADD CONSTRAINT offer_form_submissions_property_entity_id_property_entities_pro FOREIGN KEY (property_entity_id) REFERENCES panda_realty.property_entities(property_entity_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.offer_form_submissions
    ADD CONSTRAINT offer_form_submissions_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.offer_form_submissions
    ADD CONSTRAINT offer_form_submissions_property_list_id_panda_properties_proper FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.offer_form_tokens
    ADD CONSTRAINT offer_form_tokens_property_entity_id_fkey FOREIGN KEY (property_entity_id) REFERENCES panda_realty.property_entities(property_entity_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.offer_form_tokens
    ADD CONSTRAINT offer_form_tokens_property_entity_id_property_entities_property FOREIGN KEY (property_entity_id) REFERENCES panda_realty.property_entities(property_entity_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.offer_form_tokens
    ADD CONSTRAINT offer_form_tokens_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.offer_form_tokens
    ADD CONSTRAINT offer_form_tokens_property_list_id_panda_properties_property_li FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.panda_properties
    ADD CONSTRAINT panda_properties_deal_stage_status_id_fkey FOREIGN KEY (deal_stage_status_id) REFERENCES panda_realty.property_status(property_status_id);

ALTER TABLE ONLY panda_realty.property_payment_obligations
    ADD CONSTRAINT payment_obligation_head_version FOREIGN KEY (obligation_id, current_revision) REFERENCES panda_realty.property_payment_obligation_versions(obligation_id, revision) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ONLY panda_realty.property_payment_requests
    ADD CONSTRAINT payment_request_expense FOREIGN KEY (expense_id) REFERENCES panda_realty.property_expenses(expense_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.portal_file_sign_requests
    ADD CONSTRAINT portal_file_sign_requests_portal_token_id_fkey FOREIGN KEY (portal_token_id) REFERENCES panda_realty.portal_tokens(portal_token_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.portal_file_sign_requests
    ADD CONSTRAINT portal_file_sign_requests_portal_token_id_portal_tokens_portal_ FOREIGN KEY (portal_token_id) REFERENCES panda_realty.portal_tokens(portal_token_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.portal_link_sends
    ADD CONSTRAINT portal_link_sends_portal_token_id_fkey FOREIGN KEY (portal_token_id) REFERENCES panda_realty.portal_tokens(portal_token_id) ON DELETE SET NULL;

ALTER TABLE ONLY panda_realty.portal_link_sends
    ADD CONSTRAINT portal_link_sends_portal_token_id_portal_tokens_portal_token_id FOREIGN KEY (portal_token_id) REFERENCES panda_realty.portal_tokens(portal_token_id) ON DELETE SET NULL;

ALTER TABLE ONLY panda_realty.portal_link_sends
    ADD CONSTRAINT portal_link_sends_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.portal_link_sends
    ADD CONSTRAINT portal_link_sends_property_list_id_panda_properties_property_li FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.portal_messages
    ADD CONSTRAINT portal_messages_portal_token_id_fkey FOREIGN KEY (portal_token_id) REFERENCES panda_realty.portal_tokens(portal_token_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.portal_messages
    ADD CONSTRAINT portal_messages_portal_token_id_portal_tokens_portal_token_id_f FOREIGN KEY (portal_token_id) REFERENCES panda_realty.portal_tokens(portal_token_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.portal_tokens
    ADD CONSTRAINT portal_tokens_property_entity_id_fkey FOREIGN KEY (property_entity_id) REFERENCES panda_realty.property_entities(property_entity_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.portal_tokens
    ADD CONSTRAINT portal_tokens_property_entity_id_property_entities_property_ent FOREIGN KEY (property_entity_id) REFERENCES panda_realty.property_entities(property_entity_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.portal_tokens
    ADD CONSTRAINT portal_tokens_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.portal_tokens
    ADD CONSTRAINT portal_tokens_property_list_id_panda_properties_property_list_i FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_buyer_receipt_consumptions
    ADD CONSTRAINT property_buyer_receipt_consumptions_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_buyer_receipt_consumptions
    ADD CONSTRAINT property_buyer_receipt_consumptions_buyer_entity_id_fkey FOREIGN KEY (buyer_entity_id) REFERENCES panda_realty.entities(entity_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_buyer_receipt_consumptions
    ADD CONSTRAINT property_buyer_receipt_consumptions_payment_evidence_id_fkey FOREIGN KEY (payment_evidence_id) REFERENCES panda_realty.property_finance_evidence(evidence_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_buyer_receipt_consumptions
    ADD CONSTRAINT property_buyer_receipt_consumptions_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_buyer_receipt_consumptions
    ADD CONSTRAINT property_buyer_receipt_consumptions_receipt_transaction_id_fkey FOREIGN KEY (receipt_transaction_id) REFERENCES panda_realty.trust_transactions(trust_transaction_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_buyer_receipt_consumptions
    ADD CONSTRAINT property_buyer_receipt_consumptions_reverses_id_fkey FOREIGN KEY (reverses_id) REFERENCES panda_realty.property_buyer_receipt_consumptions(consumption_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_deposit_contract_reviews
    ADD CONSTRAINT property_deposit_contract_reviews_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id);

ALTER TABLE ONLY panda_realty.property_deposit_contract_reviews
    ADD CONSTRAINT property_deposit_contract_reviews_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_document_acknowledgements
    ADD CONSTRAINT property_document_acknowledgements_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id);

ALTER TABLE ONLY panda_realty.property_document_acknowledgements
    ADD CONSTRAINT property_document_acknowledgements_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_document_acknowledgements
    ADD CONSTRAINT property_document_acknowledgements_send_id_fkey FOREIGN KEY (send_id) REFERENCES panda_realty.property_document_sends(send_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_document_preparations
    ADD CONSTRAINT property_document_preparations_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id);

ALTER TABLE ONLY panda_realty.property_document_preparations
    ADD CONSTRAINT property_document_preparations_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_document_preparations
    ADD CONSTRAINT property_document_preparations_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES panda_realty.trust_transactions(trust_transaction_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_document_sends
    ADD CONSTRAINT property_document_sends_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id);

ALTER TABLE ONLY panda_realty.property_document_sends
    ADD CONSTRAINT property_document_sends_preparation_id_fkey FOREIGN KEY (preparation_id) REFERENCES panda_realty.property_document_preparations(preparation_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_document_sends
    ADD CONSTRAINT property_document_sends_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_document_sends
    ADD CONSTRAINT property_document_sends_request_id_fkey FOREIGN KEY (request_id) REFERENCES panda_realty.property_payment_requests(request_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_entities
    ADD CONSTRAINT property_entities_buyer_pipeline_status_id_fkey FOREIGN KEY (buyer_pipeline_status_id) REFERENCES panda_realty.property_status(property_status_id);

ALTER TABLE ONLY panda_realty.property_entity_notes
    ADD CONSTRAINT property_entity_notes_agent_id_agents_agent_id_fk FOREIGN KEY (agent_id) REFERENCES panda_realty.agents(agent_id);

ALTER TABLE ONLY panda_realty.property_entity_notes
    ADD CONSTRAINT property_entity_notes_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES panda_realty.agents(agent_id);

ALTER TABLE ONLY panda_realty.property_entity_notes
    ADD CONSTRAINT property_entity_notes_property_entity_id_fkey FOREIGN KEY (property_entity_id) REFERENCES panda_realty.property_entities(property_entity_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_events
    ADD CONSTRAINT property_events_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_expense_payments
    ADD CONSTRAINT property_expense_payments_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES panda_realty.property_expenses(expense_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_expense_payments
    ADD CONSTRAINT property_expense_payments_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_expense_payments
    ADD CONSTRAINT property_expense_payments_trust_transaction_id_fkey FOREIGN KEY (trust_transaction_id) REFERENCES panda_realty.trust_transactions(trust_transaction_id) ON DELETE SET NULL;

ALTER TABLE ONLY panda_realty.property_expenses
    ADD CONSTRAINT property_expenses_approval_file_id_fkey FOREIGN KEY (approval_file_id) REFERENCES panda_realty.property_list_files(property_list_file_id) ON DELETE SET NULL;

ALTER TABLE ONLY panda_realty.property_expenses
    ADD CONSTRAINT property_expenses_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id);

ALTER TABLE ONLY panda_realty.property_expenses
    ADD CONSTRAINT property_expenses_file_id_fkey FOREIGN KEY (file_id) REFERENCES panda_realty.property_list_files(property_list_file_id) ON DELETE SET NULL;

ALTER TABLE ONLY panda_realty.property_expenses
    ADD CONSTRAINT property_expenses_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_expenses
    ADD CONSTRAINT property_expenses_supplier_entity_id_fkey FOREIGN KEY (supplier_entity_id) REFERENCES panda_realty.entities(entity_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_finance_allocations
    ADD CONSTRAINT property_finance_allocations_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id);

ALTER TABLE ONLY panda_realty.property_finance_allocations
    ADD CONSTRAINT property_finance_allocations_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES panda_realty.property_finance_evidence(evidence_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_finance_allocations
    ADD CONSTRAINT property_finance_allocations_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES panda_realty.property_expenses(expense_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_finance_allocations
    ADD CONSTRAINT property_finance_allocations_paired_allocation_id_fkey FOREIGN KEY (paired_allocation_id) REFERENCES panda_realty.property_finance_allocations(allocation_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_finance_allocations
    ADD CONSTRAINT property_finance_allocations_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_finance_due_work
    ADD CONSTRAINT property_finance_due_work_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id);

ALTER TABLE ONLY panda_realty.property_finance_due_work
    ADD CONSTRAINT property_finance_due_work_owner_agent_id_fkey FOREIGN KEY (owner_agent_id) REFERENCES panda_realty.agents(agent_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_finance_due_work
    ADD CONSTRAINT property_finance_due_work_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_finance_evidence
    ADD CONSTRAINT property_finance_evidence_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id);

ALTER TABLE ONLY panda_realty.property_finance_evidence
    ADD CONSTRAINT property_finance_evidence_file_id_fkey FOREIGN KEY (file_id) REFERENCES panda_realty.property_list_files(property_list_file_id) ON DELETE SET NULL;

ALTER TABLE ONLY panda_realty.property_finance_evidence
    ADD CONSTRAINT property_finance_evidence_party_entity_id_fkey FOREIGN KEY (party_entity_id) REFERENCES panda_realty.entities(entity_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_finance_evidence
    ADD CONSTRAINT property_finance_evidence_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_finance_evidence
    ADD CONSTRAINT property_finance_evidence_trust_transaction_id_fkey FOREIGN KEY (trust_transaction_id) REFERENCES panda_realty.trust_transactions(trust_transaction_id) ON DELETE SET NULL;

ALTER TABLE ONLY panda_realty.property_finance_operations
    ADD CONSTRAINT property_finance_operations_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id);

ALTER TABLE ONLY panda_realty.property_finance_operations
    ADD CONSTRAINT property_finance_operations_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_form_recipient_prefs
    ADD CONSTRAINT property_form_recipient_prefs_property_form_id_fkey FOREIGN KEY (property_form_id) REFERENCES panda_realty.property_forms(property_form_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_form_recipient_prefs
    ADD CONSTRAINT property_form_recipient_prefs_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_form_sends
    ADD CONSTRAINT property_form_sends_property_form_id_fkey FOREIGN KEY (property_form_id) REFERENCES panda_realty.property_forms(property_form_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_form_sends
    ADD CONSTRAINT property_form_sends_property_form_id_property_forms_property_fo FOREIGN KEY (property_form_id) REFERENCES panda_realty.property_forms(property_form_id);

ALTER TABLE ONLY panda_realty.property_form_sends
    ADD CONSTRAINT property_form_sends_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_form_sends
    ADD CONSTRAINT property_form_sends_property_list_id_panda_properties_property_ FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_form_sign_requests
    ADD CONSTRAINT property_form_sign_requests_property_form_send_id_fkey FOREIGN KEY (property_form_send_id) REFERENCES panda_realty.property_form_sends(property_form_send_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_form_sign_requests
    ADD CONSTRAINT property_form_sign_requests_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_import_action_rows
    ADD CONSTRAINT property_import_action_rows_import_action_id_fkey FOREIGN KEY (import_action_id) REFERENCES panda_realty.property_import_actions(import_action_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_import_action_rows
    ADD CONSTRAINT property_import_action_rows_import_row_id_fkey FOREIGN KEY (import_row_id) REFERENCES panda_realty.property_import_rows(import_row_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_import_actions
    ADD CONSTRAINT property_import_actions_import_run_id_fkey FOREIGN KEY (import_run_id) REFERENCES panda_realty.property_import_runs(import_run_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_import_job_chunks
    ADD CONSTRAINT property_import_job_chunks_import_run_id_fkey FOREIGN KEY (import_run_id) REFERENCES panda_realty.property_import_runs(import_run_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_import_rows
    ADD CONSTRAINT property_import_rows_import_run_id_fkey FOREIGN KEY (import_run_id) REFERENCES panda_realty.property_import_runs(import_run_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_import_staged_rows
    ADD CONSTRAINT property_import_staged_rows_import_run_id_fkey FOREIGN KEY (import_run_id) REFERENCES panda_realty.property_import_runs(import_run_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_invoice_artifacts
    ADD CONSTRAINT property_invoice_artifacts_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id);

ALTER TABLE ONLY panda_realty.property_invoice_artifacts
    ADD CONSTRAINT property_invoice_artifacts_draft_id_draft_revision_fkey FOREIGN KEY (draft_id, draft_revision) REFERENCES panda_realty.property_invoice_draft_versions(draft_id, revision) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_invoice_artifacts
    ADD CONSTRAINT property_invoice_artifacts_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES panda_realty.property_invoice_issues(issue_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_invoice_artifacts
    ADD CONSTRAINT property_invoice_artifacts_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_invoice_draft_versions
    ADD CONSTRAINT property_invoice_draft_versions_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id);

ALTER TABLE ONLY panda_realty.property_invoice_draft_versions
    ADD CONSTRAINT property_invoice_draft_versions_draft_id_fkey FOREIGN KEY (draft_id) REFERENCES panda_realty.property_invoice_drafts(draft_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_invoice_draft_versions
    ADD CONSTRAINT property_invoice_draft_versions_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_invoice_drafts
    ADD CONSTRAINT property_invoice_drafts_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id);

ALTER TABLE ONLY panda_realty.property_invoice_drafts
    ADD CONSTRAINT property_invoice_drafts_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_invoice_file_references
    ADD CONSTRAINT property_invoice_file_references_file_id_fkey FOREIGN KEY (file_id) REFERENCES panda_realty.property_list_files(property_list_file_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_invoice_file_references
    ADD CONSTRAINT property_invoice_file_references_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES panda_realty.property_invoice_issues(issue_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_invoice_issue_events
    ADD CONSTRAINT property_invoice_issue_events_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id);

ALTER TABLE ONLY panda_realty.property_invoice_issue_events
    ADD CONSTRAINT property_invoice_issue_events_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES panda_realty.property_invoice_issues(issue_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_invoice_issue_events
    ADD CONSTRAINT property_invoice_issue_events_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_invoice_issue_events
    ADD CONSTRAINT property_invoice_issue_events_replacement_issue_id_fkey FOREIGN KEY (replacement_issue_id) REFERENCES panda_realty.property_invoice_issues(issue_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_invoice_issues
    ADD CONSTRAINT property_invoice_issues_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id);

ALTER TABLE ONLY panda_realty.property_invoice_issues
    ADD CONSTRAINT property_invoice_issues_draft_id_draft_revision_fkey FOREIGN KEY (draft_id, draft_revision) REFERENCES panda_realty.property_invoice_draft_versions(draft_id, revision) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_invoice_issues
    ADD CONSTRAINT property_invoice_issues_profile_revision_fkey FOREIGN KEY (profile_revision) REFERENCES panda_realty.invoice_document_profiles(revision);

ALTER TABLE ONLY panda_realty.property_invoice_issues
    ADD CONSTRAINT property_invoice_issues_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_invoice_issues
    ADD CONSTRAINT property_invoice_issues_replaces_issue_id_fkey FOREIGN KEY (replaces_issue_id) REFERENCES panda_realty.property_invoice_issues(issue_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_list_files
    ADD CONSTRAINT property_list_files_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_list_files
    ADD CONSTRAINT property_list_files_property_list_id_panda_properties_property_ FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_list_notes
    ADD CONSTRAINT property_list_notes_agent_id_agents_agent_id_fk FOREIGN KEY (agent_id) REFERENCES panda_realty.agents(agent_id);

ALTER TABLE ONLY panda_realty.property_list_notes
    ADD CONSTRAINT property_list_notes_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES panda_realty.agents(agent_id) ON DELETE SET NULL;

ALTER TABLE ONLY panda_realty.property_list_notes
    ADD CONSTRAINT property_list_notes_portal_message_id_fkey FOREIGN KEY (portal_message_id) REFERENCES panda_realty.portal_messages(portal_message_id) ON DELETE SET NULL;

ALTER TABLE ONLY panda_realty.property_list_notes
    ADD CONSTRAINT property_list_notes_property_entity_id_fkey FOREIGN KEY (property_entity_id) REFERENCES panda_realty.property_entities(property_entity_id);

ALTER TABLE ONLY panda_realty.property_list_notes
    ADD CONSTRAINT property_list_notes_property_entity_id_property_entities_proper FOREIGN KEY (property_entity_id) REFERENCES panda_realty.property_entities(property_entity_id);

ALTER TABLE ONLY panda_realty.property_meetings
    ADD CONSTRAINT property_meetings_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES panda_realty.agents(agent_id);

ALTER TABLE ONLY panda_realty.property_payment_attributions
    ADD CONSTRAINT property_payment_attributions_allocation_id_fkey FOREIGN KEY (allocation_id) REFERENCES panda_realty.property_finance_allocations(allocation_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_payment_attributions
    ADD CONSTRAINT property_payment_attributions_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_payment_attributions
    ADD CONSTRAINT property_payment_attributions_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES panda_realty.property_finance_evidence(evidence_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_payment_attributions
    ADD CONSTRAINT property_payment_attributions_obligation_id_obligation_rev_fkey FOREIGN KEY (obligation_id, obligation_revision) REFERENCES panda_realty.property_payment_obligation_versions(obligation_id, revision) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_payment_attributions
    ADD CONSTRAINT property_payment_attributions_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_payment_attributions
    ADD CONSTRAINT property_payment_attributions_reverses_id_fkey FOREIGN KEY (reverses_id) REFERENCES panda_realty.property_payment_attributions(attribution_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_payment_obligation_versions
    ADD CONSTRAINT property_payment_obligation_versions_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_payment_obligation_versions
    ADD CONSTRAINT property_payment_obligation_versions_obligation_id_fkey FOREIGN KEY (obligation_id) REFERENCES panda_realty.property_payment_obligations(obligation_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_payment_obligation_versions
    ADD CONSTRAINT property_payment_obligation_versions_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_payment_obligations
    ADD CONSTRAINT property_payment_obligations_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_payment_obligations
    ADD CONSTRAINT property_payment_obligations_party_entity_id_fkey FOREIGN KEY (party_entity_id) REFERENCES panda_realty.entities(entity_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_payment_obligations
    ADD CONSTRAINT property_payment_obligations_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_payment_request_sends
    ADD CONSTRAINT property_payment_request_sends_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_payment_request_sends
    ADD CONSTRAINT property_payment_request_sends_request_id_fkey FOREIGN KEY (request_id) REFERENCES panda_realty.property_payment_requests(request_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_payment_requests
    ADD CONSTRAINT property_payment_requests_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id);

ALTER TABLE ONLY panda_realty.property_payment_requests
    ADD CONSTRAINT property_payment_requests_party_entity_id_fkey FOREIGN KEY (party_entity_id) REFERENCES panda_realty.entities(entity_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_payment_requests
    ADD CONSTRAINT property_payment_requests_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_payment_reviews
    ADD CONSTRAINT property_payment_reviews_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_payment_reviews
    ADD CONSTRAINT property_payment_reviews_attribution_id_fkey FOREIGN KEY (attribution_id) REFERENCES panda_realty.property_payment_attributions(attribution_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_payment_reviews
    ADD CONSTRAINT property_payment_reviews_consumption_id_fkey FOREIGN KEY (consumption_id) REFERENCES panda_realty.property_buyer_receipt_consumptions(consumption_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_payment_reviews
    ADD CONSTRAINT property_payment_reviews_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT;

ALTER TABLE ONLY panda_realty.property_thread_tags
    ADD CONSTRAINT property_thread_tags_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_thread_tags
    ADD CONSTRAINT property_thread_tags_property_list_id_panda_properties_property FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_timeline_acknowledgements
    ADD CONSTRAINT property_timeline_acknowledgements_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id);

ALTER TABLE ONLY panda_realty.property_timeline_acknowledgements
    ADD CONSTRAINT property_timeline_acknowledgements_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_timeline_attempts
    ADD CONSTRAINT property_timeline_attempts_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_timeline_changes
    ADD CONSTRAINT property_timeline_changes_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_timeline_evidence
    ADD CONSTRAINT property_timeline_evidence_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id);

ALTER TABLE ONLY panda_realty.property_timeline_evidence
    ADD CONSTRAINT property_timeline_evidence_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_timeline_evidence
    ADD CONSTRAINT property_timeline_evidence_trust_transaction_id_fkey FOREIGN KEY (trust_transaction_id) REFERENCES panda_realty.trust_transactions(trust_transaction_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_timeline_listing_state
    ADD CONSTRAINT property_timeline_listing_state_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_timeline_record_links
    ADD CONSTRAINT property_timeline_record_links_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id);

ALTER TABLE ONLY panda_realty.property_timeline_record_links
    ADD CONSTRAINT property_timeline_record_links_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_timeline_solicitor_preparations
    ADD CONSTRAINT property_timeline_solicitor_preparati_trust_transaction_id_fkey FOREIGN KEY (trust_transaction_id) REFERENCES panda_realty.trust_transactions(trust_transaction_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.property_timeline_solicitor_preparations
    ADD CONSTRAINT property_timeline_solicitor_preparations_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id);

ALTER TABLE ONLY panda_realty.property_timeline_solicitor_preparations
    ADD CONSTRAINT property_timeline_solicitor_preparations_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.public_offer_form_tokens
    ADD CONSTRAINT public_offer_form_tokens_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.trust_bank_reference_reviews
    ADD CONSTRAINT trust_bank_reference_reviews_trust_transaction_id_fkey FOREIGN KEY (trust_transaction_id) REFERENCES panda_realty.trust_transactions(trust_transaction_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.trust_deposit_contexts
    ADD CONSTRAINT trust_deposit_contexts_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES panda_realty.property_timeline_attempts(attempt_id);

ALTER TABLE ONLY panda_realty.trust_deposit_contexts
    ADD CONSTRAINT trust_deposit_contexts_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.trust_deposit_contexts
    ADD CONSTRAINT trust_deposit_contexts_trust_transaction_id_fkey FOREIGN KEY (trust_transaction_id) REFERENCES panda_realty.trust_transactions(trust_transaction_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.trust_property_sync_run_properties
    ADD CONSTRAINT trust_property_sync_run_propert_trust_property_sync_run_id_fkey FOREIGN KEY (trust_property_sync_run_id) REFERENCES panda_realty.trust_property_sync_runs(trust_property_sync_run_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.trust_receipt_settings
    ADD CONSTRAINT trust_receipt_settings_email_template_id_fkey FOREIGN KEY (email_template_id) REFERENCES panda_realty.email_templates(email_template_id) ON DELETE SET NULL;

ALTER TABLE ONLY panda_realty.trust_reconciliation_outstanding_items
    ADD CONSTRAINT trust_reconciliation_outstanding_i_trust_reconciliation_id_fkey FOREIGN KEY (trust_reconciliation_id) REFERENCES panda_realty.trust_reconciliations(trust_reconciliation_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.trust_transaction_imports
    ADD CONSTRAINT trust_transaction_imports_trust_transaction_id_fkey FOREIGN KEY (trust_transaction_id) REFERENCES panda_realty.trust_transactions(trust_transaction_id) ON DELETE SET NULL;

ALTER TABLE ONLY panda_realty.trust_transaction_imports
    ADD CONSTRAINT trust_transaction_imports_trust_transaction_sync_run_id_fkey FOREIGN KEY (trust_transaction_sync_run_id) REFERENCES panda_realty.trust_transaction_sync_runs(trust_transaction_sync_run_id) ON DELETE SET NULL;

ALTER TABLE ONLY panda_realty.trust_transaction_sync_run_rows
    ADD CONSTRAINT trust_transaction_sync_run_ro_trust_transaction_sync_run_i_fkey FOREIGN KEY (trust_transaction_sync_run_id) REFERENCES panda_realty.trust_transaction_sync_runs(trust_transaction_sync_run_id) ON DELETE CASCADE;

ALTER TABLE ONLY panda_realty.trust_transaction_sync_run_rows
    ADD CONSTRAINT trust_transaction_sync_run_rows_counterparty_entity_id_fkey FOREIGN KEY (counterparty_entity_id) REFERENCES panda_realty.entities(entity_id) ON DELETE SET NULL;

ALTER TABLE ONLY panda_realty.trust_transaction_sync_run_rows
    ADD CONSTRAINT trust_transaction_sync_run_rows_trust_transaction_id_fkey FOREIGN KEY (trust_transaction_id) REFERENCES panda_realty.trust_transactions(trust_transaction_id) ON DELETE SET NULL;

ALTER TABLE ONLY panda_realty.trust_transactions
    ADD CONSTRAINT trust_transactions_counterparty_entity_id_fkey FOREIGN KEY (counterparty_entity_id) REFERENCES panda_realty.entities(entity_id) ON DELETE SET NULL;

ALTER TABLE ONLY panda_realty.trust_transactions
    ADD CONSTRAINT trust_transactions_property_list_id_fkey FOREIGN KEY (property_list_id) REFERENCES panda_realty.panda_properties(property_list_id) ON DELETE RESTRICT;

\unrestrict UbB83TkiOQmgFrjdTgGnaVx2ILikCgTAzt6Y3cAxUIXa7XMUGeUatFce8E7Vf6D

create sequence if not exists panda_realty.trust_receipt_number_seq start 1001;
create sequence if not exists panda_realty.trust_payment_number_seq start 1001;
set search_path = panda_realty, public;

insert into entity_categories (entity_category_id, entity_category_name)
overriding system value values (1,'Buyer'),(2,'Seller'),(3,'Tenant'),(4,'Contact')
on conflict do nothing;

insert into property_status (property_status_code, property_status, pipeline, sort_order, is_shown_on_favorite) values
 ('To Be Appraised','To Be Appraised','sellers',1,true),
 ('Appraised','Appraised','sellers',2,true),
 ('On The Market','On The Market','sellers',3,true),
 ('Contract Signed / Conditions','Contract Signed / Conditions','sellers',4,true),
 ('Unconditional','Unconditional','sellers',5,true),
 ('Settled-Sellers','Settled-Sellers','sellers',6,true),
 ('Enquiry','Enquiry','buyers',1,false),
 ('Offer Made','Offer Made','buyers',2,false)
on conflict do nothing;

insert into panda_properties (street_address, suburb, state, postcode, property_type, bed, bath, car,
  is_favorite, owner1name, owner1email, owner1phone, property_status_id, commission_rate)
select v.street_address,v.suburb,v.state,v.postcode,v.property_type,v.bed,v.bath,v.car,v.is_favorite,v.owner1name,v.owner1email,v.owner1phone, (select property_status_id from property_status where property_status_code = v.st), 2.2
from (values
 ('12 TESTING LANE','SAMPLEVILLE','QLD','4999','House',4,2,2,true,'ALEX SAMPLE','alex@example.test','0400000001','Contract Signed / Conditions'),
 ('7 DEMO STREET','MOCKTON','QLD','4998','House',3,1,1,true,'JORDAN DEMO','jordan@example.test','0400000002','On The Market'),
 ('3/88 PRETEND ROAD','FICTION BAY','QLD','4997','Unit',2,1,1,true,'CASEY PRETEND','casey@example.test','0400000003','Appraised')
) as v(street_address,suburb,state,postcode,property_type,bed,bath,car,is_favorite,owner1name,owner1email,owner1phone,st)
on conflict do nothing;

insert into entities (entity_category_id, entity_name, email_address, contact) values
 (1,'TAYLOR EXAMPLE','taylor@example.test','0400000010'),
 (1,'MORGAN PLACEHOLDER','morgan@example.test','0400000011');

insert into property_entities (property_list_id, entity_id)
select p.property_list_id, e.entity_id from panda_properties p, entities e
where p.street_address = '12 TESTING LANE' and e.entity_name = 'TAYLOR EXAMPLE';
select 'Workbench database ready: ' || count(*) || ' tables' as result from information_schema.tables where table_schema = 'panda_realty';
