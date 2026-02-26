-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN "replyToBody" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN "replyToMessageId" TEXT;

-- AlterTable
ALTER TABLE "ChatThreadMember" ADD COLUMN "lastReadAt" DATETIME;
