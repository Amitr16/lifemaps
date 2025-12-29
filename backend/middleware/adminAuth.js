import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

// Generate token for admin/super admin
export const generateAdminToken = (id, role) => {
  return jwt.sign({ adminId: id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Authenticate super admin
export const authenticateSuperAdmin = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }

    const result = await pool.query(
      'SELECT id, username FROM super_admin WHERE id = $1',
      [decoded.adminId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Super admin not found' });
    }

    req.admin = result.rows[0];
    req.admin.role = 'super_admin';
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Authenticate admin (works for both admin and super admin)
export const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role === 'super_admin') {
      // Super admin can access admin routes
      const result = await pool.query(
        'SELECT id, username FROM super_admin WHERE id = $1',
        [decoded.adminId]
      );
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Super admin not found' });
      }
      req.admin = result.rows[0];
      req.admin.role = 'super_admin';
    } else if (decoded.role === 'admin') {
      const result = await pool.query(
        'SELECT id, username, name, email, is_active FROM admin WHERE id = $1',
        [decoded.adminId]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Admin not found' });
      }

      if (!result.rows[0].is_active) {
        return res.status(403).json({ error: 'Admin account is inactive' });
      }

      req.admin = result.rows[0];
      req.admin.role = 'admin';
    } else {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

