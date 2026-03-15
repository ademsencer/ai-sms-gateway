-- Add owner_name and iban to devices
ALTER TABLE `devices` ADD COLUMN `owner_name` VARCHAR(191) NOT NULL DEFAULT 'Unknown';
ALTER TABLE `devices` ADD COLUMN `iban` VARCHAR(191) NOT NULL DEFAULT 'N/A';

-- Remove defaults after adding (they were just for existing rows)
ALTER TABLE `devices` ALTER COLUMN `owner_name` DROP DEFAULT;
ALTER TABLE `devices` ALTER COLUMN `iban` DROP DEFAULT;

-- Create audit_logs table
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `username` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `target` VARCHAR(191) NOT NULL,
    `details` TEXT NULL,
    `ip_address` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_user_id_idx`(`user_id`),
    INDEX `audit_logs_action_idx`(`action`),
    INDEX `audit_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
