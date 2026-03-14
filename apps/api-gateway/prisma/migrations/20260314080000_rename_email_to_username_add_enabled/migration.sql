-- RenameColumn
ALTER TABLE `users` RENAME COLUMN `email` TO `username`;

-- AddColumn
ALTER TABLE `users` ADD COLUMN `enabled` BOOLEAN NOT NULL DEFAULT true;
