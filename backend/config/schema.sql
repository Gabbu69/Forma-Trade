CREATE TABLE IF NOT EXISTS demo_updates (name VARCHAR(64) PRIMARY KEY) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS users (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 email VARCHAR(160) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL,
 session_version INT UNSIGNED NOT NULL DEFAULT 1,
 name VARCHAR(100) NOT NULL, role ENUM('buyer','vendor') NOT NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS categories (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(80) NOT NULL UNIQUE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS products (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, vendor_id INT UNSIGNED NOT NULL, category_id INT UNSIGNED NOT NULL,
 name VARCHAR(100) NOT NULL, image VARCHAR(32) NOT NULL, pack_size SMALLINT UNSIGNED NOT NULL,
 price DECIMAL(12,2) UNSIGNED NOT NULL, stock INT UNSIGNED NOT NULL, low_threshold INT UNSIGNED NOT NULL,
 version INT UNSIGNED NOT NULL DEFAULT 1,
 FOREIGN KEY (vendor_id) REFERENCES users(id), FOREIGN KEY (category_id) REFERENCES categories(id), INDEX(category_id,price)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS retired_products (
 product_id INT UNSIGNED PRIMARY KEY,
 FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS product_photos (
 photo_key CHAR(32) PRIMARY KEY, product_id INT UNSIGNED NOT NULL, position TINYINT UNSIGNED NOT NULL CHECK(position BETWEEN 1 AND 3),
 image_bytes MEDIUMBLOB NOT NULL, UNIQUE(product_id,position),
 FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS reviews (
 product_id INT UNSIGNED NOT NULL, buyer_id INT UNSIGNED NOT NULL, stars TINYINT UNSIGNED NOT NULL CHECK(stars BETWEEN 1 AND 5),
 PRIMARY KEY(product_id,buyer_id), FOREIGN KEY(product_id) REFERENCES products(id), FOREIGN KEY(buyer_id) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS orders (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, buyer_id INT UNSIGNED NOT NULL, request_key CHAR(32) NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(buyer_id,request_key),
 FOREIGN KEY(buyer_id) REFERENCES users(id), INDEX(buyer_id,created_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS vendor_orders (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, order_id INT UNSIGNED NOT NULL, vendor_id INT UNSIGNED NOT NULL,
 status ENUM('received','processing','fulfilled') NOT NULL DEFAULT 'received', fulfilled_at DATETIME NULL,
 UNIQUE(order_id,vendor_id), FOREIGN KEY(order_id) REFERENCES orders(id), FOREIGN KEY(vendor_id) REFERENCES users(id), INDEX(vendor_id,status,fulfilled_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS order_lines (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, vendor_order_id INT UNSIGNED NOT NULL, product_id INT UNSIGNED NOT NULL,
 title VARCHAR(100) NOT NULL, pack_size SMALLINT UNSIGNED NOT NULL, unit_price DECIMAL(12,2) UNSIGNED NOT NULL, quantity INT UNSIGNED NOT NULL CHECK(quantity>0),
 UNIQUE(vendor_order_id,product_id), FOREIGN KEY(vendor_order_id) REFERENCES vendor_orders(id), FOREIGN KEY(product_id) REFERENCES products(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS account_photos (
 user_id INT UNSIGNED PRIMARY KEY, photo_key CHAR(32) NOT NULL UNIQUE,
 image_bytes MEDIUMBLOB NOT NULL,
 FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS account_notifications (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id INT UNSIGNED NOT NULL, vendor_order_id INT UNSIGNED NULL, product_id INT UNSIGNED NULL,
 event_type ENUM('new_order','processing','fulfilled','low_stock') NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, read_at DATETIME NULL,
 UNIQUE(user_id,vendor_order_id,event_type), INDEX(user_id,read_at,id),
 FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (vendor_order_id) REFERENCES vendor_orders(id),
 FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS account_recovery (
 user_id INT UNSIGNED PRIMARY KEY, code_hash CHAR(64) NOT NULL,
 FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS api_rate_windows (
 action VARCHAR(40) NOT NULL, subject VARCHAR(48) NOT NULL,
 window_start BIGINT UNSIGNED NOT NULL, expires_at BIGINT UNSIGNED NOT NULL,
 attempts SMALLINT UNSIGNED NOT NULL,
 PRIMARY KEY (action,subject,window_start), INDEX (expires_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS security_audit (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, request_id CHAR(24) NOT NULL UNIQUE,
 user_id INT UNSIGNED NULL, ip_address VARCHAR(45) NOT NULL,
 action VARCHAR(40) NOT NULL, http_status SMALLINT UNSIGNED NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX (created_at), FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;
