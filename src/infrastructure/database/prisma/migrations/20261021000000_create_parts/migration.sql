-- CreateEnum
CREATE TYPE "stock_movement_type" AS ENUM ('INITIAL', 'ENTRY', 'ADJUSTMENT', 'RESERVATION', 'CONSUMPTION');

-- CreateTable
CREATE TABLE "parts" (
    "id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "minimum_stock" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL,
    "part_id" UUID NOT NULL,
    "type" "stock_movement_type" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reserved_after" INTEGER NOT NULL,
    "reason" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parts_code_key" ON "parts"("code");

-- CreateIndex
CREATE INDEX "parts_created_at_idx" ON "parts"("created_at");

-- CreateIndex
CREATE INDEX "stock_movements_part_id_created_at_idx" ON "stock_movements"("part_id", "created_at");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Invariantes do estoque garantidas tambem pelo banco (o Prisma nao modela CHECK)
ALTER TABLE "parts" ADD CONSTRAINT "parts_quantity_check" CHECK ("quantity" >= 0);
ALTER TABLE "parts" ADD CONSTRAINT "parts_reserved_check" CHECK ("reserved" >= 0 AND "reserved" <= "quantity");
ALTER TABLE "parts" ADD CONSTRAINT "parts_minimum_stock_check" CHECK ("minimum_stock" >= 0);
