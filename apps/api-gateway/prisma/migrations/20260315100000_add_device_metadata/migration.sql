-- AlterTable
ALTER TABLE `devices` ADD COLUMN `android_version` VARCHAR(191) NULL,
    ADD COLUMN `model` VARCHAR(191) NULL,
    ADD COLUMN `serial_number` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `devices_name_idx` ON `devices`(`name`);

-- CreateUniqueIndex
CREATE UNIQUE INDEX `devices_name_key` ON `devices`(`name`);
