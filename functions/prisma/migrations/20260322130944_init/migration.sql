-- CreateTable
CREATE TABLE "Shop" (
    "myshopifyDomain" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ja',
    "email" TEXT,
    "primaryDomain" TEXT NOT NULL,
    "isSetupComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("myshopifyDomain")
);
