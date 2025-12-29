import express from 'express';
import { authenticateAdmin } from '../middleware/adminAuth.js';
import { setAdminUserContext } from '../middleware/adminUserContext.js';
import financialRouter from './financial.js';

const router = express.Router();

// All admin financial routes require userId parameter
// They use the same financial routes but with admin user context
router.use(authenticateAdmin);
router.use(setAdminUserContext);
router.use('/', financialRouter);

export default router;

