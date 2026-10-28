-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('RECEIVED', 'IN_DIAGNOSIS', 'AWAITING_APPROVAL', 'IN_EXECUTION', 'FINISHED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "budget_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "service_orders" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "status" "order_status" NOT NULL,
    "budget_status" "budget_status",
    "budget_total" DECIMAL(12,2),
    "budget_sent_at" TIMESTAMP(3),
    "budget_decided_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_service_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "estimated_minutes" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_service_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_part_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "part_id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "unit" "measurement_unit" NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_part_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_changes" (
    "id" SERIAL NOT NULL,
    "order_id" UUID NOT NULL,
    "status" "order_status" NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_status_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_orders_customer_id_idx" ON "service_orders"("customer_id");

-- CreateIndex
CREATE INDEX "service_orders_vehicle_id_idx" ON "service_orders"("vehicle_id");

-- CreateIndex
CREATE INDEX "service_orders_status_idx" ON "service_orders"("status");

-- CreateIndex
CREATE INDEX "service_orders_created_at_idx" ON "service_orders"("created_at");

-- CreateIndex
CREATE INDEX "order_service_items_service_id_idx" ON "order_service_items"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_service_items_order_id_service_id_key" ON "order_service_items"("order_id", "service_id");

-- CreateIndex
CREATE INDEX "order_part_items_part_id_idx" ON "order_part_items"("part_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_part_items_order_id_part_id_key" ON "order_part_items"("order_id", "part_id");

-- CreateIndex
CREATE INDEX "order_status_changes_order_id_idx" ON "order_status_changes"("order_id");

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_service_items" ADD CONSTRAINT "order_service_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_service_items" ADD CONSTRAINT "order_service_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_part_items" ADD CONSTRAINT "order_part_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_part_items" ADD CONSTRAINT "order_part_items_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_changes" ADD CONSTRAINT "order_status_changes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraints
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_version_check" CHECK ("version" >= 0);

-- O orcamento e todo nulo (ainda nao enviado) ou todo preenchido; so o pendente fica sem data de decisao.
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_budget_check" CHECK (
    (
        "budget_status" IS NULL
        AND "budget_total" IS NULL
        AND "budget_sent_at" IS NULL
        AND "budget_decided_at" IS NULL
    ) OR (
        "budget_status" IS NOT NULL
        AND "budget_total" IS NOT NULL
        AND "budget_total" >= 0
        AND "budget_sent_at" IS NOT NULL
        AND (("budget_status" = 'PENDING') = ("budget_decided_at" IS NULL))
    )
);

ALTER TABLE "order_service_items" ADD CONSTRAINT "order_service_items_price_check" CHECK ("price" >= 0);
ALTER TABLE "order_service_items" ADD CONSTRAINT "order_service_items_estimated_minutes_check" CHECK ("estimated_minutes" > 0);
ALTER TABLE "order_service_items" ADD CONSTRAINT "order_service_items_execution_check" CHECK (
    "finished_at" IS NULL OR ("started_at" IS NOT NULL AND "finished_at" >= "started_at")
);

ALTER TABLE "order_part_items" ADD CONSTRAINT "order_part_items_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "order_part_items" ADD CONSTRAINT "order_part_items_unit_price_check" CHECK ("unit_price" >= 0);
