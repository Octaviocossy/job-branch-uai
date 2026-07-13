CREATE TABLE "empresas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"industria" text NOT NULL,
	"sitio_web" text,
	"reputacion_time_response" integer
);
--> statement-breakpoint
CREATE TABLE "vacantes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text NOT NULL,
	"tecnologias_requeridas" text[] DEFAULT '{}' NOT NULL,
	"rango_salarial" text NOT NULL,
	"empresa_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cv_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"name" text NOT NULL,
	"focus" text NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"es_perfil_salida" boolean DEFAULT false NOT NULL,
	"estado" text NOT NULL,
	"archivo_cv" "bytea",
	"tamanio_bytes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"vacante_id" uuid NOT NULL,
	"cv_version_id" uuid NOT NULL,
	"status" text NOT NULL,
	"applied_date" date NOT NULL,
	"last_updated" date NOT NULL,
	"recruiter_name" text,
	"recruiter_linkedin" text,
	"recruiter_email" text,
	"tech_stack" text[] DEFAULT '{}' NOT NULL,
	"notes" text,
	"salary" text,
	"location" text,
	"source" text,
	"archived" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hitos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rama_id" uuid NOT NULL,
	"date" date NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"days_in_stage" integer,
	"tipo" text,
	"fecha_recordatorio_follow_up" date,
	"observaciones" text
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hito_id" uuid NOT NULL,
	"fecha_entrevista" date NOT NULL,
	"tipo_entrevista" text NOT NULL,
	"score_tecnico" integer NOT NULL,
	"score_cultura" integer NOT NULL,
	"comentarios" text NOT NULL,
	"habilidades_faltantes" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recordatorios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rama_id" uuid NOT NULL,
	"fecha_vencimiento" date NOT NULL,
	"dias_inactividad" integer DEFAULT 0 NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_provider" text DEFAULT 'native' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "intentos_fallidos" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "vacantes" ADD CONSTRAINT "vacantes_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_versions" ADD CONSTRAINT "cv_versions_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_vacante_id_vacantes_id_fk" FOREIGN KEY ("vacante_id") REFERENCES "public"."vacantes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_cv_version_id_cv_versions_id_fk" FOREIGN KEY ("cv_version_id") REFERENCES "public"."cv_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hitos" ADD CONSTRAINT "hitos_rama_id_applications_id_fk" FOREIGN KEY ("rama_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_hito_id_hitos_id_fk" FOREIGN KEY ("hito_id") REFERENCES "public"."hitos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordatorios" ADD CONSTRAINT "recordatorios_rama_id_applications_id_fk" FOREIGN KEY ("rama_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;