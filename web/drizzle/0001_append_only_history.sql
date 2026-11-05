-- Custom migration (drizzle-kit generate --custom): seed data and append-only triggers.
INSERT INTO "request_statuses" ("code") VALUES ('received'), ('inProgress'), ('done'), ('rejected');
--> statement-breakpoint
CREATE FUNCTION "reject_update_or_delete"() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % is not allowed', TG_TABLE_NAME, TG_OP;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "request_history_append_only" BEFORE UPDATE OR DELETE ON "request_history" FOR EACH ROW EXECUTE FUNCTION "reject_update_or_delete"();
--> statement-breakpoint
CREATE TRIGGER "request_statuses_append_only" BEFORE UPDATE OR DELETE ON "request_statuses" FOR EACH ROW EXECUTE FUNCTION "reject_update_or_delete"();
