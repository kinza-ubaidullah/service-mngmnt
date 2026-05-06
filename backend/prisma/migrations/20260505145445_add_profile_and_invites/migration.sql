-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CALL_CENTER', 'TECHNICIAN', 'WORKSHOP_MANAGER');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('New', 'Assigned', 'InProgress', 'Completed', 'Cancelled', 'InspectionCompleted', 'PickedForWorkshop', 'Reopened', 'Complaint');

-- CreateEnum
CREATE TYPE "WorkshopStatus" AS ENUM ('Received', 'WorkStarted', 'WaitingForParts', 'WaitingForApproval', 'Ready', 'Delivered', 'Cancelled');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "team_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "profile_picture" TEXT,
    "location_name" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "specialization" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "payment_model" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "area" TEXT,
    "exact_address" TEXT,
    "google_map_link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" SERIAL NOT NULL,
    "lead_id" TEXT NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "product_type" TEXT NOT NULL,
    "problem_details" TEXT,
    "product_image" TEXT,
    "house_image" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'New',
    "is_warranty_claim" BOOLEAN NOT NULL DEFAULT false,
    "assigned_to" INTEGER,
    "assigned_by" INTEGER,
    "assigned_at" TIMESTAMP(3),
    "visit_date" TIMESTAMP(3),
    "actual_problem" TEXT,
    "repair_details" TEXT,
    "total_amount" DECIMAL(10,2),
    "collected_amount" DECIMAL(10,2) DEFAULT 0,
    "warranty_months" INTEGER NOT NULL DEFAULT 1,
    "warranty_start" TIMESTAMP(3),
    "warranty_end" TIMESTAMP(3),
    "team_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_history" (
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" INTEGER,
    "old_status" "JobStatus",
    "new_status" "JobStatus",
    "notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshop_jobs" (
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "received_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "received_by" INTEGER,
    "promised_delivery" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'Normal',
    "status" "WorkshopStatus" NOT NULL DEFAULT 'Received',
    "current_day_count" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "delivered_at" TIMESTAMP(3),
    "delivered_by" INTEGER,

    CONSTRAINT "workshop_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "lead_id" INTEGER,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_tokens" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "leads_lead_id_key" ON "leads"("lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "workshop_jobs_lead_id_key" ON "workshop_jobs"("lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "invite_tokens_token_key" ON "invite_tokens"("token");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_history" ADD CONSTRAINT "job_history_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_jobs" ADD CONSTRAINT "workshop_jobs_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
