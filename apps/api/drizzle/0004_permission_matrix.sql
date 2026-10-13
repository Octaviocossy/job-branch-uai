CREATE TABLE "componentes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"codigo_accion" text,
	"formulario_id" uuid,
	"padre_id" uuid,
	CONSTRAINT "componentes_codigo_accion_unique" UNIQUE("codigo_accion"),
	CONSTRAINT "componentes_tipo_check" CHECK (("componentes"."tipo" = 'grupo' and "componentes"."codigo_accion" is null and "componentes"."formulario_id" is null) or ("componentes"."tipo" = 'accion' and "componentes"."codigo_accion" is not null and "componentes"."formulario_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "formularios" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"modulo_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modulos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	CONSTRAINT "modulos_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "persona_componentes" (
	"persona_id" uuid NOT NULL,
	"componente_id" uuid NOT NULL,
	CONSTRAINT "persona_componentes_persona_id_componente_id_pk" PRIMARY KEY("persona_id","componente_id")
);
--> statement-breakpoint
ALTER TABLE "componentes" ADD CONSTRAINT "componentes_formulario_id_formularios_id_fk" FOREIGN KEY ("formulario_id") REFERENCES "public"."formularios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "componentes" ADD CONSTRAINT "componentes_padre_id_componentes_id_fk" FOREIGN KEY ("padre_id") REFERENCES "public"."componentes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formularios" ADD CONSTRAINT "formularios_modulo_id_modulos_id_fk" FOREIGN KEY ("modulo_id") REFERENCES "public"."modulos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_componentes" ADD CONSTRAINT "persona_componentes_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_componentes" ADD CONSTRAINT "persona_componentes_componente_id_componentes_id_fk" FOREIGN KEY ("componente_id") REFERENCES "public"."componentes"("id") ON DELETE no action ON UPDATE no action;