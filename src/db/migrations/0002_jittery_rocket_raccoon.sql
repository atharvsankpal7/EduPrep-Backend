ALTER TABLE "test_section_questions" DROP CONSTRAINT "test_section_questions_test_section_id_test_sections_id_fk";
--> statement-breakpoint
ALTER TABLE "test_section_questions" DROP CONSTRAINT "test_section_questions_question_id_questions_id_fk";
--> statement-breakpoint
ALTER TABLE "test_sections" DROP CONSTRAINT "test_sections_test_id_tests_id_fk";
--> statement-breakpoint
ALTER TABLE "tests" DROP CONSTRAINT "tests_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "test_sections" ADD COLUMN "section_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "test_section_questions" ADD CONSTRAINT "test_section_questions_test_section_id_test_sections_id_fk" FOREIGN KEY ("test_section_id") REFERENCES "public"."test_sections"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "test_section_questions" ADD CONSTRAINT "test_section_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "test_sections" ADD CONSTRAINT "test_sections_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tests" ADD CONSTRAINT "tests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
