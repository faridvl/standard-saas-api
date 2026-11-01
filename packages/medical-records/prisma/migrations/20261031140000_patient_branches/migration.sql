-- Un paciente puede tener varias sedes. Patient.branchUuid queda como la principal.
CREATE TABLE "PatientBranch" (
    "id" SERIAL NOT NULL,
    "patientUuid" TEXT NOT NULL,
    "branchUuid" TEXT NOT NULL,
    "tenantUuid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientBranch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientBranch_patientUuid_branchUuid_key" ON "PatientBranch"("patientUuid", "branchUuid");
CREATE INDEX "PatientBranch_branchUuid_idx" ON "PatientBranch"("branchUuid");
CREATE INDEX "PatientBranch_tenantUuid_idx" ON "PatientBranch"("tenantUuid");

ALTER TABLE "PatientBranch" ADD CONSTRAINT "PatientBranch_patientUuid_fkey" FOREIGN KEY ("patientUuid") REFERENCES "Patient"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientBranch" ADD CONSTRAINT "PatientBranch_branchUuid_fkey" FOREIGN KEY ("branchUuid") REFERENCES "Branch"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Cada paciente conserva la sede que tenía.
INSERT INTO "PatientBranch" ("patientUuid", "branchUuid", "tenantUuid")
SELECT "uuid", "branchUuid", "tenantUuid" FROM "Patient" WHERE "branchUuid" IS NOT NULL;
