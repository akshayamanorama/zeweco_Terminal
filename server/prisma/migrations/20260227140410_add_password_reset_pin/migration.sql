-- CreateTable
CREATE TABLE "PasswordResetPin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL
);
