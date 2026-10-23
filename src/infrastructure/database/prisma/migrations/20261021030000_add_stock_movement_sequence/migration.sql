-- DropIndex
DROP INDEX "stock_movements_part_id_created_at_idx";

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "sequence" BIGSERIAL NOT NULL;

-- CreateIndex
CREATE INDEX "stock_movements_part_id_sequence_idx" ON "stock_movements"("part_id", "sequence");

