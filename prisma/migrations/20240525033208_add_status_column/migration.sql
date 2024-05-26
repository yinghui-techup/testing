-- CreateTable
CREATE TABLE "JobApplication" (
    "id" SERIAL NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "hiringManager" TEXT NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "firstInterview" BOOLEAN NOT NULL DEFAULT false,
    "finalInterview" BOOLEAN NOT NULL DEFAULT false,
    "offer" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'Ongoing',
    "notes" TEXT NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);
