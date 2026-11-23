INSERT INTO categories (id,name) VALUES (1,'Desk accessories'),(2,'Peripherals'),(3,'Lighting');
INSERT INTO products (id,vendor_id,category_id,name,image,pack_size,price,stock,low_threshold) VALUES
(1,3,2,'Studio Mechanical Keyboard','keyboard',4,8900,24,5),
(2,4,3,'Arc Task Lamp','lamp',2,4600,18,4),
(3,3,1,'Leather Desk Mat','mat',6,3900,32,5),
(4,4,1,'Lift Laptop Stand','stand',4,5200,4,5),
(5,3,2,'Glide Wireless Mouse','mouse',6,4200,21,6),
(6,4,1,'Oak Catchall Tray','tray',8,3600,12,4);
INSERT INTO reviews(product_id,buyer_id,stars) VALUES (1,1,5),(1,2,5),(2,1,5),(2,2,4),(3,1,5),(3,2,4),(4,1,4),(5,2,5),(6,2,4);
INSERT INTO orders(id,buyer_id,request_key,created_at) VALUES
(1001,1,'00000000000000000000000000001001',NOW()-INTERVAL 6 DAY),
(1002,2,'00000000000000000000000000001002',NOW()-INTERVAL 2 DAY),
(1003,1,'00000000000000000000000000001003',NOW()-INTERVAL 1 DAY);
INSERT INTO vendor_orders(id,order_id,vendor_id,status,fulfilled_at) VALUES
(1,1001,3,'fulfilled',NOW()-INTERVAL 5 DAY),(2,1001,4,'fulfilled',NOW()-INTERVAL 4 DAY),
(3,1002,3,'fulfilled',NOW()-INTERVAL 1 DAY),(4,1003,4,'received',NULL),(5,1003,3,'processing',NULL);
INSERT INTO order_lines(vendor_order_id,product_id,title,pack_size,unit_price,quantity) VALUES
(1,1,'Studio Mechanical Keyboard',4,8900,2),(2,2,'Arc Task Lamp',2,4600,3),
(3,5,'Glide Wireless Mouse',6,4200,4),(4,4,'Lift Laptop Stand',4,5200,1),(5,3,'Leather Desk Mat',6,3900,2);
