// Core columns that are always visible and non-deletable for all users
export const CORE_COLUMNS = [
  'sipAmount',
  'sipFrequency', 
  'sipExpiryDate',
  'expectedReturn',
  'notes',
  'goalEarmarks'
];

// Core column definitions for new users
export const CORE_COLUMN_DEFINITIONS = [
  { key: 'sipAmount', label: 'SIP Amount', type: 'currency', order: 0 },
  { key: 'sipFrequency', label: 'SIP Frequency', type: 'text', order: 1 },
  { key: 'sipExpiryDate', label: 'SIP Expiry Date', type: 'date', order: 2 },
  { key: 'expectedReturn', label: 'Expected Return %', type: 'number', order: 3 },
  { key: 'notes', label: 'Notes', type: 'text', order: 4 },
  { key: 'goalEarmarks', label: 'Goal Earmarks', type: 'text', order: 5 }
];
