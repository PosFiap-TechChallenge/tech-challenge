-- CreateEnum
CREATE TYPE "part_type" AS ENUM ('PART', 'SUPPLY');

-- CreateEnum
CREATE TYPE "measurement_unit" AS ENUM ('UN', 'L', 'ML', 'KG', 'G', 'M');

-- Pecas ja cadastradas viram PART contadas em UN, com preco 0 a ser corrigido pelo administrador.
-- Os defaults so existem para preencher essas linhas e sao removidos em seguida.
ALTER TABLE "parts" ADD COLUMN     "type" "part_type" NOT NULL DEFAULT 'PART',
ADD COLUMN     "unit" "measurement_unit" NOT NULL DEFAULT 'UN',
ADD COLUMN     "unit_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(12,3),
ALTER COLUMN "reserved" SET DATA TYPE DECIMAL(12,3),
ALTER COLUMN "minimum_stock" SET DATA TYPE DECIMAL(12,3);

ALTER TABLE "parts" ALTER COLUMN "type" DROP DEFAULT,
ALTER COLUMN "unit" DROP DEFAULT,
ALTER COLUMN "unit_price" DROP DEFAULT;

-- AlterTable
ALTER TABLE "stock_movements" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(12,3),
ALTER COLUMN "balance_after" SET DATA TYPE DECIMAL(12,3),
ALTER COLUMN "reserved_after" SET DATA TYPE DECIMAL(12,3);

ALTER TABLE "parts" ADD CONSTRAINT "parts_unit_price_check" CHECK ("unit_price" >= 0);
