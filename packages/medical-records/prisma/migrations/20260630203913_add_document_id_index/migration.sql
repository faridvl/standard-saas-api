-- CreateIndex
CREATE INDEX "Patient_tenantUuid_documentId_idx" ON "Patient"("tenantUuid", "documentId");
