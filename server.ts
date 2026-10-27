import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { pool, initDatabase, seedBaselineData, SUPABASE_DATABASE_URL } from './src/server/db.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Helper to convert DB rows to application objects
function formatAsset(row: any) {
  if (row.raw_data) {
    return {
      ...row.raw_data,
      id: row.id,
      employeeOrDeviceName: row.employee_or_device_name,
      category: row.category,
      specificationOrSN: row.specification_or_sn,
      assetCode: row.asset_code,
      status: row.status,
      department: row.department,
      purchaseDate: row.purchase_date,
      warrantyExpiry: row.warranty_expiry,
      location: row.location,
      isDefective: row.is_defective,
      defectiveDetails: row.defective_details,
      notes: row.notes,
      custodyHistory: row.custody_history || [],
      pmsCompleted: row.pms_completed,
      pmsDate: row.pms_date,
      pmsHalf: row.pms_half,
      pmsTechnician: row.pms_technician,
      pmsRemarks: row.pms_remarks,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
  return {
    id: row.id,
    employeeOrDeviceName: row.employee_or_device_name,
    category: row.category,
    specificationOrSN: row.specification_or_sn,
    assetCode: row.asset_code,
    status: row.status,
    department: row.department,
    purchaseDate: row.purchase_date,
    warrantyExpiry: row.warranty_expiry,
    location: row.location,
    isDefective: row.is_defective,
    defectiveDetails: row.defective_details,
    notes: row.notes,
    custodyHistory: row.custody_history || [],
    pmsCompleted: row.pms_completed,
    pmsDate: row.pms_date,
    pmsHalf: row.pms_half,
    pmsTechnician: row.pms_technician,
    pmsRemarks: row.pms_remarks,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ==========================================
// SUPABASE REST API ROUTES
// ==========================================

// 1. Health & Status
app.get('/api/status', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW() as now, current_database() as db');
    const assetCount = await pool.query('SELECT COUNT(*) FROM assets');
    res.json({
      success: true,
      provider: 'Supabase PostgreSQL',
      connected: true,
      database: dbRes.rows[0].db,
      serverTime: dbRes.rows[0].now,
      totalAssets: parseInt(assetCount.rows[0].count, 10),
      host: 'aws-0-ap-northeast-1.pooler.supabase.com',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      provider: 'Supabase PostgreSQL',
      connected: false,
      error: error.message,
    });
  }
});

// 2. Google Workspace Authentication & SSO
app.post('/api/auth/google-workspace', async (req, res) => {
  try {
    const { email, name, picture, role, department, hd } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const userId = `usr-${email.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
    const userRole = role || (email.includes('peralta') || email.includes('admin') ? 'Super Admin' : 'IT Admin');
    const userDept = department || 'IT Infrastructure & Security';
    const domain = hd || email.split('@')[1] || 'coolaireconsolidated.com';

    const query = `
      INSERT INTO users (id, email, name, role, department, picture, google_workspace_domain, last_login)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        picture = COALESCE(EXCLUDED.picture, users.picture),
        last_login = NOW()
      RETURNING *;
    `;
    const result = await pool.query(query, [userId, email, name || email.split('@')[0], userRole, userDept, picture || null, domain]);

    // Log Activity
    await pool.query(
      `INSERT INTO activity_logs (id, timestamp, actor, action, target_entity, target_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        `log-${Date.now()}`,
        new Date().toISOString().replace('T', ' ').substring(0, 19),
        `${email} (${userRole})`,
        'GOOGLE_WORKSPACE_LOGIN',
        'User',
        userId,
        `User signed in via Google Workspace SSO (@${domain})`
      ]
    );

    res.json({
      success: true,
      user: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        name: result.rows[0].name,
        role: result.rows[0].role,
        department: result.rows[0].department,
        picture: result.rows[0].picture,
        domain: result.rows[0].google_workspace_domain,
        adId: `COOLAIRE\\${email.split('@')[0]}`,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Assets CRUD
app.get('/api/assets', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM assets ORDER BY created_at DESC');
    res.json(result.rows.map(formatAsset));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/assets', async (req, res) => {
  try {
    const asset = req.body;
    const id = asset.id || `ast-${Date.now()}`;
    const now = new Date().toISOString();

    const query = `
      INSERT INTO assets (
        id, employee_or_device_name, category, specification_or_sn, asset_code,
        status, department, purchase_date, warranty_expiry, location,
        is_defective, defective_details, notes, custody_history,
        pms_completed, pms_date, pms_half, pms_technician, pms_remarks,
        raw_data, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $21)
      RETURNING *;
    `;
    const values = [
      id, asset.employeeOrDeviceName, asset.category, asset.specificationOrSN, asset.assetCode,
      asset.status, asset.department, asset.purchaseDate, asset.warrantyExpiry || null, asset.location || null,
      asset.isDefective || false, asset.defectiveDetails || null, asset.notes || null, JSON.stringify(asset.custodyHistory || []),
      asset.pmsCompleted || false, asset.pmsDate || null, asset.pmsHalf || null, asset.pmsTechnician || null, asset.pmsRemarks || null,
      JSON.stringify({ ...asset, id, createdAt: now, updatedAt: now }), now
    ];
    const result = await pool.query(query, values);
    res.json(formatAsset(result.rows[0]));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/assets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();

    // Fetch existing
    const existing = await pool.query('SELECT * FROM assets WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    const current = formatAsset(existing.rows[0]);
    const merged = { ...current, ...updates, updatedAt: now };

    const query = `
      UPDATE assets SET
        employee_or_device_name = $2,
        category = $3,
        specification_or_sn = $4,
        asset_code = $5,
        status = $6,
        department = $7,
        purchase_date = $8,
        warranty_expiry = $9,
        location = $10,
        is_defective = $11,
        defective_details = $12,
        notes = $13,
        custody_history = $14,
        pms_completed = $15,
        pms_date = $16,
        pms_half = $17,
        pms_technician = $18,
        pms_remarks = $19,
        raw_data = $20,
        updated_at = $21
      WHERE id = $1
      RETURNING *;
    `;
    const values = [
      id, merged.employeeOrDeviceName, merged.category, merged.specificationOrSN, merged.assetCode,
      merged.status, merged.department, merged.purchaseDate, merged.warrantyExpiry || null, merged.location || null,
      merged.isDefective || false, merged.defectiveDetails || null, merged.notes || null, JSON.stringify(merged.custodyHistory || []),
      merged.pmsCompleted || false, merged.pmsDate || null, merged.pmsHalf || null, merged.pmsTechnician || null, merged.pmsRemarks || null,
      JSON.stringify(merged), now
    ];
    const result = await pool.query(query, values);
    res.json(formatAsset(result.rows[0]));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/assets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM assets WHERE id = $1', [id]);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Onboardings CRUD
app.get('/api/onboardings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM onboardings ORDER BY created_at DESC');
    res.json(result.rows.map(r => r.raw_data || r));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/onboardings', async (req, res) => {
  try {
    const rec = req.body;
    const id = rec.id || `onb-${Date.now()}`;
    const now = new Date().toISOString();
    const full = { ...rec, id, createdAt: now, updatedAt: now };

    await pool.query(`
      INSERT INTO onboardings (
        id, employee_name, department, position, start_date, company,
        control_number, status, date_of_onboarding, device_issued, serial_number, remarks, raw_data, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)
      ON CONFLICT (id) DO UPDATE SET raw_data = $13, updated_at = $14;
    `, [
      id, rec.employeeName, rec.department, rec.position, rec.startDate, rec.company,
      rec.controlNumber, rec.status, rec.dateOfOnboarding, rec.deviceIssued || null, rec.serialNumber || null, rec.remarks || null,
      JSON.stringify(full), now
    ]);
    res.json(full);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/onboardings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const existing = await pool.query('SELECT * FROM onboardings WHERE id = $1', [id]);
    const current = existing.rows[0]?.raw_data || {};
    const merged = { ...current, ...updates, id, updatedAt: now };

    await pool.query(`
      UPDATE onboardings SET
        employee_name = $2, department = $3, position = $4, start_date = $5,
        company = $6, control_number = $7, status = $8, date_of_onboarding = $9,
        raw_data = $10, updated_at = $11
      WHERE id = $1;
    `, [
      id, merged.employeeName, merged.department, merged.position, merged.startDate,
      merged.company, merged.controlNumber, merged.status, merged.dateOfOnboarding,
      JSON.stringify(merged), now
    ]);
    res.json(merged);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/onboardings/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM onboardings WHERE id = $1', [req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Offboardings CRUD
app.get('/api/offboardings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM offboardings ORDER BY created_at DESC');
    res.json(result.rows.map(r => r.raw_data || r));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/offboardings', async (req, res) => {
  try {
    const rec = req.body;
    const id = rec.id || `off-${Date.now()}`;
    const now = new Date().toISOString();
    const full = { ...rec, id, createdAt: now, updatedAt: now };

    await pool.query(`
      INSERT INTO offboardings (
        id, employee_name, department, position, separation_date, company,
        control_number, status, returned_devices, it_clearance_by, remarks, raw_data, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
      ON CONFLICT (id) DO UPDATE SET raw_data = $12, updated_at = $13;
    `, [
      id, rec.employeeName, rec.department, rec.position, rec.separationDate, rec.company,
      rec.controlNumber, rec.status, JSON.stringify(rec.returnedDevices || []), rec.itClearanceBy || null, rec.remarks || null,
      JSON.stringify(full), now
    ]);
    res.json(full);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/offboardings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const existing = await pool.query('SELECT * FROM offboardings WHERE id = $1', [id]);
    const current = existing.rows[0]?.raw_data || {};
    const merged = { ...current, ...updates, id, updatedAt: now };

    await pool.query(`
      UPDATE offboardings SET
        employee_name = $2, department = $3, position = $4, separation_date = $5,
        company = $6, control_number = $7, status = $8, raw_data = $9, updated_at = $10
      WHERE id = $1;
    `, [
      id, merged.employeeName, merged.department, merged.position, merged.separationDate,
      merged.company, merged.controlNumber, merged.status, JSON.stringify(merged), now
    ]);
    res.json(merged);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/offboardings/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM offboardings WHERE id = $1', [req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Requests CRUD (PR & IER)
app.get('/api/requests', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM requests ORDER BY created_at DESC');
    res.json(result.rows.map(r => r.raw_data || r));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/requests', async (req, res) => {
  try {
    const rec = req.body;
    const id = rec.id || `req-${Date.now()}`;
    const now = new Date().toISOString();
    const full = { ...rec, id, createdAt: now, updatedAt: now };

    await pool.query(`
      INSERT INTO requests (
        id, date_reported, request_type, reference_no, employee_or_requester_name,
        department_or_branches, actions_taken_or_remarks, date_created, date_resolved,
        days, major_or_minor, status, raw_data, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)
      ON CONFLICT (id) DO UPDATE SET raw_data = $13, updated_at = $14;
    `, [
      id, rec.dateReported, rec.requestType, rec.referenceNo, rec.employeeOrRequesterName,
      rec.departmentOrBranches, rec.actionsTakenOrRemarks, rec.dateCreated, rec.dateResolved || null,
      rec.days || 0, rec.majorOrMinor, rec.status, JSON.stringify(full), now
    ]);
    res.json(full);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const existing = await pool.query('SELECT * FROM requests WHERE id = $1', [id]);
    const current = existing.rows[0]?.raw_data || {};
    const merged = { ...current, ...updates, id, updatedAt: now };

    await pool.query(`
      UPDATE requests SET
        date_reported = $2, request_type = $3, reference_no = $4,
        employee_or_requester_name = $5, department_or_branches = $6,
        actions_taken_or_remarks = $7, date_resolved = $8, days = $9,
        major_or_minor = $10, status = $11, raw_data = $12, updated_at = $13
      WHERE id = $1;
    `, [
      id, merged.dateReported, merged.requestType, merged.referenceNo,
      merged.employeeOrRequesterName, merged.departmentOrBranches, merged.actionsTakenOrRemarks,
      merged.dateResolved || null, merged.days || 0, merged.majorOrMinor, merged.status,
      JSON.stringify(merged), now
    ]);
    res.json(merged);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/requests/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM requests WHERE id = $1', [req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Borrowings CRUD
app.get('/api/borrowings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM borrowings ORDER BY created_at DESC');
    res.json(result.rows.map(r => r.raw_data || r));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/borrowings', async (req, res) => {
  try {
    const rec = req.body;
    const id = rec.id || `brw-${Date.now()}`;
    const now = new Date().toISOString();
    const full = { ...rec, id, createdAt: now, updatedAt: now };

    await pool.query(`
      INSERT INTO borrowings (
        id, borrower_name, department, item_category, item_name_or_code,
        borrow_date, return_date, status, purpose, remarks, raw_data, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
      ON CONFLICT (id) DO UPDATE SET raw_data = $11, updated_at = $12;
    `, [
      id, rec.borrowerName, rec.department, rec.itemCategory, rec.itemNameOrCode || null,
      rec.borrowDate, rec.returnDate, rec.status, rec.purpose || null, rec.remarks || null,
      JSON.stringify(full), now
    ]);
    res.json(full);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/borrowings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const existing = await pool.query('SELECT * FROM borrowings WHERE id = $1', [id]);
    const current = existing.rows[0]?.raw_data || {};
    const merged = { ...current, ...updates, id, updatedAt: now };

    await pool.query(`
      UPDATE borrowings SET
        borrower_name = $2, department = $3, item_category = $4,
        item_name_or_code = $5, borrow_date = $6, return_date = $7,
        status = $8, purpose = $9, remarks = $10, raw_data = $11, updated_at = $12
      WHERE id = $1;
    `, [
      id, merged.borrowerName, merged.department, merged.itemCategory,
      merged.itemNameOrCode || null, merged.borrowDate, merged.returnDate,
      merged.status, merged.purpose || null, merged.remarks || null,
      JSON.stringify(merged), now
    ]);
    res.json(merged);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/borrowings/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM borrowings WHERE id = $1', [req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Preventive Maintenance CRUD
app.get('/api/preventive-maintenance', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM preventive_maintenance ORDER BY created_at DESC');
    res.json(result.rows.map(r => r.raw_data || r));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/preventive-maintenance', async (req, res) => {
  try {
    const rec = req.body;
    const id = rec.id || `pm-${Date.now()}`;
    const now = new Date().toISOString();
    const full = { ...rec, id, createdAt: now, updatedAt: now };

    await pool.query(`
      INSERT INTO preventive_maintenance (
        id, description, date, date_purchase, asset_code, activity_work_done,
        performed_by, status, recommendation, department, raw_data, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
      ON CONFLICT (id) DO UPDATE SET raw_data = $11, updated_at = $12;
    `, [
      id, rec.description, rec.date, rec.datePurchase, rec.assetCode, rec.activityWorkDone,
      rec.performedBy, rec.status, rec.recommendation, rec.department,
      JSON.stringify(full), now
    ]);
    res.json(full);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/preventive-maintenance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const existing = await pool.query('SELECT * FROM preventive_maintenance WHERE id = $1', [id]);
    const current = existing.rows[0]?.raw_data || {};
    const merged = { ...current, ...updates, id, updatedAt: now };

    await pool.query(`
      UPDATE preventive_maintenance SET
        description = $2, date = $3, date_purchase = $4, asset_code = $5,
        activity_work_done = $6, performed_by = $7, status = $8,
        recommendation = $9, department = $10, raw_data = $11, updated_at = $12
      WHERE id = $1;
    `, [
      id, merged.description, merged.date, merged.datePurchase, merged.assetCode,
      merged.activityWorkDone, merged.performedBy, merged.status,
      merged.recommendation, merged.department, JSON.stringify(merged), now
    ]);
    res.json(merged);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/preventive-maintenance/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM preventive_maintenance WHERE id = $1', [req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Liabilities CRUD
app.get('/api/liabilities', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM liabilities ORDER BY created_at DESC');
    res.json(result.rows.map(r => r.raw_data || r));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/liabilities', async (req, res) => {
  try {
    const rec = req.body;
    const id = rec.id || `lia-${Date.now()}`;
    const now = new Date().toISOString();
    const full = { ...rec, id, createdAt: now, updatedAt: now };

    await pool.query(`
      INSERT INTO liabilities (
        id, qty, uom, item_description, date_issued, employee_name,
        department, asset_code, company, status, remarks, raw_data, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
      ON CONFLICT (id) DO UPDATE SET raw_data = $12, updated_at = $13;
    `, [
      id, rec.qty, rec.uom, rec.itemDescription, rec.dateIssued, rec.employeeName,
      rec.department, rec.assetCode, rec.company, rec.status || null, rec.remarks || null,
      JSON.stringify(full), now
    ]);
    res.json(full);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/liabilities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const existing = await pool.query('SELECT * FROM liabilities WHERE id = $1', [id]);
    const current = existing.rows[0]?.raw_data || {};
    const merged = { ...current, ...updates, id, updatedAt: now };

    await pool.query(`
      UPDATE liabilities SET
        qty = $2, uom = $3, item_description = $4, date_issued = $5,
        employee_name = $6, department = $7, asset_code = $8, company = $9,
        status = $10, remarks = $11, raw_data = $12, updated_at = $13
      WHERE id = $1;
    `, [
      id, merged.qty, merged.uom, merged.itemDescription, merged.dateIssued,
      merged.employeeName, merged.department, merged.assetCode, merged.company,
      merged.status || null, merged.remarks || null, JSON.stringify(merged), now
    ]);
    res.json(merged);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/liabilities/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM liabilities WHERE id = $1', [req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Activity Logs
app.get('/api/activity-logs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 200');
    res.json(result.rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      actor: r.actor,
      action: r.action,
      targetEntity: r.target_entity,
      targetId: r.target_id,
      details: r.details,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/activity-logs', async (req, res) => {
  try {
    const log = req.body;
    const id = log.id || `log-${Date.now()}`;
    await pool.query(`
      INSERT INTO activity_logs (id, timestamp, actor, action, target_entity, target_id, details)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [id, log.timestamp, log.actor, log.action, log.targetEntity, log.targetId || null, log.details]);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 11. System Settings
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query("SELECT data FROM system_settings WHERE id = 'global'");
    if (result.rows.length > 0) {
      res.json(result.rows[0].data);
    } else {
      res.json(null);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const settings = req.body;
    await pool.query(`
      INSERT INTO system_settings (id, data, updated_at)
      VALUES ('global', $1, NOW())
      ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW();
    `, [JSON.stringify(settings)]);
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 12. Dropdowns Taxonomy
app.get('/api/dropdowns', async (req, res) => {
  try {
    const result = await pool.query("SELECT data FROM dropdown_options WHERE id = 'categories'");
    if (result.rows.length > 0) {
      res.json(result.rows[0].data);
    } else {
      res.json(null);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/dropdowns', async (req, res) => {
  try {
    const dropdowns = req.body;
    await pool.query(`
      INSERT INTO dropdown_options (id, data, updated_at)
      VALUES ('categories', $1, NOW())
      ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW();
    `, [JSON.stringify(dropdowns)]);
    res.json(dropdowns);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 13. KPI 2026 Records
app.get('/api/kpi-records', async (req, res) => {
  try {
    const result = await pool.query("SELECT data FROM kpi_records WHERE id = '2026'");
    if (result.rows.length > 0) {
      res.json(result.rows[0].data);
    } else {
      res.json(null);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/kpi-records', async (req, res) => {
  try {
    const kpi = req.body;
    await pool.query(`
      INSERT INTO kpi_records (id, data, updated_at)
      VALUES ('2026', $1, NOW())
      ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW();
    `, [JSON.stringify(kpi)]);
    res.json(kpi);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 14. Seed & Clear Database
app.post('/api/seed', async (req, res) => {
  const client = await pool.connect();
  try {
    await seedBaselineData(client);
    res.json({ success: true, message: 'Enterprise data re-seeded to Supabase PostgreSQL' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/clear', async (req, res) => {
  try {
    const { password, clearScope } = req.body;
    const settingsRes = await pool.query("SELECT data FROM system_settings WHERE id = 'global'");
    const expectedPassword = settingsRes.rows[0]?.data?.masterAdminPassword || 'ITAdmin@2026';

    if (password !== expectedPassword) {
      return res.status(403).json({ success: false, message: 'Invalid IT Admin Master Password. Access denied.' });
    }

    if (clearScope === 'all') {
      await pool.query(`
        TRUNCATE TABLE assets, onboardings, offboardings, requests, borrowings, preventive_maintenance, liabilities, activity_logs CASCADE;
      `);
      return res.json({ success: true, message: 'All inventory data cleared from Supabase.' });
    } else if (clearScope === 'assets') {
      await pool.query('TRUNCATE TABLE assets CASCADE;');
      return res.json({ success: true, message: 'Assets cleared from Supabase.' });
    } else if (clearScope === 'requests') {
      await pool.query('TRUNCATE TABLE requests CASCADE;');
      return res.json({ success: true, message: 'Requests cleared from Supabase.' });
    } else if (clearScope === 'borrowings') {
      await pool.query('TRUNCATE TABLE borrowings CASCADE;');
      return res.json({ success: true, message: 'Borrowings cleared from Supabase.' });
    }

    res.status(400).json({ success: false, message: 'Invalid clear scope' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// VITE DEV SERVER / STATIC SERVING
// ==========================================
async function startServer() {
  try {
    // 1. Auto-create tables in Supabase PostgreSQL
    await initDatabase();

    const isProduction = process.env.NODE_ENV === 'production';

    if (!isProduction) {
      // Dynamic import for Vite in development mode
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('[Express Server] Vite middlewares mounted in dev mode.');
    } else {
      // Production static file serving
      const distPath = path.resolve(__dirname, 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
      console.log(`[Express Server] Serving production build from ${distPath}`);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 ITM Pro Server running on http://0.0.0.0:${PORT}`);
      console.log(`📦 Supabase PostgreSQL Active: ${SUPABASE_DATABASE_URL.split('@')[1]}`);
    });
  } catch (err) {
    console.error('Fatal Server Startup Error:', err);
    process.exit(1);
  }
}

startServer();
