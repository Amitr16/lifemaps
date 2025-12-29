import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { generateAdminToken, authenticateSuperAdmin, authenticateAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// ==================== SUPER ADMIN AUTHENTICATION ====================

// Super admin login
router.post('/super-admin/login', [
  body('username').notEmpty().trim(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { username, password } = req.body;

    const result = await pool.query(
      'SELECT id, username, password_hash FROM super_admin WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const superAdmin = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, superAdmin.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateAdminToken(superAdmin.id, 'super_admin');
    
    res.json({
      message: 'Super admin login successful',
      user: {
        id: superAdmin.id,
        username: superAdmin.username,
        role: 'super_admin'
      },
      token
    });
  } catch (error) {
    console.error('Super admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== ADMIN AUTHENTICATION ====================

// Admin login
router.post('/admin/login', [
  body('username').notEmpty().trim(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    console.log('🔐 Admin login attempt:', { username: req.body.username });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { username, password } = req.body;

    const result = await pool.query(
      'SELECT id, username, password_hash, name, email, is_active FROM admin WHERE username = $1',
      [username]
    );

    console.log('🔍 Admin query result:', { found: result.rows.length > 0, username });

    if (result.rows.length === 0) {
      console.log('❌ Admin not found:', username);
      return res.status(401).json({ error: 'Invalid credentials - Admin not found' });
    }

    const admin = result.rows[0];
    
    if (!admin.is_active) {
      console.log('❌ Admin account inactive:', username);
      return res.status(403).json({ error: 'Admin account is inactive' });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    
    console.log('🔐 Password check:', { isValid: isValidPassword });
    
    if (!isValidPassword) {
      console.log('❌ Invalid password for admin:', username);
      return res.status(401).json({ error: 'Invalid credentials - Wrong password' });
    }

    const token = generateAdminToken(admin.id, 'admin');
    
    console.log('✅ Admin login successful:', { id: admin.id, username: admin.username });
    
    res.json({
      message: 'Admin login successful',
      user: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: 'admin'
      },
      token
    });
  } catch (error) {
    console.error('❌ Admin login error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// ==================== SUPER ADMIN - ADMIN MANAGEMENT ====================

// Get all admins (super admin only)
router.get('/super-admin/admins', authenticateSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.id, a.username, a.name, a.email, a.is_active, a.created_at, a.updated_at,
             COUNT(u.id) as user_count
      FROM admin a
      LEFT JOIN "user" u ON u.admin_id = a.id
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `);

    res.json({ admins: result.rows });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create admin (super admin only)
router.post('/super-admin/admins', authenticateSuperAdmin, [
  body('username').notEmpty().trim().isLength({ min: 3 }),
  body('password').isLength({ min: 6 }),
  body('name').optional().trim(),
  body('email').optional().isEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { username, password, name, email } = req.body;

    // Check if admin already exists
    const existing = await pool.query(
      'SELECT id FROM admin WHERE username = $1',
      [username]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Admin username already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      'INSERT INTO admin (username, password_hash, name, email, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, name, email, is_active, created_at',
      [username, passwordHash, name || null, email || null, req.admin.id]
    );

    res.status(201).json({
      message: 'Admin created successfully',
      admin: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update admin (super admin only)
router.put('/super-admin/admins/:adminId', authenticateSuperAdmin, [
  body('username').optional().trim().isLength({ min: 3 }),
  body('password').optional().isLength({ min: 6 }),
  body('name').optional().trim(),
  body('email').optional().isEmail(),
  body('is_active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { adminId } = req.params;
    const { username, password, name, email, is_active } = req.body;

    // Check if admin exists
    const existing = await pool.query(
      'SELECT id FROM admin WHERE id = $1',
      [adminId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (username !== undefined) {
      // Check if username is already taken by another admin
      const usernameCheck = await pool.query(
        'SELECT id FROM admin WHERE username = $1 AND id != $2',
        [username, adminId]
      );
      if (usernameCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      updates.push(`username = $${paramCount++}`);
      values.push(username);
    }

    if (password !== undefined) {
      const passwordHash = await bcrypt.hash(password, 12);
      updates.push(`password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(adminId);

    const query = `UPDATE admin SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, username, name, email, is_active, created_at, updated_at`;
    const result = await pool.query(query, values);

    res.json({
      message: 'Admin updated successfully',
      admin: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete admin (super admin only)
router.delete('/super-admin/admins/:adminId', authenticateSuperAdmin, async (req, res) => {
  try {
    const { adminId } = req.params;

    // Check if admin exists
    const existing = await pool.query(
      'SELECT id FROM admin WHERE id = $1',
      [adminId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Remove admin_id from users (set to NULL)
    await pool.query(
      'UPDATE "user" SET admin_id = NULL WHERE admin_id = $1',
      [adminId]
    );

    // Delete admin
    await pool.query('DELETE FROM admin WHERE id = $1', [adminId]);

    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== SUPER ADMIN - USER MANAGEMENT ====================

// Transfer user to different admin (super admin only)
router.put('/super-admin/users/:userId/transfer', authenticateSuperAdmin, [
  body('admin_id').isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { userId } = req.params;
    const { admin_id } = req.body;

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id FROM "user" WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If admin_id is null, remove assignment. Otherwise verify admin exists
    if (admin_id !== null) {
      const adminCheck = await pool.query(
        'SELECT id FROM admin WHERE id = $1',
        [admin_id]
      );

      if (adminCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Admin not found' });
      }
    }

    await pool.query(
      'UPDATE "user" SET admin_id = $1 WHERE id = $2',
      [admin_id, userId]
    );

    res.json({ message: 'User transferred successfully' });
  } catch (error) {
    console.error('Error transferring user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users with their admin assignments (super admin only)
router.get('/super-admin/users', authenticateSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.name, u.created_at,
             a.id as admin_id, a.username as admin_username, a.name as admin_name
      FROM "user" u
      LEFT JOIN admin a ON u.admin_id = a.id
      ORDER BY u.created_at DESC
    `);

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== ADMIN - USER MANAGEMENT ====================

// Get users assigned to admin
router.get('/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, created_at FROM "user" WHERE admin_id = $1 ORDER BY created_at DESC',
      [req.admin.id]
    );

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user (admin only)
router.post('/admin/users', authenticateAdmin, [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email, password, name } = req.body;

    // Check if user already exists
    const existing = await pool.query(
      'SELECT id FROM "user" WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      'INSERT INTO "user" (email, password_hash, name, admin_id, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, email, name, created_at',
      [email, passwordHash, name, req.admin.id]
    );

    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only - only users assigned to them)
router.delete('/admin/users/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists and is assigned to this admin
    const userCheck = await pool.query(
      'SELECT id, admin_id FROM "user" WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userCheck.rows[0].admin_id !== req.admin.id) {
      return res.status(403).json({ error: 'Access denied. User is not assigned to you' });
    }

    // Delete user (CASCADE will handle related data)
    await pool.query('DELETE FROM "user" WHERE id = $1', [userId]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile (admin can view any user assigned to them)
router.get('/admin/users/:userId/profile', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user is assigned to this admin
    const userCheck = await pool.query(
      'SELECT id, admin_id FROM "user" WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userCheck.rows[0].admin_id !== req.admin.id) {
      return res.status(403).json({ error: 'Access denied. User is not assigned to you' });
    }

    // Get financial profile
    const profileResult = await pool.query(
      'SELECT * FROM financial_profile WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    res.json({ profile: profileResult.rows[0] || null });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

