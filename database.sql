
CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_code TEXT,
  code_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
