-- CreateTable
CREATE TABLE "workday_configs" (
    "id" TEXT NOT NULL,
    "tenant_name" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_secret" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "api_endpoint" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workday_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "workday_system_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "auto_launch" BOOLEAN NOT NULL DEFAULT false,
    "polling_interval" TEXT NOT NULL DEFAULT '10m',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_runs" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "run_by" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "logs" TEXT,
    "error_message" TEXT,

    CONSTRAINT "integration_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analyses" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "suggested_fix" TEXT NOT NULL,
    "detected_root_cause" TEXT NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integrations_workday_system_id_key" ON "integrations"("workday_system_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_analyses_run_id_key" ON "ai_analyses"("run_id");

-- AddForeignKey
ALTER TABLE "integration_runs" ADD CONSTRAINT "integration_runs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "integration_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
