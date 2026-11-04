CREATE TABLE "request_history" (
	"request_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"status" text NOT NULL,
	"reason" text,
	"changed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "request_history_request_id_seq_pk" PRIMARY KEY("request_id","seq")
);
--> statement-breakpoint
CREATE TABLE "request_memos" (
	"request_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"content" text NOT NULL,
	CONSTRAINT "request_memos_request_id_seq_pk" PRIMARY KEY("request_id","seq")
);
--> statement-breakpoint
CREATE TABLE "request_statuses" (
	"code" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"requester" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "request_history" ADD CONSTRAINT "request_history_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_history" ADD CONSTRAINT "request_history_status_request_statuses_code_fk" FOREIGN KEY ("status") REFERENCES "public"."request_statuses"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_memos" ADD CONSTRAINT "request_memos_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;