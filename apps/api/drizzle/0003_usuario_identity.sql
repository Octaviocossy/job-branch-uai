ALTER TABLE "users" RENAME TO "usuarios";--> statement-breakpoint
ALTER TABLE "usuarios" RENAME COLUMN "display_name" TO "nombre_completo";--> statement-breakpoint
ALTER TABLE "usuarios" RENAME CONSTRAINT "users_email_unique" TO "usuarios_email_unique";--> statement-breakpoint
ALTER TABLE "applications" RENAME CONSTRAINT "applications_usuario_id_users_id_fk" TO "applications_usuario_id_usuarios_id_fk";--> statement-breakpoint
ALTER TABLE "cv_versions" RENAME CONSTRAINT "cv_versions_usuario_id_users_id_fk" TO "cv_versions_usuario_id_usuarios_id_fk";--> statement-breakpoint
ALTER TABLE "personas" RENAME CONSTRAINT "personas_usuario_id_users_id_fk" TO "personas_usuario_id_usuarios_id_fk";--> statement-breakpoint
INSERT INTO "personas" ("usuario_id", "tipo", "per_nombre", "per_apellido", "fecha_contratacion")
SELECT u."id", u."role",
  CASE WHEN u."role" = 'recruiter' THEN u."nombre_completo" END,
  CASE WHEN u."role" = 'recruiter' THEN '' END,
  CASE WHEN u."role" = 'recruiter' THEN CURRENT_DATE END
FROM "usuarios" u
WHERE NOT EXISTS (SELECT 1 FROM "personas" p WHERE p."usuario_id" = u."id");--> statement-breakpoint
ALTER TABLE "usuarios" DROP COLUMN "role";
