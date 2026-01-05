-- AlterTable
ALTER TABLE "Render" ADD COLUMN "videoId" TEXT;

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prompt" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "seed" INTEGER,
    "negativePrompt" TEXT,
    "status" TEXT NOT NULL,
    "videoUrl" TEXT,
    "userId" TEXT,
    "renderId" TEXT,
    CONSTRAINT "Video_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Video_renderId_fkey" FOREIGN KEY ("renderId") REFERENCES "Render" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Video_renderId_key" ON "Video"("renderId");
