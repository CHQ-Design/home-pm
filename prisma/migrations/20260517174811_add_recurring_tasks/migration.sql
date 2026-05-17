-- CreateTable
CREATE TABLE "RecurringTask" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "intervalValue" INTEGER NOT NULL,
    "intervalUnit" TEXT NOT NULL,
    "nextDue" DATETIME NOT NULL,
    "lastCompleted" DATETIME,
    "assigneeId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecurringTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
