const { Pool } = require("pg");
require("dotenv").config({ path: ".env" });

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    console.log("Running migration...");

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log("✓ PaymentStatus enum created (or already exists)");

    await client.query(`
      ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
    `);
    console.log("✓ status column added");

    await client.query(`
      ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "rejectionNote" TEXT;
    `);
    console.log("✓ rejectionNote column added");

    console.log("Migration complete!");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
