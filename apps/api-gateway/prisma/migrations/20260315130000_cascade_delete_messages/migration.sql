-- AlterTable: Add CASCADE on delete for sms_messages → devices
ALTER TABLE `sms_messages` DROP FOREIGN KEY `sms_messages_device_id_fkey`;

ALTER TABLE `sms_messages` ADD CONSTRAINT `sms_messages_device_id_fkey`
  FOREIGN KEY (`device_id`) REFERENCES `devices`(`device_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
