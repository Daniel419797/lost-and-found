ALTER TABLE "users"
  ADD COLUMN "student_staff_id" VARCHAR(40),
  ADD COLUMN "department" VARCHAR(120);

CREATE UNIQUE INDEX "users_student_staff_id_key"
  ON "users"("student_staff_id");
