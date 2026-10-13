CREATE TABLE "sesiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token_jwt" text NOT NULL,
	"fecha_emision" timestamp with time zone DEFAULT now() NOT NULL,
	"fecha_expiracion" timestamp with time zone NOT NULL,
	CONSTRAINT "sesiones_token_jwt_unique" UNIQUE("token_jwt")
);
--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;