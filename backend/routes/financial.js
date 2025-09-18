import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { CORE_COLUMN_DEFINITIONS } from '../constants/columns.js';

const router = express.Router();

// Source preference management
router.get('/source-preferences', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT component, source FROM user_source_preferences WHERE user_id = $1',
      [req.user.id]
    );
    
    const preferences = {};
    result.rows.forEach(row => {
      preferences[row.component] = row.source;
    });
    
    res.json({ preferences });
  } catch (error) {
    console.error('Error fetching source preferences:', error);
    res.status(500).json({ error: 'Failed to fetch source preferences' });
  }
});

router.post('/source-preferences', [
  body('component').isIn(['assets', 'income', 'loans', 'expenses', 'goals']),
  body('source').isInt({ min: 0, max: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { component, source } = req.body;

    await pool.query(`
      INSERT INTO user_source_preferences (user_id, component, source, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id, component)
      DO UPDATE SET source = $3, updated_at = NOW()
    `, [req.user.id, component, source]);

    res.json({ success: true, component, source });
  } catch (error) {
    console.error('Error updating source preference:', error);
    res.status(500).json({ error: 'Failed to update source preference' });
  }
});

// Financial Profile routes
router.post('/profile', [
  body('age').isInt({ min: 18, max: 100 }),
  body('current_annual_gross_income').optional().isFloat({ min: 0 }),
  body('work_tenure_years').optional().isInt({ min: 0, max: 50 }),
  body('total_asset_gross_market_value').optional().isFloat({ min: 0 }),
  body('total_loan_outstanding_value').optional().isFloat({ min: 0 }),
  body('lifespan_years').optional().isInt({ min: 50, max: 120 }),
  body('income_growth_rate').optional().isFloat({ min: 0, max: 1 }),
  body('asset_growth_rate').optional().isFloat({ min: 0, max: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    // Filter out undefined values for dynamic query
    const filteredBody = Object.fromEntries(
      Object.entries(req.body).filter(([_, value]) => value !== undefined)
    );

    const { age, current_annual_gross_income, work_tenure_years,
      total_asset_gross_market_value, total_loan_outstanding_value,
      lifespan_years, income_growth_rate, asset_growth_rate
    } = filteredBody;

    const fields = [];
    const values = [];
    let paramCount = 1;

    fields.push('user_id'); values.push(req.user.id);
    if (age !== undefined) { fields.push('age'); values.push(age); }
    if (current_annual_gross_income !== undefined) { fields.push('current_annual_gross_income'); values.push(current_annual_gross_income); }
    if (work_tenure_years !== undefined) { fields.push('work_tenure_years'); values.push(work_tenure_years); }
    if (total_asset_gross_market_value !== undefined) { fields.push('total_asset_gross_market_value'); values.push(total_asset_gross_market_value); }
    if (total_loan_outstanding_value !== undefined) { fields.push('total_loan_outstanding_value'); values.push(total_loan_outstanding_value); }
    if (lifespan_years !== undefined) { fields.push('lifespan_years'); values.push(lifespan_years); }
    if (income_growth_rate !== undefined) { fields.push('income_growth_rate'); values.push(income_growth_rate); }
    if (asset_growth_rate !== undefined) { fields.push('asset_growth_rate'); values.push(asset_growth_rate); }
    fields.push('created_at'); values.push('NOW()');

    const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
    const query = `INSERT INTO financial_profile (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`;

    const result = await pool.query(query, values);

    res.status(201).json({
      message: 'Financial profile created successfully',
      profile: result.rows[0]
    });
  } catch (error) {
    console.error('Profile creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let result = await pool.query(
      'SELECT * FROM financial_profile WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    // If no profile exists, create a default one
    if (result.rows.length === 0) {
      console.log(`Creating default financial profile for user ${userId}`);
      
      const defaultProfile = {
        age: 30,
        current_annual_gross_income: 0,
        work_tenure_years: 0,
        total_asset_gross_market_value: 0,
        total_loan_outstanding_value: 0,
        lifespan_years: 80,
        income_growth_rate: 0.05,
        asset_growth_rate: 0.07
      };

      const insertResult = await pool.query(
        `INSERT INTO financial_profile (user_id, age, current_annual_gross_income, work_tenure_years, 
         total_asset_gross_market_value, total_loan_outstanding_value, lifespan_years, 
         income_growth_rate, asset_growth_rate, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) 
         RETURNING *`,
        [userId, defaultProfile.age, defaultProfile.current_annual_gross_income, 
         defaultProfile.work_tenure_years, defaultProfile.total_asset_gross_market_value,
         defaultProfile.total_loan_outstanding_value, defaultProfile.lifespan_years,
         defaultProfile.income_growth_rate, defaultProfile.asset_growth_rate]
      );

      result = insertResult;
      console.log(`Default financial profile created for user ${userId}`);
    }

    res.json({ profile: result.rows[0] });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/profile/:profileId', [
  body('age').optional().isInt({ min: 18, max: 100 }),
  body('current_annual_gross_income').optional().isFloat({ min: 0 }),
  body('work_tenure_years').optional().isInt({ min: 0, max: 50 }),
  body('total_asset_gross_market_value').optional().isFloat({ min: 0 }),
  body('total_loan_outstanding_value').optional().isFloat({ min: 0 }),
  body('lifespan_years').optional().isInt({ min: 50, max: 120 }),
  body('income_growth_rate').optional().isFloat({ min: 0, max: 1 }),
  body('asset_growth_rate').optional().isFloat({ min: 0, max: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { profileId } = req.params;
    const updates = [];
    const values = [];
    let paramCount = 1;

    // Check if profile belongs to user
    const profileCheck = await pool.query(
      'SELECT user_id FROM financial_profile WHERE id = $1',
      [profileId]
    );

    if (profileCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Financial profile not found' });
    }

    if (profileCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build dynamic update query
    Object.entries(req.body).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(profileId);
    const query = `UPDATE financial_profile SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);

    res.json({
      message: 'Profile updated successfully',
      profile: result.rows[0]
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Goals routes (singular)
router.post('/goal', [
  body('name').optional().trim(),
  body('target_amount').optional().isNumeric(),
  body('target_year').optional().isInt(),
  body('target_date').optional().isISO8601(),
  body('term').optional().isIn(['ST', 'LT']),
  body('recommended_allocation').optional().trim(),
  body('funding_source').optional().trim(),
  body('on_track').optional().isBoolean(),
  body('custom_data').optional().isObject()
], async (req, res) => {
  try {
    console.log('🎯 Goal creation request body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    // Map Life Sheet fields to LifeMaps schema
    const name = req.body.name ?? req.body.description ?? null;
    const target_amount = req.body.target_amount ?? req.body.amount ?? null;
    const target_date = req.body.target_date ?? null;
    const target_year = req.body.target_year ?? req.body.targetYear ?? null;
    const term = req.body.term ?? 'LT';
    const recommended_allocation = req.body.recommended_allocation ?? null;
    const funding_source = req.body.funding_source ?? null;
    const on_track = req.body.on_track ?? false;
    
    console.log('🎯 Mapped values:', { name, target_amount, target_year, term });

    // Build dynamic query for goal creation
    const fields = ['user_id'];
    const values = [req.user.id];

    // Add profile_id if provided, otherwise get the latest profile
    const profileId = req.body.profile_id || req.body.profileId;
    if (profileId) {
      fields.push('profile_id');
      values.push(profileId);
    } else {
      // Get the latest profile for this user
      const profileResult = await pool.query(
        'SELECT id FROM financial_profile WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [req.user.id]
      );
      if (profileResult.rows.length > 0) {
        fields.push('profile_id');
        values.push(profileResult.rows[0].id);
      }
    }

    if (name !== null && name !== undefined) { fields.push('name'); values.push(name); }
    if (target_amount !== null && target_amount !== undefined) { fields.push('target_amount'); values.push(target_amount); }
    if (target_date !== null && target_date !== undefined) { fields.push('target_date'); values.push(target_date); }
    if (target_year !== null && target_year !== undefined) { fields.push('target_year'); values.push(target_year); }
    if (term !== null && term !== undefined) { fields.push('term'); values.push(term); }
    if (recommended_allocation !== null && recommended_allocation !== undefined) { fields.push('recommended_allocation'); values.push(recommended_allocation); }
    if (funding_source !== null && funding_source !== undefined) { fields.push('funding_source'); values.push(funding_source); }
    if (on_track !== null && on_track !== undefined) { fields.push('on_track'); values.push(on_track); }
    if (req.body.custom_data !== null && req.body.custom_data !== undefined) { fields.push('custom_data'); values.push(req.body.custom_data); }

    const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
    const query = `INSERT INTO financial_goal (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    
    console.log('🎯 SQL Query:', query);
    console.log('🎯 Values:', values);
    
    const result = await pool.query(query, values);
    
    console.log('🎯 Created goal:', result.rows[0]);

    res.status(201).json({
      message: 'Financial goal created successfully',
      goal: result.rows[0]
    });
  } catch (error) {
    console.error('Goal creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/goal/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'SELECT * FROM financial_goal WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    // Map database fields to frontend field names
    const mappedGoals = result.rows.map(goal => ({
      id: goal.id,
      description: goal.name, // Map name to description
      amount: goal.target_amount, // Map target_amount to amount
      targetYear: goal.target_year, // Map target_year to targetYear
      custom_data: goal.custom_data || {}, // Include custom_data field
      user_id: goal.user_id,
      created_at: goal.created_at,
      updated_at: goal.updated_at
    }));

    res.json({ goals: mappedGoals });
  } catch (error) {
    console.error('Goals fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/goal/:goalId', [
  body('name').optional().trim().isLength({ min: 1 }),
  body('target_amount').optional().isFloat({ min: 0 }),
  body('target_date').optional().isISO8601(),
  body('term').optional().isIn(['ST', 'LT']),
  body('recommended_allocation').optional().trim(),
  body('funding_source').optional().trim(),
  body('on_track').optional().isBoolean(),
  body('custom_data').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { goalId } = req.params;
    const updates = [];
    const values = [];
    let paramCount = 1;

    // Check ownership
    const goalCheck = await pool.query(
      'SELECT user_id FROM financial_goal WHERE id = $1',
      [goalId]
    );

    if (goalCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    if (goalCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build dynamic update query with field mapping
    const usedColumns = new Set();
    Object.entries(req.body).forEach(([key, value]) => {
      if (value !== undefined) {
        // Map frontend field names to database column names for goals
        let dbColumn = key;
        if (key === 'description') dbColumn = 'name';
        if (key === 'amount') dbColumn = 'target_amount';
        if (key === 'targetYear') dbColumn = 'target_year';
        // custom_data should be passed through as-is
        
        // Only add if we haven't already used this column
        if (!usedColumns.has(dbColumn)) {
          updates.push(`${dbColumn} = $${paramCount}`);
          values.push(value);
          usedColumns.add(dbColumn);
          paramCount++;
        }
      }
    });
    
    console.log('🎯 Goal update - updates:', updates);
    console.log('🎯 Goal update - values:', values);
    console.log('🎯 Goal update - custom_data:', req.body.custom_data);
    console.log('🎯 Goal update - custom_data type:', typeof req.body.custom_data);
    console.log('🎯 Goal update - custom_data stringified:', JSON.stringify(req.body.custom_data));
    console.log('🎯 Goal update - full request body:', JSON.stringify(req.body));

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(goalId);
    const query = `UPDATE financial_goal SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);

    res.json({
      message: 'Goal updated successfully',
      goal: result.rows[0]
    });
  } catch (error) {
    console.error('Goal update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/goal/:goalId', async (req, res) => {
  try {
    const { goalId } = req.params;

    // Check ownership
    const goalCheck = await pool.query(
      'SELECT user_id FROM financial_goal WHERE id = $1',
      [goalId]
    );

    if (goalCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    if (goalCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query('DELETE FROM financial_goal WHERE id = $1', [goalId]);

    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Goal deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Expenses routes (singular)
router.post('/expense', [
  body('category').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return typeof value === 'string' && value.trim().length >= 1;
  }),
  body('subcategory').optional().trim(),
  body('frequency').optional().isIn(['Monthly', 'Quarterly', 'Yearly']),
  body('amount').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return !isNaN(parseFloat(value)) && parseFloat(value) >= 0;
  }),
  body('personal_inflation').optional().isFloat({ min: 0, max: 1 }),
  body('source').optional().trim(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    // Map Life Sheet fields to LifeMaps schema
    const description = req.body.description ?? req.body.category ?? 'General';
    const category = req.body.category ?? 'General';
    const subcategory = req.body.subcategory ?? req.body.expense_type ?? null;
    const frequency = req.body.frequency ?? 'Monthly';
    const amount = req.body.amount ?? null;
    const personal_inflation = req.body.personal_inflation ?? 0.06;
    const source = req.body.source ?? null;
    const notes = req.body.notes ?? null;

    // Build dynamic query for expense creation
    const fields = ['user_id'];
    const values = [req.user.id];

    // Add profile_id if provided, otherwise get the latest profile
    const profileId = req.body.profile_id || req.body.profileId;
    if (profileId) {
      fields.push('profile_id');
      values.push(profileId);
    } else {
      // Get the latest profile for this user
      const profileResult = await pool.query(
        'SELECT id FROM financial_profile WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [req.user.id]
      );
      if (profileResult.rows.length > 0) {
        fields.push('profile_id');
        values.push(profileResult.rows[0].id);
      }
    }

    if (description !== null && description !== undefined) { fields.push('description'); values.push(description); }
    if (category !== null && category !== undefined) { fields.push('category'); values.push(category); }
    if (subcategory !== null && subcategory !== undefined) { fields.push('subcategory'); values.push(subcategory); }
    if (frequency !== null && frequency !== undefined) { fields.push('frequency'); values.push(frequency); }
    if (amount !== null && amount !== undefined) { fields.push('amount'); values.push(amount); }
    if (personal_inflation !== null && personal_inflation !== undefined) { fields.push('personal_inflation'); values.push(personal_inflation); }
    if (source !== null && source !== undefined) { fields.push('source'); values.push(source); }
    if (notes !== null && notes !== undefined) { fields.push('notes'); values.push(notes); }

    const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
    const query = `INSERT INTO financial_expense (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    
    const result = await pool.query(query, values);

    res.status(201).json({
      message: 'Expense created successfully',
      expense: result.rows[0]
    });
  } catch (error) {
    console.error('Expense creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/expense/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'SELECT * FROM financial_expense WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({ expenses: result.rows });
  } catch (error) {
    console.error('Expenses fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/expense/:expenseId', [
  body('category').optional().trim().isLength({ min: 1 }),
  body('subcategory').optional().trim(),
  body('frequency').optional().isIn(['Monthly', 'Quarterly', 'Yearly']),
  body('amount').optional().isFloat({ min: 0 }),
  body('personal_inflation').optional().isFloat({ min: 0, max: 1 }),
  body('source').optional().trim(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { expenseId } = req.params;
    const updates = [];
    const values = [];
    let paramCount = 1;

    // Check ownership
    const expenseCheck = await pool.query(
      'SELECT user_id FROM financial_expense WHERE id = $1',
      [expenseId]
    );

    if (expenseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (expenseCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build dynamic update query with field mapping
    const usedColumns = new Set();
    Object.entries(req.body).forEach(([key, value]) => {
      if (value !== undefined) {
        // Map frontend field names to database column names for expenses
        let dbColumn = key;
        if (key === 'description') dbColumn = 'category';
        if (key === 'expense_type') dbColumn = 'subcategory';
        
        // Only add if we haven't already used this column
        if (!usedColumns.has(dbColumn)) {
          updates.push(`${dbColumn} = $${paramCount}`);
          values.push(value);
          usedColumns.add(dbColumn);
          paramCount++;
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(expenseId);
    const query = `UPDATE financial_expense SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);

    res.json({
      message: 'Expense updated successfully',
      expense: result.rows[0]
    });
  } catch (error) {
    console.error('Expense update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/expense/:expenseId', async (req, res) => {
  try {
    const { expenseId } = req.params;

    // Check ownership
    const expenseCheck = await pool.query(
      'SELECT user_id FROM financial_expense WHERE id = $1',
      [expenseId]
    );

    if (expenseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (expenseCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query('DELETE FROM financial_expense WHERE id = $1', [expenseId]);

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Expense deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Loans routes (singular)
router.post('/loan', [
  body('lender').optional().trim().isLength({ min: 1 }),
  body('type').optional().trim().isLength({ min: 1 }),
  body('start_date').optional().isISO8601(),
  body('end_date').optional().isISO8601(),
  body('principal_outstanding').optional().isFloat({ min: 0 }),
  body('rate').optional().isFloat({ min: 0, max: 100 }),
  body('emi').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return !isNaN(parseFloat(value)) && parseFloat(value) >= 0;
  }),
  body('emi_day').optional().isInt({ min: 1, max: 31 }),
  body('prepay_allowed').optional().isBoolean(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    // Map Life Sheet fields to LifeMaps schema
    const lender = req.body.lender ?? req.body.provider ?? req.body.name ?? req.body.description ?? null;
    const type = req.body.type ?? null;
    const start_date = req.body.start_date ?? null;
    const end_date = req.body.end_date ?? null;
    const principal_outstanding = req.body.principal_outstanding ?? req.body.amount ?? null;
    const rate = req.body.rate ?? req.body.interestRate ?? null;
    const emi = req.body.emi ?? null;
    const emi_day = req.body.emi_day ?? null;
    const prepay_allowed = req.body.prepay_allowed ?? null;
    const notes = req.body.notes ?? null;

    // Build dynamic query for loan creation
    const fields = ['user_id'];
    const values = [req.user.id];

    // Add profile_id if provided, otherwise use a default or get the latest profile
    const profileId = req.body.profile_id || req.body.profileId;
    if (profileId) {
      fields.push('profile_id');
      values.push(profileId);
    } else {
      // Get the latest profile for this user
      const profileResult = await pool.query(
        'SELECT id FROM financial_profile WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [req.user.id]
      );
      if (profileResult.rows.length > 0) {
        fields.push('profile_id');
        values.push(profileResult.rows[0].id);
      }
    }

    if (lender !== null && lender !== undefined) { fields.push('lender'); values.push(lender); }
    if (type !== null && type !== undefined) { fields.push('type'); values.push(type); }
    if (start_date !== null && start_date !== undefined) { fields.push('start_date'); values.push(start_date); }
    if (end_date !== null && end_date !== undefined) { fields.push('end_date'); values.push(end_date); }
    if (principal_outstanding !== null && principal_outstanding !== undefined) { fields.push('principal_outstanding'); values.push(principal_outstanding); }
    if (rate !== null && rate !== undefined) { fields.push('rate'); values.push(rate); }
    if (emi !== null && emi !== undefined) { fields.push('emi'); values.push(emi); }
    if (emi_day !== null && emi_day !== undefined) { fields.push('emi_day'); values.push(emi_day); }
    if (prepay_allowed !== null && prepay_allowed !== undefined) { fields.push('prepay_allowed'); values.push(prepay_allowed); }
    if (notes !== null && notes !== undefined) { fields.push('notes'); values.push(notes); }

    const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
    const query = `INSERT INTO financial_loan (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    
    const result = await pool.query(query, values);

    res.status(201).json({
      message: 'Loan created successfully',
      loan: result.rows[0]
    });
  } catch (error) {
    console.error('Loan creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/loan/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'SELECT * FROM financial_loan WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    // Map database fields to frontend field names
    const mappedLoans = result.rows.map(loan => {
      console.log('🔍 Raw loan from DB:', { id: loan.id, end_date: loan.end_date, end_date_type: typeof loan.end_date });
      
      let loanExpiry;
      try {
        if (loan.end_date) {
          // Handle both string and Date object cases
          if (typeof loan.end_date === 'string') {
            loanExpiry = parseInt(loan.end_date.split('-')[0]);
          } else {
            // It's a Date object, get the year directly
            loanExpiry = loan.end_date.getFullYear();
          }
        } else {
          loanExpiry = new Date().getFullYear() + 35;
        }
      } catch (error) {
        console.error('❌ Error parsing end_date:', error, 'for loan:', loan.id);
        loanExpiry = new Date().getFullYear() + 35;
      }
      
      console.log('🔍 Calculated loanExpiry:', loanExpiry);
      
      return {
        id: loan.id,
        provider: loan.lender, // Map lender to provider
        amount: loan.principal_outstanding, // Map principal_outstanding to amount
        interestRate: loan.rate ? parseFloat(loan.rate).toFixed(2) : 0, // Keep as number
        emi: loan.emi,
        frequency: 'Monthly', // Default frequency
        loanExpiry: loanExpiry, // Map end_date to loan expiry year
        user_id: loan.user_id,
        created_at: loan.created_at,
        updated_at: loan.updated_at
      };
    });

    res.json({ loans: mappedLoans });
  } catch (error) {
    console.error('Loans fetch error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.put('/loan/:loanId', [
  body('lender').optional().trim().isLength({ min: 1 }),
  body('type').optional().trim().isLength({ min: 1 }),
  body('start_date').optional().isISO8601(),
  body('end_date').optional().isISO8601(),
  body('principal_outstanding').optional().isFloat({ min: 0 }),
  body('rate').optional().isFloat({ min: 0, max: 100 }),
  body('emi').optional().isFloat({ min: 0 }),
  body('emi_day').optional().isInt({ min: 1, max: 31 }),
  body('prepay_allowed').optional().isBoolean(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { loanId } = req.params;
    const updates = [];
    const values = [];
    let paramCount = 1;

    // Check ownership
    const loanCheck = await pool.query(
      'SELECT user_id FROM financial_loan WHERE id = $1',
      [loanId]
    );

    if (loanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (loanCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build dynamic update query with field mapping
    const usedColumns = new Set();
    Object.entries(req.body).forEach(([key, value]) => {
      if (value !== undefined) {
        // Map frontend field names to database column names for loans
        let dbColumn = key;
        let value = req.body[key];
        
        if (key === 'provider') dbColumn = 'lender';
        if (key === 'amount') dbColumn = 'principal_outstanding';
        if (key === 'interestRate') {
          dbColumn = 'rate';
        }
        if (key === 'endAge') dbColumn = 'end_date';
        
        // Only add if we haven't already used this column
        if (!usedColumns.has(dbColumn)) {
          updates.push(`${dbColumn} = $${paramCount}`);
          values.push(value);
          usedColumns.add(dbColumn);
          paramCount++;
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(loanId);
    const query = `UPDATE financial_loan SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);

    res.json({
      message: 'Loan updated successfully',
      loan: result.rows[0]
    });
  } catch (error) {
    console.error('Loan update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/loan/:loanId', async (req, res) => {
  try {
    const { loanId } = req.params;
    console.log('🗑️ Loan deletion request for ID:', loanId, 'by user:', req.user.id);

    // Check ownership
    const loanCheck = await pool.query(
      'SELECT user_id FROM financial_loan WHERE id = $1',
      [loanId]
    );

    if (loanCheck.rows.length === 0) {
      console.log('❌ Loan not found with ID:', loanId);
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (loanCheck.rows[0].user_id !== req.user.id) {
      console.log('❌ Access denied for loan ID:', loanId);
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log('✅ Proceeding with deletion of loan ID:', loanId);
    const result = await pool.query('DELETE FROM financial_loan WHERE id = $1 RETURNING id', [loanId]);
    console.log('✅ Loan deleted successfully:', result.rows[0]);

    res.json({ message: 'Loan deleted successfully' });
  } catch (error) {
    console.error('❌ Loan deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Plural aliases for Life Sheet frontend compatibility
router.post('/goals', (req, res, next) => {
  req.url = '/goal';
  router.handle(req, res, next);
});

router.get('/goals/:userId', (req, res, next) => {
  req.url = `/goal/${req.params.userId}`;
  router.handle(req, res, next);
});

router.put('/goals/:goalId', (req, res, next) => {
  req.url = `/goal/${req.params.goalId}`;
  router.handle(req, res, next);
});

router.delete('/goals/:goalId', (req, res, next) => {
  req.url = `/goal/${req.params.goalId}`;
  router.handle(req, res, next);
});

router.post('/expenses', (req, res, next) => {
  req.url = '/expense';
  router.handle(req, res, next);
});

router.get('/expenses/:userId', (req, res, next) => {
  req.url = `/expense/${req.params.userId}`;
  router.handle(req, res, next);
});

router.put('/expenses/:expenseId', (req, res, next) => {
  req.url = `/expense/${req.params.expenseId}`;
  router.handle(req, res, next);
});

router.delete('/expenses/:expenseId', (req, res, next) => {
  req.url = `/expense/${req.params.expenseId}`;
  router.handle(req, res, next);
});

router.post('/loans', (req, res, next) => {
  req.url = '/loan';
  router.handle(req, res, next);
});

router.get('/loans/:userId', (req, res, next) => {
  req.url = `/loan/${req.params.userId}`;
  router.handle(req, res, next);
});

router.put('/loans/:loanId', (req, res, next) => {
  req.url = `/loan/${req.params.loanId}`;
  router.handle(req, res, next);
});

router.delete('/loans/:loanId', async (req, res) => {
  // Forward to the singular route handler
  req.url = `/loan/${req.params.loanId}`;
  req.params = { loanId: req.params.loanId };
  
  // Call the loan delete handler directly
  try {
    const { loanId } = req.params;
    console.log('🗑️ Loan deletion request (plural route) for ID:', loanId, 'by user:', req.user.id);

    // Check ownership
    const loanCheck = await pool.query(
      'SELECT user_id FROM financial_loan WHERE id = $1',
      [loanId]
    );

    if (loanCheck.rows.length === 0) {
      console.log('❌ Loan not found with ID:', loanId);
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (loanCheck.rows[0].user_id !== req.user.id) {
      console.log('❌ Access denied for loan ID:', loanId);
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log('✅ Proceeding with deletion of loan ID:', loanId);
    const result = await pool.query('DELETE FROM financial_loan WHERE id = $1 RETURNING id', [loanId]);
    console.log('✅ Loan deleted successfully:', result.rows[0]);

    res.json({ message: 'Loan deleted successfully' });
  } catch (error) {
    console.error('❌ Loan deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== ASSET ROUTES ====================

// Create asset
router.post('/asset', [
  body('name').notEmpty().trim().isLength({ min: 1, max: 255 }),
  body('tag').notEmpty().trim().isLength({ min: 1, max: 100 }),
  body('current_value').optional().isFloat({ min: 0 }),
  body('custom_data').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { name, tag, current_value, custom_data } = req.body;

    // Validate tag - check if it exists in user's tags
    const userTags = await pool.query(
      'SELECT tag_name FROM user_tags WHERE user_id = $1',
      [req.user.id]
    );
    const validTags = userTags.rows.map(row => row.tag_name);
    
    if (!validTags.includes(tag)) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: [{ 
          type: 'field', 
          value: tag, 
          msg: 'Invalid tag. Must be one of: ' + validTags.join(', '), 
          path: 'tag', 
          location: 'body' 
        }] 
      });
    }

    // Get profile_id if provided, otherwise get the latest profile
    const profileId = req.body.profile_id || req.body.profileId;
    let finalProfileId = profileId;
    
    if (!finalProfileId) {
      const profileResult = await pool.query(
        'SELECT id FROM financial_profile WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [req.user.id]
      );
      if (profileResult.rows.length > 0) {
        finalProfileId = profileResult.rows[0].id;
      } else {
        return res.status(400).json({ error: 'No financial profile found. Please create a profile first.' });
      }
    }

    const result = await pool.query(
      'INSERT INTO assets (user_id, profile_id, name, tag, current_value, custom_data) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.id, finalProfileId, name, tag, current_value || 0, custom_data || {}]
    );

    res.status(201).json({
      message: 'Asset created successfully',
      asset: result.rows[0]
    });
  } catch (error) {
    console.error('Asset creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all assets for user
router.get('/asset/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'SELECT * FROM assets WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({ assets: result.rows });
  } catch (error) {
    console.error('Assets fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update asset
router.put('/asset/:assetId', [
  body('name').optional().trim().isLength({ min: 1, max: 255 }),
  body('tag').optional().trim().isLength({ min: 1, max: 100 }),
  body('current_value').optional().isFloat({ min: 0 }),
  body('custom_data').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { assetId } = req.params;
    const { name, tag, current_value, custom_data } = req.body;
    
    console.log('🔍 Asset update request:', { assetId, name, tag, current_value, custom_data });
    console.log('🔍 Custom_data type:', typeof custom_data);
    console.log('🔍 Custom_data stringified:', JSON.stringify(custom_data));
    console.log('🔍 Custom_data parsed:', custom_data);

    // Validate tag if provided - check if it exists in user's tags
    if (tag) {
      const userTags = await pool.query(
        'SELECT tag_name FROM user_tags WHERE user_id = $1',
        [req.user.id]
      );
      const validTags = userTags.rows.map(row => row.tag_name);
      
      if (!validTags.includes(tag)) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: [{ 
            type: 'field', 
            value: tag, 
            msg: 'Invalid tag. Must be one of: ' + validTags.join(', '), 
            path: 'tag', 
            location: 'body' 
          }] 
        });
      }
    }

    // Check ownership
    const ownershipResult = await pool.query(
      'SELECT user_id FROM assets WHERE id = $1',
      [assetId]
    );

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (ownershipResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    if (tag !== undefined) {
      updates.push(`tag = $${paramCount}`);
      values.push(tag);
      paramCount++;
    }
    if (current_value !== undefined) {
      updates.push(`current_value = $${paramCount}`);
      values.push(current_value);
      paramCount++;
    }
    if (custom_data !== undefined) {
      updates.push(`custom_data = $${paramCount}`);
      values.push(custom_data);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(assetId);

    const query = `UPDATE assets SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    console.log('🔍 Asset update query:', query);
    console.log('🔍 Asset update values:', values);
    
    const result = await pool.query(query, values);

    res.json({
      message: 'Asset updated successfully',
      asset: result.rows[0]
    });
  } catch (error) {
    console.error('Asset update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete asset
router.delete('/asset/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;

    // Check ownership
    const ownershipResult = await pool.query(
      'SELECT user_id FROM assets WHERE id = $1',
      [assetId]
    );

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (ownershipResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query('DELETE FROM assets WHERE id = $1 RETURNING id', [assetId]);

    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Asset deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== USER TAGS ROUTES ====================

// Get user's custom tags
router.get('/user-tags/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('🔍 Fetching tags for user:', userId, 'authenticated user:', req.user.id);
    
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log('🔍 Querying user_tags table...');
    const result = await pool.query(
      'SELECT * FROM user_tags WHERE user_id = $1 ORDER BY tag_order, created_at',
      [userId]
    );

    console.log('🔍 Tags query result:', result.rows);
    
    // If no tags exist, create default tags for the user
    if (result.rows.length === 0) {
      console.log('🔍 No tags found, creating default tags for user:', userId);
      
      const defaultTags = [
        { name: 'Investment', order: 0 },
        { name: 'Personal', order: 1 },
        { name: 'Emergency', order: 2 },
        { name: 'Retirement', order: 3 }
      ];
      
      // Insert default tags
      for (const tag of defaultTags) {
        await pool.query(
          'INSERT INTO user_tags (user_id, tag_name, tag_order) VALUES ($1, $2, $3)',
          [userId, tag.name, tag.order]
        );
      }
      
      console.log('✅ Default tags created for user:', userId);
      
      // Fetch the newly created tags
      const newResult = await pool.query(
        'SELECT * FROM user_tags WHERE user_id = $1 ORDER BY tag_order, created_at',
        [userId]
      );
      
      res.json({ tags: newResult.rows });
    } else {
      res.json({ tags: result.rows });
    }
  } catch (error) {
    console.error('❌ User tags fetch error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Add new tag for user
router.post('/user-tag', [
  body('tag_name').notEmpty().trim().isLength({ min: 1, max: 100 }),
  body('tag_order').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { tag_name, tag_order = 0 } = req.body;
    const userId = req.user.id;

    console.log('🔍 Adding tag for user:', userId, 'tag:', tag_name);

    // Check if tag already exists for this user
    const existingTag = await pool.query(
      'SELECT id FROM user_tags WHERE user_id = $1 AND tag_name = $2',
      [userId, tag_name]
    );

    if (existingTag.rows.length > 0) {
      return res.status(400).json({ error: 'Tag already exists' });
    }

    const result = await pool.query(
      'INSERT INTO user_tags (user_id, tag_name, tag_order) VALUES ($1, $2, $3) RETURNING *',
      [userId, tag_name, tag_order]
    );

    console.log('✅ Tag added successfully:', result.rows[0]);
    res.json({ tag: result.rows[0] });
  } catch (error) {
    console.error('❌ User tag creation error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Delete tag for user
router.delete('/user-tag/:tagId', async (req, res) => {
  try {
    const { tagId } = req.params;
    const userId = req.user.id;

    console.log('🔍 Deleting tag:', tagId, 'for user:', userId);

    // Check ownership
    const tagCheck = await pool.query(
      'SELECT id FROM user_tags WHERE id = $1 AND user_id = $2',
      [tagId, userId]
    );

    if (tagCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Check if this is the last tag (prevent deleting all tags)
    const tagCount = await pool.query(
      'SELECT COUNT(*) FROM user_tags WHERE user_id = $1',
      [userId]
    );

    if (tagCount.rows[0].count <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last tag' });
    }

    const result = await pool.query(
      'DELETE FROM user_tags WHERE id = $1 AND user_id = $2 RETURNING id',
      [tagId, userId]
    );

    console.log('✅ Tag deleted successfully:', result.rows[0]);
    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('❌ User tag deletion error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// ==================== DEBUG ROUTES ====================

// Check database schema (for debugging)
router.get('/debug/schema', async (req, res) => {
  try {
    console.log('🔍 Checking production database schema...');
    
    // Check if custom_data column exists in assets table
    const assetsColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'assets' AND column_name = 'custom_data'
    `);
    
    // Check if custom_data column exists in financial_goal table
    const goalsColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'financial_goal' AND column_name = 'custom_data'
    `);
    
    // Check actual data in the tables
    const assetsData = await pool.query(`
      SELECT id, name, custom_data 
      FROM assets 
      WHERE custom_data IS NOT NULL 
      AND custom_data != '{}'::jsonb
      LIMIT 5
    `);
    
    const goalsData = await pool.query(`
      SELECT id, name, custom_data 
      FROM financial_goal 
      WHERE custom_data IS NOT NULL 
      AND custom_data != '{}'::jsonb
      LIMIT 5
    `);
    
    res.json({
      assets_custom_data_column: assetsColumns.rows,
      goals_custom_data_column: goalsColumns.rows,
      assets_with_custom_data: assetsData.rows,
      goals_with_custom_data: goalsData.rows
    });
  } catch (error) {
    console.error('❌ Schema check failed:', error);
    res.status(500).json({ error: 'Schema check failed', details: error.message });
  }
});

// ==================== ASSET COLUMN ROUTES ====================

// Get user's custom columns
router.get('/asset-columns/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('🔍 Fetching columns for user:', userId, 'authenticated user:', req.user.id);
    
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log('🔍 Querying user_asset_columns table...');
    const result = await pool.query(
      'SELECT * FROM user_asset_columns WHERE user_id = $1 ORDER BY column_order, created_at',
      [userId]
    );

    console.log('🔍 Columns query result:', result.rows);
    
    // If no columns exist, create default columns for the user
    if (result.rows.length === 0) {
      console.log('🔍 No columns found, creating default columns for user:', userId);
      
      const defaultColumns = CORE_COLUMN_DEFINITIONS;
      
      // Insert default columns
      for (const column of defaultColumns) {
        await pool.query(
          'INSERT INTO user_asset_columns (user_id, column_key, column_label, column_type, column_order) VALUES ($1, $2, $3, $4, $5)',
          [userId, column.key, column.label, column.type, column.order]
        );
      }
      
      console.log('✅ Default columns created for user:', userId);
      
      // Fetch the newly created columns
      const newResult = await pool.query(
        'SELECT * FROM user_asset_columns WHERE user_id = $1 ORDER BY column_order, created_at',
        [userId]
      );
      
      res.json({ columns: newResult.rows });
    } else {
      res.json({ columns: result.rows });
    }
  } catch (error) {
    console.error('❌ Asset columns fetch error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Create custom column
router.post('/asset-column', [
  body('column_key').notEmpty().trim().isLength({ min: 1, max: 100 }),
  body('column_label').notEmpty().trim().isLength({ min: 1, max: 255 }),
  body('column_type').optional().isIn(['text', 'number', 'currency', 'date', 'email', 'url']),
  body('column_order').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { column_key, column_label, column_type = 'text', column_order = 0 } = req.body;

    const result = await pool.query(
      'INSERT INTO user_asset_columns (user_id, column_key, column_label, column_type, column_order) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, column_key, column_label, column_type, column_order]
    );

    res.status(201).json({
      message: 'Column created successfully',
      column: result.rows[0]
    });
  } catch (error) {
    console.error('Asset column creation error:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'Column with this key already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update custom column
router.put('/asset-column/:columnId', [
  body('column_order').optional().isInt({ min: 0 }),
  body('column_label').optional().trim().isLength({ min: 1, max: 255 }),
  body('column_type').optional().isIn(['text', 'number', 'currency', 'date', 'email', 'url'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { columnId } = req.params;
    const { column_order, column_label, column_type } = req.body;

    // Check ownership
    const ownershipResult = await pool.query(
      'SELECT user_id FROM user_asset_columns WHERE id = $1',
      [columnId]
    );

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Column not found' });
    }

    if (ownershipResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (column_order !== undefined) {
      updateFields.push(`column_order = $${paramCount}`);
      updateValues.push(column_order);
      paramCount++;
    }

    if (column_label !== undefined) {
      updateFields.push(`column_label = $${paramCount}`);
      updateValues.push(column_label);
      paramCount++;
    }

    if (column_type !== undefined) {
      updateFields.push(`column_type = $${paramCount}`);
      updateValues.push(column_type);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(columnId);
    const query = `UPDATE user_asset_columns SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, updateValues);

    res.json({
      message: 'Column updated successfully',
      column: result.rows[0]
    });
  } catch (error) {
    console.error('Asset column update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete custom column
router.delete('/asset-column/:columnId', async (req, res) => {
  try {
    const { columnId } = req.params;

    // Check ownership
    const ownershipResult = await pool.query(
      'SELECT user_id FROM user_asset_columns WHERE id = $1',
      [columnId]
    );

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Column not found' });
    }

    if (ownershipResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query('DELETE FROM user_asset_columns WHERE id = $1', [columnId]);

    res.json({ message: 'Column deleted successfully' });
  } catch (error) {
    console.error('Asset column deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Plural aliases for frontend compatibility
router.post('/assets', (req, res, next) => {
  req.url = '/asset';
  router.handle(req, res, next);
});

router.get('/assets/:userId', (req, res, next) => {
  req.url = `/asset/${req.params.userId}`;
  router.handle(req, res, next);
});

router.put('/assets/:assetId', (req, res, next) => {
  req.url = `/asset/${req.params.assetId}`;
  router.handle(req, res, next);
});

router.delete('/assets/:assetId', (req, res, next) => {
  req.url = `/asset/${req.params.assetId}`;
  router.handle(req, res, next);
});

// Column aliases for frontend compatibility
router.post('/asset-columns', (req, res, next) => {
  req.url = '/asset-column';
  router.handle(req, res, next);
});

router.put('/asset-columns/:columnId', (req, res, next) => {
  req.url = `/asset-column/${req.params.columnId}`;
  router.handle(req, res, next);
});

router.delete('/asset-columns/:columnId', (req, res, next) => {
  req.url = `/asset-column/${req.params.columnId}`;
  router.handle(req, res, next);
});

// ==================== WORK ASSETS ROUTES ====================

// Create work asset
router.post('/work-asset', async (req, res) => {
  try {
    const { stream, amount, growthRate, endAge } = req.body;
    
    // Get user's profile_id
    const profileResult = await pool.query(
      'SELECT id FROM financial_profile WHERE user_id = $1',
      [req.user.id]
    );
    
    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Financial profile not found' });
    }
    
    const profileId = profileResult.rows[0].id;
    
    const result = await pool.query(
      'INSERT INTO work_assets (user_id, profile_id, stream, amount, growth_rate, end_age) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.id, profileId, stream, amount, growthRate || 0.03, endAge]
    );
    
    // Map database fields to frontend field names
    const mappedAsset = {
      id: result.rows[0].id,
      stream: result.rows[0].stream,
      amount: result.rows[0].amount,
      growthRate: result.rows[0].growth_rate,
      endAge: result.rows[0].end_age,
      user_id: result.rows[0].user_id,
      profile_id: result.rows[0].profile_id,
      created_at: result.rows[0].created_at,
      updated_at: result.rows[0].updated_at
    };
    
    res.status(201).json(mappedAsset);
  } catch (error) {
    console.error('Work asset creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get work assets for user
router.get('/work-assets/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await pool.query(
      'SELECT * FROM work_assets WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    // Map database fields to frontend field names
    const mappedAssets = result.rows.map(asset => ({
      id: asset.id,
      stream: asset.stream,
      amount: asset.amount,
      growthRate: asset.growth_rate, // Map growth_rate to growthRate
      endAge: asset.end_age, // Map end_age to endAge
      user_id: asset.user_id,
      profile_id: asset.profile_id,
      created_at: asset.created_at,
      updated_at: asset.updated_at
    }));
    
    res.json(mappedAssets);
  } catch (error) {
    console.error('Work assets fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update work asset
router.put('/work-asset/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    const { stream, amount, growthRate, endAge } = req.body;
    
    // Check ownership
    const ownershipResult = await pool.query(
      'SELECT user_id FROM work_assets WHERE id = $1',
      [assetId]
    );
    
    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Work asset not found' });
    }
    
    if (ownershipResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (stream !== undefined) {
      updates.push(`stream = $${paramCount}`);
      values.push(stream);
      paramCount++;
    }
    if (amount !== undefined) {
      updates.push(`amount = $${paramCount}`);
      values.push(amount);
      paramCount++;
    }
    if (growthRate !== undefined) {
      updates.push(`growth_rate = $${paramCount}`);
      values.push(growthRate);
      paramCount++;
    }
    if (endAge !== undefined) {
      updates.push(`end_age = $${paramCount}`);
      values.push(endAge);
      paramCount++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(assetId);
    
    const query = `UPDATE work_assets SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    
    // Map database fields to frontend field names
    const mappedAsset = {
      id: result.rows[0].id,
      stream: result.rows[0].stream,
      amount: result.rows[0].amount,
      growthRate: result.rows[0].growth_rate,
      endAge: result.rows[0].end_age,
      user_id: result.rows[0].user_id,
      profile_id: result.rows[0].profile_id,
      created_at: result.rows[0].created_at,
      updated_at: result.rows[0].updated_at
    };
    
    res.json(mappedAsset);
  } catch (error) {
    console.error('Work asset update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete work asset
router.delete('/work-asset/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    
    // Check ownership
    const ownershipResult = await pool.query(
      'SELECT user_id FROM work_assets WHERE id = $1',
      [assetId]
    );
    
    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Work asset not found' });
    }
    
    if (ownershipResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await pool.query('DELETE FROM work_assets WHERE id = $1', [assetId]);
    
    res.json({ message: 'Work asset deleted successfully' });
  } catch (error) {
    console.error('Work asset deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Insurance routes (singular)
router.post('/insurance', [
  body('policy_type').optional().trim().isLength({ min: 1 }),
  body('cover').optional().isFloat({ min: 0 }),
  body('premium').optional().isFloat({ min: 0 }),
  body('frequency').optional().isIn(['Monthly', 'Quarterly', 'Yearly']),
  body('provider').optional().trim(),
  body('policy_number').optional().trim(),
  body('start_date').optional().isISO8601(),
  body('end_date').optional().isISO8601(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const {
      policy_type,
      cover,
      premium,
      frequency = 'Yearly',
      provider,
      policy_number,
      start_date,
      end_date,
      notes
    } = req.body;

    // Get or create a default profile for the user
    let profileId;
    const profileResult = await pool.query(
      'SELECT id FROM financial_profile WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      // Create a default profile
      const newProfile = await pool.query(
        'INSERT INTO financial_profile (user_id, total_asset_gross_market_value, total_loan_outstanding_value, lifespan_years, income_growth_rate, asset_growth_rate) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [req.user.id, 0, 0, 85, 0.06, 0.06]
      );
      profileId = newProfile.rows[0].id;
    } else {
      profileId = profileResult.rows[0].id;
    }

    const result = await pool.query(
      'INSERT INTO financial_insurance (user_id, profile_id, policy_type, cover, premium, frequency, provider, policy_number, start_date, end_date, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [req.user.id, profileId, policy_type, cover, premium, frequency, provider, policy_number, start_date, end_date, notes]
    );

    res.status(201).json({ insurance: result.rows[0] });
  } catch (error) {
    console.error('Insurance creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/insurance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'SELECT * FROM financial_insurance WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({ insurance: result.rows });
  } catch (error) {
    console.error('Insurance fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/insurance/:insuranceId', [
  body('policy_type').optional().trim().isLength({ min: 1 }),
  body('cover').optional().isFloat({ min: 0 }),
  body('premium').optional().isFloat({ min: 0 }),
  body('frequency').optional().isIn(['Monthly', 'Quarterly', 'Yearly']),
  body('provider').optional().trim(),
  body('policy_number').optional().trim(),
  body('start_date').optional().isISO8601(),
  body('end_date').optional().isISO8601(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const { insuranceId } = req.params;

    // Check ownership
    const insuranceCheck = await pool.query(
      'SELECT user_id FROM financial_insurance WHERE id = $1',
      [insuranceId]
    );

    if (insuranceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Insurance not found' });
    }

    if (insuranceCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.entries(req.body).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const query = `UPDATE financial_insurance SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    values.push(insuranceId);

    const result = await pool.query(query, values);
    res.json({ insurance: result.rows[0] });
  } catch (error) {
    console.error('Insurance update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/insurance/:insuranceId', async (req, res) => {
  try {
    const { insuranceId } = req.params;

    // Check ownership
    const insuranceCheck = await pool.query(
      'SELECT user_id FROM financial_insurance WHERE id = $1',
      [insuranceId]
    );

    if (insuranceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Insurance not found' });
    }

    if (insuranceCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query('DELETE FROM financial_insurance WHERE id = $1', [insuranceId]);
    res.json({ message: 'Insurance deleted successfully' });
  } catch (error) {
    console.error('Insurance deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Insurance routes (plural - for compatibility)
router.post('/insurances', (req, res, next) => {
  req.url = '/insurance';
  router.handle(req, res, next);
});

router.get('/insurances/:userId', (req, res, next) => {
  req.url = `/insurance/${req.params.userId}`;
  router.handle(req, res, next);
});

router.put('/insurances/:insuranceId', (req, res, next) => {
  req.url = `/insurance/${req.params.insuranceId}`;
  router.handle(req, res, next);
});

router.delete('/insurances/:insuranceId', (req, res, next) => {
  req.url = `/insurance/${req.params.insuranceId}`;
  router.handle(req, res, next);
});

export default router;