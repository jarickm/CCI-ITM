import pg from 'pg';
import dotenv from 'dotenv';
import { 
  SEED_ASSETS, 
  SEED_ONBOARDINGS, 
  SEED_OFFBOARDINGS, 
  SEED_REQUESTS, 
  SEED_BORROWINGS, 
  SEED_PREVENTIVE_MAINTENANCE, 
  SEED_LIABILITIES, 
  SEED_ACTIVITY_LOGS, 
  INITIAL_SETTINGS, 
  DEFAULT_DROPDOWN_OPTIONS, 
  SEED_KPI_2026 
} from '../data/seedData';

dotenv.config();

const { Pool } = pg;

export const SUPABASE_DATABASE_URL = 
  process.env.DATABASE_URL || 
  'postgresql://postgres.byasmykumlpzrldseest:Coolaire%40502022@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';

export const pool = new Pool({
  connectionString: SUPABASE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

/**
 * Automatically creates all tables in Supabase PostgreSQL upon startup
 * and seeds baseline enterprise records if tables are empty.
 */
export async function initDatabase(): Promise<{ success: boolean; message: string }> {
  const client = await pool.connect();
  try {
    console.log('[Supabase DB] Connected to Supabase PostgreSQL. Verifying schemas...');

    // 1. Assets Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id VARCHAR(64) PRIMARY KEY,
        employee_or_device_name VARCHAR(200) NOT NULL,
        category VARCHAR(100) NOT NULL,
        specification_or_sn TEXT NOT NULL,
        asset_code VARCHAR(100) NOT NULL UNIQUE,
        status VARCHAR(60) NOT NULL,
        department VARCHAR(120) NOT NULL,
        purchase_date VARCHAR(60) NOT NULL,
        warranty_expiry VARCHAR(60),
        location VARCHAR(120),
        is_defective BOOLEAN DEFAULT FALSE,
        defective_details TEXT,
        notes TEXT,
        custody_history JSONB DEFAULT '[]'::jsonb,
        pms_completed BOOLEAN DEFAULT FALSE,
        pms_date VARCHAR(60),
        pms_half VARCHAR(60),
        pms_technician VARCHAR(120),
        pms_remarks TEXT,
        raw_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
      CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
      CREATE INDEX IF NOT EXISTS idx_assets_dept ON assets(department);
    `);

    // 2. Onboardings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS onboardings (
        id VARCHAR(64) PRIMARY KEY,
        employee_name VARCHAR(200) NOT NULL,
        department VARCHAR(120) NOT NULL,
        position VARCHAR(120) NOT NULL,
        start_date VARCHAR(60) NOT NULL,
        company VARCHAR(120) NOT NULL,
        control_number VARCHAR(100) NOT NULL,
        status VARCHAR(60) NOT NULL,
        date_of_onboarding VARCHAR(60) NOT NULL,
        device_issued VARCHAR(200),
        serial_number VARCHAR(120),
        remarks TEXT,
        raw_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 3. Offboardings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS offboardings (
        id VARCHAR(64) PRIMARY KEY,
        employee_name VARCHAR(200) NOT NULL,
        department VARCHAR(120) NOT NULL,
        position VARCHAR(120) NOT NULL,
        separation_date VARCHAR(60) NOT NULL,
        company VARCHAR(120) NOT NULL,
        control_number VARCHAR(100) NOT NULL,
        status VARCHAR(60) NOT NULL,
        returned_devices JSONB DEFAULT '[]'::jsonb,
        it_clearance_by VARCHAR(120),
        remarks TEXT,
        raw_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 4. Requests Table (PR / IER)
    await client.query(`
      CREATE TABLE IF NOT EXISTS requests (
        id VARCHAR(64) PRIMARY KEY,
        date_reported VARCHAR(60) NOT NULL,
        request_type VARCHAR(30) NOT NULL,
        reference_no VARCHAR(100) NOT NULL,
        employee_or_requester_name VARCHAR(200) NOT NULL,
        department_or_branches VARCHAR(150) NOT NULL,
        actions_taken_or_remarks TEXT NOT NULL,
        date_created VARCHAR(60) NOT NULL,
        date_resolved VARCHAR(60),
        days NUMERIC DEFAULT 0,
        major_or_minor VARCHAR(40) NOT NULL,
        status VARCHAR(60) NOT NULL,
        raw_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(request_type);
      CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
    `);

    // 5. Borrowings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS borrowings (
        id VARCHAR(64) PRIMARY KEY,
        borrower_name VARCHAR(200) NOT NULL,
        department VARCHAR(120) NOT NULL,
        item_category VARCHAR(100) NOT NULL,
        item_name_or_code VARCHAR(200),
        borrow_date VARCHAR(60) NOT NULL,
        return_date VARCHAR(60) NOT NULL,
        status VARCHAR(60) NOT NULL,
        purpose TEXT,
        remarks TEXT,
        raw_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_borrowings_status ON borrowings(status);
    `);

    // 6. Preventive Maintenance Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS preventive_maintenance (
        id VARCHAR(64) PRIMARY KEY,
        description VARCHAR(250) NOT NULL,
        date VARCHAR(60) NOT NULL,
        date_purchase VARCHAR(60) NOT NULL,
        asset_code VARCHAR(100) NOT NULL,
        activity_work_done TEXT NOT NULL,
        performed_by VARCHAR(150) NOT NULL,
        status VARCHAR(60) NOT NULL,
        recommendation TEXT NOT NULL,
        department VARCHAR(120) NOT NULL,
        raw_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 7. Liabilities Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS liabilities (
        id VARCHAR(64) PRIMARY KEY,
        qty NUMERIC NOT NULL DEFAULT 1,
        uom VARCHAR(40) NOT NULL,
        item_description VARCHAR(250) NOT NULL,
        date_issued VARCHAR(60) NOT NULL,
        employee_name VARCHAR(200) NOT NULL,
        department VARCHAR(120) NOT NULL,
        asset_code VARCHAR(100) NOT NULL,
        company VARCHAR(120) NOT NULL,
        status VARCHAR(60),
        remarks TEXT,
        raw_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 8. Activity Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id VARCHAR(64) PRIMARY KEY,
        timestamp VARCHAR(60) NOT NULL,
        actor VARCHAR(200) NOT NULL,
        action VARCHAR(100) NOT NULL,
        target_entity VARCHAR(80) NOT NULL,
        target_id VARCHAR(100),
        details TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
    `);

    // 9. System Settings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id VARCHAR(64) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 10. Dropdown Options Taxonomy Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS dropdown_options (
        id VARCHAR(64) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 11. KPI Records Table (IT 2026 Target Measurement)
    await client.query(`
      CREATE TABLE IF NOT EXISTS kpi_records (
        id VARCHAR(64) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 12. Users Table (Google Workspace SSO)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(120) PRIMARY KEY,
        email VARCHAR(200) NOT NULL UNIQUE,
        name VARCHAR(200) NOT NULL,
        role VARCHAR(60) DEFAULT 'Super Admin',
        department VARCHAR(120) DEFAULT 'IT Infrastructure & Security',
        picture TEXT,
        google_workspace_domain VARCHAR(120),
        last_login TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Check if initial seeding is needed
    const assetCount = await client.query('SELECT COUNT(*) FROM assets');
    const count = parseInt(assetCount.rows[0].count, 10);

    if (count === 0) {
      console.log('[Supabase DB] Database is clean. Auto-seeding enterprise datasets into Supabase PostgreSQL...');
      await seedBaselineData(client);
    } else {
      console.log(`[Supabase DB] Database schema is ready. Found ${count} assets in Supabase.`);
    }

    return { success: true, message: 'Supabase PostgreSQL database initialized successfully' };
  } catch (error) {
    console.error('[Supabase DB] Error initializing Supabase database:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Seeds baseline records into Supabase PostgreSQL
 */
export async function seedBaselineData(client: pg.PoolClient) {
  // 1. Assets
  for (const a of SEED_ASSETS) {
    await client.query(`
      INSERT INTO assets (
        id, employee_or_device_name, category, specification_or_sn, asset_code,
        status, department, purchase_date, warranty_expiry, location,
        is_defective, defective_details, notes, custody_history,
        pms_completed, pms_date, pms_half, pms_technician, pms_remarks, raw_data, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `, [
      a.id, a.employeeOrDeviceName, a.category, a.specificationOrSN, a.assetCode,
      a.status, a.department, a.purchaseDate, a.warrantyExpiry || null, a.location || null,
      a.isDefective || false, a.defectiveDetails || null, a.notes || null, JSON.stringify(a.custodyHistory || []),
      a.pmsCompleted || false, a.pmsDate || null, a.pmsHalf || null, a.pmsTechnician || null, a.pmsRemarks || null,
      JSON.stringify(a)
    ]);
  }

  // 2. Onboardings
  for (const o of SEED_ONBOARDINGS) {
    const raw = o as any;
    await client.query(`
      INSERT INTO onboardings (
        id, employee_name, department, position, start_date, company,
        control_number, status, date_of_onboarding, device_issued, serial_number, remarks, raw_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO NOTHING;
    `, [
      o.id, o.employeeName, o.department, o.position, o.startDate, o.company,
      o.controlNumber, o.status, o.dateOfOnboarding, raw.deviceIssued || null, raw.serialNumber || null, o.notes || null,
      JSON.stringify(o)
    ]);
  }

  // 3. Offboardings
  for (const off of SEED_OFFBOARDINGS) {
    const raw = off as any;
    await client.query(`
      INSERT INTO offboardings (
        id, employee_name, department, position, separation_date, company,
        control_number, status, returned_devices, it_clearance_by, remarks, raw_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO NOTHING;
    `, [
      off.id, off.employeeName, off.department, off.position, off.separationDate, off.company,
      off.controlNumber, off.status, JSON.stringify(raw.returnedDevices || off.clearedAssets || []), raw.itClearanceBy || null, off.notes || null,
      JSON.stringify(off)
    ]);
  }

  // 4. Requests
  for (const req of SEED_REQUESTS) {
    await client.query(`
      INSERT INTO requests (
        id, date_reported, request_type, reference_no, employee_or_requester_name,
        department_or_branches, actions_taken_or_remarks, date_created, date_resolved,
        days, major_or_minor, status, raw_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO NOTHING;
    `, [
      req.id, req.dateReported, req.requestType, req.referenceNo, req.employeeOrRequesterName,
      req.departmentOrBranches, req.actionsTakenOrRemarks, req.dateCreated, req.dateResolved || null,
      req.days || 0, req.majorOrMinor, req.status,
      JSON.stringify(req)
    ]);
  }

  // 5. Borrowings
  for (const b of SEED_BORROWINGS) {
    const raw = b as any;
    await client.query(`
      INSERT INTO borrowings (
        id, borrower_name, department, item_category, item_name_or_code,
        borrow_date, return_date, status, purpose, remarks, raw_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO NOTHING;
    `, [
      b.id, b.borrowerName, b.department, b.itemCategory, raw.itemNameOrCode || b.assetCode || null,
      b.borrowDate, b.returnDate, b.status, raw.purpose || null, b.remarks || null,
      JSON.stringify(b)
    ]);
  }

  // 6. Preventive Maintenance
  for (const pm of SEED_PREVENTIVE_MAINTENANCE) {
    await client.query(`
      INSERT INTO preventive_maintenance (
        id, description, date, date_purchase, asset_code, activity_work_done,
        performed_by, status, recommendation, department, raw_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO NOTHING;
    `, [
      pm.id, pm.description, pm.date, pm.datePurchase, pm.assetCode, pm.activityWorkDone,
      pm.performedBy, pm.status, pm.recommendation, pm.department,
      JSON.stringify(pm)
    ]);
  }

  // 7. Liabilities
  for (const l of SEED_LIABILITIES) {
    await client.query(`
      INSERT INTO liabilities (
        id, qty, uom, item_description, date_issued, employee_name,
        department, asset_code, company, status, remarks, raw_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO NOTHING;
    `, [
      l.id, l.qty, l.uom, l.itemDescription, l.dateIssued, l.employeeName,
      l.department, l.assetCode, l.company, l.status || null, l.remarks || null,
      JSON.stringify(l)
    ]);
  }

  // 8. Activity Logs
  for (const log of SEED_ACTIVITY_LOGS) {
    await client.query(`
      INSERT INTO activity_logs (id, timestamp, actor, action, target_entity, target_id, details)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING;
    `, [log.id, log.timestamp, log.actor, log.action, log.targetEntity, log.targetId || null, log.details]);
  }

  // 9. System Settings
  await client.query(`
    INSERT INTO system_settings (id, data, updated_at)
    VALUES ('global', $1, NOW())
    ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW();
  `, [JSON.stringify(INITIAL_SETTINGS)]);

  // 10. Dropdown Options Taxonomy
  await client.query(`
    INSERT INTO dropdown_options (id, data, updated_at)
    VALUES ('categories', $1, NOW())
    ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW();
  `, [JSON.stringify(DEFAULT_DROPDOWN_OPTIONS)]);

  // 11. KPI Records
  await client.query(`
    INSERT INTO kpi_records (id, data, updated_at)
    VALUES ('2026', $1, NOW())
    ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW();
  `, [JSON.stringify(SEED_KPI_2026)]);

  // 12. Default Super Admin User (Google Workspace)
  await client.query(`
    INSERT INTO users (id, email, name, role, department, google_workspace_domain)
    VALUES ('usr-jk-peralta', 'jk.peralta@coolaireconsolidated.com', 'JK Peralta', 'Super Admin', 'IT Infrastructure & Security', 'coolaireconsolidated.com')
    ON CONFLICT (id) DO NOTHING;
  `);

  console.log('[Supabase DB] Seeding completed successfully.');
}
