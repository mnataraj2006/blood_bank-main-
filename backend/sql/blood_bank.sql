
-- blood_bank.sql
CREATE DATABASE IF NOT EXISTS blood_bank;
USE blood_bank;

-- Users table storing both donors & recipients (role column differentiates)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('donor','recipient') NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  gender ENUM('male','female','other') DEFAULT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  phone_number VARCHAR(20) DEFAULT NULL,
  password VARCHAR(255) NOT NULL,
  street VARCHAR(120) DEFAULT NULL,
  city VARCHAR(80) DEFAULT NULL,
  state VARCHAR(80) DEFAULT NULL,
  pincode VARCHAR(12) DEFAULT NULL,
  -- donor-specific
  blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') DEFAULT NULL,
  willing_to_donate_plasma TINYINT(1) DEFAULT NULL,
  last_donation_date DATE DEFAULT NULL,
  weight INT DEFAULT NULL,
  health_conditions TEXT DEFAULT NULL,
  -- recipient-specific
  required_blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') DEFAULT NULL,
  purpose VARCHAR(200) DEFAULT NULL,
  hospital_name VARCHAR(200) DEFAULT NULL,
  prescription VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to track blood requests
CREATE TABLE IF NOT EXISTS blood_request (
  request_id INT AUTO_INCREMENT PRIMARY KEY,
  recipient_id INT NOT NULL,
  donor_id INT DEFAULT NULL,
  requested_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  units_needed INT DEFAULT NULL,
  urgency_level VARCHAR(20) DEFAULT 'moderate',
  purpose VARCHAR(200) DEFAULT NULL,
  hospital_name VARCHAR(200) DEFAULT NULL,
  hospital_address VARCHAR(200) DEFAULT NULL,
  contact_person VARCHAR(100) DEFAULT NULL,
  contact_number VARCHAR(20) DEFAULT NULL,
  doctor_name VARCHAR(100) DEFAULT NULL,
  medical_condition TEXT DEFAULT NULL,
  required_date DATE DEFAULT NULL,
  additional_notes TEXT DEFAULT NULL,
  patient_age INT DEFAULT NULL,
  patient_gender ENUM('male','female','other') DEFAULT NULL,
  hemoglobin_level DECIMAL(5,2) DEFAULT NULL,
  patient_name VARCHAR(100) DEFAULT NULL,
  email VARCHAR(120) DEFAULT NULL,
  status ENUM('pending','approved','rejected','completed') DEFAULT 'pending',
  request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_users_role_group ON users(role, blood_group);

-- Add new columns to blood_request table if they don't exist
ALTER TABLE blood_request ADD COLUMN IF NOT EXISTS patient_name VARCHAR(100) DEFAULT NULL;
ALTER TABLE blood_request ADD COLUMN IF NOT EXISTS email VARCHAR(120) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS hospitals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address VARCHAR(300) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(12) NOT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    email VARCHAR(120) DEFAULT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS donations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    recipient_id INT DEFAULT NULL,
    donation_date DATE NOT NULL,
    blood_group VARCHAR(5) NOT NULL,
    units INT DEFAULT 1,
    hospital_name VARCHAR(200) DEFAULT NULL,
    hospital_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL
);

-- Insert sample hospitals
INSERT INTO hospitals (name, address, city, state, pincode, phone, email, verified) VALUES
('City General Hospital', '123 Main Street, Downtown', 'Mumbai', 'Maharashtra', '400001', '+91-22-12345678', 'info@citygeneral.com', TRUE),
('Apollo Blood Bank Center', '456 Health Avenue, Medical District', 'Delhi', 'Delhi', '110001', '+91-11-23456789', 'contact@apollobloodbank.com', TRUE),
('Max Healthcare Hospital', '789 Wellness Boulevard, Sector 15', 'Chennai', 'Tamil Nadu', '600001', '+91-44-34567890', 'info@maxhealthcare.com', TRUE),
('Fortis Hospital', '321 Care Street, Phase 2', 'Bangalore', 'Karnataka', '560001', '+91-80-45678901', 'contact@fortishospital.com', TRUE),
('AIIMS Blood Center', '654 Medical Road, Institutional Area', 'Pune', 'Maharashtra', '411001', '+91-20-56789012', 'bloodbank@aiims.com', TRUE),
('Medanta Hospital', '987 Healing Lane, Sector 38', 'Gurgaon', 'Haryana', '122001', '+91-124-67890123', 'info@medanta.com', TRUE),
('Kokilaben Dhirubhai Ambani Hospital', '147 Care Plaza, Andheri West', 'Mumbai', 'Maharashtra', '400053', '+91-22-78901234', 'contact@kokilabenhospital.com', TRUE),
('Tata Memorial Hospital', '258 Oncology Road, Parel', 'Mumbai', 'Maharashtra', '400012', '+91-22-89012345', 'bloodbank@tatamemorial.com', TRUE);
