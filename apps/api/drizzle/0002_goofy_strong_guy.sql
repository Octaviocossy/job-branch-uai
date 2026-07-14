CREATE TABLE "personas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"puesto_corporativo" text,
	"per_nombre" text,
	"per_apellido" text,
	"fecha_contratacion" date,
	"habilidades_master" text[] DEFAULT '{}' NOT NULL,
	CONSTRAINT "personas_usuario_id_unique" UNIQUE("usuario_id")
);
--> statement-breakpoint
ALTER TABLE "cv_versions" ADD COLUMN "snapshot_vacante_id" uuid;--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_versions" ADD CONSTRAINT "cv_versions_snapshot_vacante_id_vacantes_id_fk" FOREIGN KEY ("snapshot_vacante_id") REFERENCES "public"."vacantes"("id") ON DELETE no action ON UPDATE no action;