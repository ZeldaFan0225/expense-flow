-- Track user-defined category spending limits.
CREATE TABLE "CategoryLimit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "limitAmountEncrypted" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryLimit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CategoryLimit_userId_categoryId_key"
    ON "CategoryLimit"("userId", "categoryId");

ALTER TABLE "CategoryLimit"
    ADD CONSTRAINT "CategoryLimit_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CategoryLimit"
    ADD CONSTRAINT "CategoryLimit_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
