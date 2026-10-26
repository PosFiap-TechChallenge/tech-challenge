-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "estimated_minutes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "services_name_key" ON "services"("name");

-- CreateIndex
CREATE INDEX "services_created_at_idx" ON "services"("created_at");

-- AddCheckConstraints
ALTER TABLE "services" ADD CONSTRAINT "services_price_check" CHECK ("price" >= 0);
ALTER TABLE "services" ADD CONSTRAINT "services_estimated_minutes_check" CHECK ("estimated_minutes" > 0);
