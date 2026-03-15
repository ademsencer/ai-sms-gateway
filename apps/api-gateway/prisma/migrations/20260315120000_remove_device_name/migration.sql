-- DropIndex
DROP INDEX `devices_name_key` ON `devices`;
DROP INDEX `devices_name_idx` ON `devices`;

-- AlterTable
ALTER TABLE `devices` DROP COLUMN `name`;
