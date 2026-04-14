-- =============================================
-- E-Wallet Database Initialization
-- =============================================

CREATE DATABASE IF NOT EXISTS ewallet_db;
USE ewallet_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    balance DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    type ENUM('transfer', 'topup', 'withdraw') NOT NULL,
    status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed data
INSERT INTO users (name, email, phone, balance) VALUES
('Budi Santoso', 'budi@email.com', '081234567890', 500000.00),
('Siti Rahayu', 'siti@email.com', '082345678901', 250000.00),
('Ahmad Fauzi', 'ahmad@email.com', '083456789012', 1000000.00);

INSERT INTO transactions (sender_id, receiver_id, amount, type, status, description) VALUES
(1, 2, 50000.00, 'transfer', 'success', 'Bayar makan siang'),
(3, 1, 100000.00, 'transfer', 'success', 'Bagi hasil'),
(2, 3, 25000.00, 'transfer', 'success', 'Ongkos parkir');
