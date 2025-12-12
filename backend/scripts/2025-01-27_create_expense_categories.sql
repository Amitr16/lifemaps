-- Create expense_categories table for global and user-specific category/subcategory definitions
-- user_id = 0 means global categories (applicable to all users)
-- user_id > 0 means user-specific custom categories

CREATE TABLE IF NOT EXISTS expense_categories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL DEFAULT 0,
    category VARCHAR(255) NOT NULL,
    subcategory VARCHAR(255) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, category, subcategory),
    CHECK (user_id >= 0)
);

-- Add foreign key constraint only for user_id > 0 using a trigger
-- Note: user_id = 0 is reserved for global categories and doesn't reference the user table
CREATE OR REPLACE FUNCTION check_expense_category_user_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id > 0 AND NOT EXISTS (SELECT 1 FROM "user" WHERE id = NEW.user_id) THEN
        RAISE EXCEPTION 'User ID % does not exist', NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_expense_category_user_id_trigger
    BEFORE INSERT OR UPDATE ON expense_categories
    FOR EACH ROW
    WHEN (NEW.user_id > 0)
    EXECUTE FUNCTION check_expense_category_user_id();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_expense_categories_user_id ON expense_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_category ON expense_categories(category);
CREATE INDEX IF NOT EXISTS idx_expense_categories_display_order ON expense_categories(display_order);

-- Insert predefined categories and subcategories (user_id = 0 for global)
INSERT INTO expense_categories (user_id, category, subcategory, display_order) VALUES
-- Household
(0, 'Household', 'Rent / Home Loan EMI', 1),
(0, 'Household', 'Utilities (Electricity, Water, Gas)', 2),
(0, 'Household', 'Home Maintenance & Repairs', 3),
(0, 'Household', 'Domestic Help & Services', 4),
(0, 'Household', 'Household Supplies', 5),
(0, 'Household', 'Furnishings & Appliances', 6),

-- Transport
(0, 'Transport', 'Fuel', 7),
(0, 'Transport', 'Public Transportation', 8),
(0, 'Transport', 'Ride-hailing & Taxi', 9),
(0, 'Transport', 'Vehicle Maintenance', 10),
(0, 'Transport', 'Parking & Tolls', 11),
(0, 'Transport', 'Vehicle Loan EMI', 12),

-- Food
(0, 'Food', 'Groceries', 13),
(0, 'Food', 'Dining Out', 14),
(0, 'Food', 'Food Delivery & Takeaway', 15),
(0, 'Food', 'Snacks & Beverages', 16),

-- Education
(0, 'Education', 'School/College Fees', 17),
(0, 'Education', 'Books & Stationery', 18),
(0, 'Education', 'Uniforms & School Supplies', 19),
(0, 'Education', 'Tuition & Coaching Classes', 20),
(0, 'Education', 'Online Courses & Training', 21),
(0, 'Education', 'Education Loan EMI', 22),

-- Health
(0, 'Health', 'Doctor & Clinic Visits', 23),
(0, 'Health', 'Medicines & Pharmacy', 24),
(0, 'Health', 'Hospitalization', 25),
(0, 'Health', 'Lab Tests & Diagnostics', 26),
(0, 'Health', 'Dental & Vision Care', 27),
(0, 'Health', 'Fitness & Wellness', 28),

-- Insurance
(0, 'Insurance', 'Life Insurance Premiums', 29),
(0, 'Insurance', 'Health Insurance Premiums', 30),
(0, 'Insurance', 'Motor Insurance', 31),
(0, 'Insurance', 'Home Insurance', 32),
(0, 'Insurance', 'Travel Insurance', 33),

-- Subscriptions
(0, 'Subscriptions', 'Mobile Phone Plan', 34),
(0, 'Subscriptions', 'Internet & Broadband', 35),
(0, 'Subscriptions', 'Streaming Services', 36),
(0, 'Subscriptions', 'Cable TV / DTH', 37),
(0, 'Subscriptions', 'Newspaper & Magazine', 38),
(0, 'Subscriptions', 'Club & Membership Fees', 39),

-- Entertainment
(0, 'Entertainment', 'Movies & Events', 40),
(0, 'Entertainment', 'Outdoor & Recreation', 41),
(0, 'Entertainment', 'Hobbies & Sports', 42),
(0, 'Entertainment', 'Nightlife & Parties', 43),

-- Shopping
(0, 'Shopping', 'Clothing & Footwear', 44),
(0, 'Shopping', 'Electronics & Gadgets', 45),
(0, 'Shopping', 'Personal Care & Cosmetics', 46),
(0, 'Shopping', 'Home Decor & Furnishings', 47),
(0, 'Shopping', 'Gifts & Celebrations', 48),

-- Kids
(0, 'Kids', 'Baby Care Products', 49),
(0, 'Kids', 'Childcare & Daycare', 50),
(0, 'Kids', 'Toys & Games', 51),
(0, 'Kids', 'Kids'' Clothing & Accessories', 52),
(0, 'Kids', 'Allowance & Pocket Money', 53),

-- Pets
(0, 'Pets', 'Pet Food & Treats', 54),
(0, 'Pets', 'Vet Visits & Medicine', 55),
(0, 'Pets', 'Grooming & Pet Care', 56),
(0, 'Pets', 'Pet Supplies & Accessories', 57),

-- Travel
(0, 'Travel', 'Air / Rail / Bus Fare', 58),
(0, 'Travel', 'Accommodation', 59),
(0, 'Travel', 'Local Transport (Travel)', 60),
(0, 'Travel', 'Food & Shopping (Travel)', 61),
(0, 'Travel', 'Visa & Travel Documents', 62),

-- Investments
(0, 'Investments', 'Mutual Funds (SIP)', 63),
(0, 'Investments', 'Stocks & Equities', 64),
(0, 'Investments', 'Fixed Deposits & Bonds', 65),
(0, 'Investments', 'Retirement Funds (PPF/NPS)', 66),
(0, 'Investments', 'Gold & Precious Metals', 67),
(0, 'Investments', 'Real Estate Investment', 68),
(0, 'Investments', 'Cryptocurrency', 69),

-- Financial Services
(0, 'Financial Services', 'Banking Fees', 70),
(0, 'Financial Services', 'Credit Card Charges', 71),
(0, 'Financial Services', 'Investment Account Fees', 72),
(0, 'Financial Services', 'Financial Advisory & Legal', 73),
(0, 'Financial Services', 'Loan EMI Payments', 74),

-- Miscellaneous
(0, 'Miscellaneous', 'Gifts & Donations', 75),
(0, 'Miscellaneous', 'Emergency / Unexpected', 76),
(0, 'Miscellaneous', 'Other Personal Expenses', 77)
ON CONFLICT (user_id, category, subcategory) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE expense_categories IS 'Expense categories and subcategories. user_id = 0 for global categories, user_id > 0 for user-specific custom categories';
COMMENT ON COLUMN expense_categories.user_id IS '0 = global categories (all users), > 0 = user-specific custom categories';

