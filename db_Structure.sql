-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: saas_db:3306
-- Generation Time: May 13, 2026 at 02:18 PM
-- Server version: 8.0.46
-- PHP Version: 8.3.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `AgroEye`
--

-- --------------------------------------------------------

--
-- Table structure for table `AIResults`
--

CREATE TABLE `AIResults` (
  `result_id` int NOT NULL,
  `image_id` varchar(255) NOT NULL,
  `disease_detected` varchar(100) DEFAULT NULL,
  `confidence_score` decimal(5,4) DEFAULT NULL,
  `recommendation` text,
  `analysis_timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ChatbotSessions`
--

CREATE TABLE `ChatbotSessions` (
  `session_id` int NOT NULL,
  `user_id` int NOT NULL,
  `farm_id` int DEFAULT NULL,
  `start_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `end_time` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ChatMessages`
--

CREATE TABLE `ChatMessages` (
  `message_id` int NOT NULL,
  `session_id` int NOT NULL,
  `sender` enum('user','bot') NOT NULL,
  `message_text` text NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Devices`
--

CREATE TABLE `Devices` (
  `device_id` int NOT NULL,
  `field_id` int NOT NULL,
  `device_type` enum('ESP32','ESP32-CAM') NOT NULL,
  `serial_number` varchar(50) NOT NULL,
  `location_coords` varchar(100) DEFAULT NULL,
  `status` enum('active','inactive','maintenance') DEFAULT 'active',
  `last_seen` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Events`
--

CREATE TABLE `Events` (
  `event_id` bigint NOT NULL,
  `device_id` int NOT NULL,
  `field_id` int NOT NULL,
  `event_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'cloud_ai | local_ai',
  `actions` json DEFAULT NULL COMMENT 'AI decision: irrigation, heating, ventilation...',
  `sensor_data` json DEFAULT NULL COMMENT 'sensor snapshot that led to the decision',
  `rationale` text COLLATE utf8mb4_unicode_ci COMMENT 'AI explanation text',
  `confidence` float DEFAULT '0' COMMENT '0-1',
  `quality_score` float DEFAULT '0' COMMENT '0-100',
  `is_executed` tinyint(1) DEFAULT '0',
  `executed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Farms`
--

CREATE TABLE `Farms` (
  `farm_id` int NOT NULL,
  `user_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `location` varchar(255) NOT NULL,
  `area_size` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_Archived` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Fields`
--

CREATE TABLE `Fields` (
  `field_id` int NOT NULL,
  `farm_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `crop_type` varchar(100) DEFAULT NULL,
  `area_size` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Images`
--

CREATE TABLE `Images` (
  `image_id` varchar(255) NOT NULL,
  `device_id` int NOT NULL,
  `field_id` int NOT NULL,
  `image_path` varchar(255) NOT NULL,
  `capture_timestamp` timestamp NOT NULL,
  `file_size` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Notifications`
--

CREATE TABLE `Notifications` (
  `notification_id` int NOT NULL,
  `user_id` int NOT NULL,
  `farm_id` int NOT NULL,
  `type` enum('alert','warning','info') NOT NULL,
  `message` text NOT NULL,
  `trigger_entity` varchar(50) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SensingNodes`
--

CREATE TABLE `SensingNodes` (
  `node_id` int NOT NULL,
  `device_id` int NOT NULL,
  `mac_address` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `firmware_version` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `is_auto_update` tinyint(1) DEFAULT '1',
  `crop_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `status` enum('active','inactive','low_battery','offline') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'active',
  `last_calibration` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `battery_level` decimal(5,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SensorLog`
--

CREATE TABLE `SensorLog` (
  `log_id` bigint NOT NULL,
  `node_id` int NOT NULL,
  `device_id` int NOT NULL,
  `temperature_air` decimal(5,2) DEFAULT NULL,
  `humidity_air` decimal(5,2) DEFAULT NULL,
  `light_intensity` decimal(6,2) DEFAULT NULL,
  `co2` decimal(6,2) DEFAULT NULL,
  `temperature_soil` decimal(5,2) DEFAULT NULL,
  `humidity_soil` decimal(5,2) DEFAULT NULL,
  `soil_moisture` decimal(5,2) DEFAULT NULL,
  `soil_ph` decimal(3,2) DEFAULT NULL,
  `nitrogen` decimal(5,2) DEFAULT NULL,
  `phosphorus` decimal(5,2) DEFAULT NULL,
  `potassium` decimal(5,2) DEFAULT NULL,
  `conductivity` decimal(5,2) DEFAULT NULL,
  `battery_level` decimal(5,2) DEFAULT NULL,
  `signal_strength` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SensorReadings`
--

CREATE TABLE `SensorReadings` (
  `reading_id` bigint NOT NULL,
  `device_id` int NOT NULL,
  `timestamp` timestamp NOT NULL,
  `temperature_soil` decimal(5,2) DEFAULT NULL,
  `humidity_soil` decimal(5,2) DEFAULT NULL,
  `soil_moisture` decimal(5,2) DEFAULT NULL,
  `soil_ph` decimal(3,2) DEFAULT NULL,
  `nitrogen` decimal(5,2) DEFAULT NULL COMMENT 'Nitrogen level (N)',
  `phosphorus` decimal(5,2) DEFAULT NULL COMMENT 'Phosphorus level (P)',
  `potassium` decimal(5,2) DEFAULT NULL COMMENT 'Potassium level (K)',
  `conductivity` decimal(5,2) DEFAULT NULL COMMENT 'Electrical Conductivity (EC)',
  `light_intensity` decimal(6,2) DEFAULT NULL COMMENT 'Light intensity in lux',
  `co2` decimal(6,2) DEFAULT NULL COMMENT 'Carbon dioxide level in ppm',
  `temperature_air` decimal(5,2) DEFAULT NULL COMMENT 'Temperature Air',
  `humidity_air` decimal(5,2) DEFAULT NULL COMMENT 'Humidity Air'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Users`
--

CREATE TABLE `Users` (
  `user_id` int NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('farmer','admin','technician') NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `AIResults`
--
ALTER TABLE `AIResults`
  ADD PRIMARY KEY (`result_id`),
  ADD KEY `idx_airesults_image_id` (`image_id`);

--
-- Indexes for table `ChatbotSessions`
--
ALTER TABLE `ChatbotSessions`
  ADD PRIMARY KEY (`session_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `farm_id` (`farm_id`);

--
-- Indexes for table `ChatMessages`
--
ALTER TABLE `ChatMessages`
  ADD PRIMARY KEY (`message_id`),
  ADD KEY `session_id` (`session_id`);

--
-- Indexes for table `Devices`
--
ALTER TABLE `Devices`
  ADD PRIMARY KEY (`device_id`),
  ADD UNIQUE KEY `serial_number` (`serial_number`),
  ADD KEY `field_id` (`field_id`);

--
-- Indexes for table `Events`
--
ALTER TABLE `Events`
  ADD PRIMARY KEY (`event_id`),
  ADD KEY `idx_field_device` (`field_id`,`device_id`),
  ADD KEY `idx_executed` (`is_executed`),
  ADD KEY `idx_created` (`created_at`),
  ADD KEY `device_id` (`device_id`);

--
-- Indexes for table `Farms`
--
ALTER TABLE `Farms`
  ADD PRIMARY KEY (`farm_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `Fields`
--
ALTER TABLE `Fields`
  ADD PRIMARY KEY (`field_id`),
  ADD KEY `farm_id` (`farm_id`);

--
-- Indexes for table `Images`
--
ALTER TABLE `Images`
  ADD PRIMARY KEY (`image_id`),
  ADD KEY `device_id` (`device_id`),
  ADD KEY `field_id` (`field_id`);

--
-- Indexes for table `Notifications`
--
ALTER TABLE `Notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `farm_id` (`farm_id`);

--
-- Indexes for table `SensingNodes`
--
ALTER TABLE `SensingNodes`
  ADD PRIMARY KEY (`node_id`),
  ADD UNIQUE KEY `mac_address` (`mac_address`),
  ADD KEY `device_id` (`device_id`);

--
-- Indexes for table `SensorLog`
--
ALTER TABLE `SensorLog`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `idx_node_time` (`node_id`,`created_at`),
  ADD KEY `idx_device_time` (`device_id`,`created_at`);

--
-- Indexes for table `SensorReadings`
--
ALTER TABLE `SensorReadings`
  ADD PRIMARY KEY (`reading_id`),
  ADD KEY `idx_device_timestamp` (`device_id`,`timestamp`);

--
-- Indexes for table `Users`
--
ALTER TABLE `Users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `AIResults`
--
ALTER TABLE `AIResults`
  MODIFY `result_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ChatbotSessions`
--
ALTER TABLE `ChatbotSessions`
  MODIFY `session_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ChatMessages`
--
ALTER TABLE `ChatMessages`
  MODIFY `message_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Devices`
--
ALTER TABLE `Devices`
  MODIFY `device_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Events`
--
ALTER TABLE `Events`
  MODIFY `event_id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Farms`
--
ALTER TABLE `Farms`
  MODIFY `farm_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Fields`
--
ALTER TABLE `Fields`
  MODIFY `field_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Notifications`
--
ALTER TABLE `Notifications`
  MODIFY `notification_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `SensingNodes`
--
ALTER TABLE `SensingNodes`
  MODIFY `node_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `SensorLog`
--
ALTER TABLE `SensorLog`
  MODIFY `log_id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `SensorReadings`
--
ALTER TABLE `SensorReadings`
  MODIFY `reading_id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Users`
--
ALTER TABLE `Users`
  MODIFY `user_id` int NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `AIResults`
--
ALTER TABLE `AIResults`
  ADD CONSTRAINT `AIResults_ibfk_1` FOREIGN KEY (`image_id`) REFERENCES `Images` (`image_id`) ON DELETE CASCADE;

--
-- Constraints for table `ChatbotSessions`
--
ALTER TABLE `ChatbotSessions`
  ADD CONSTRAINT `ChatbotSessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `ChatbotSessions_ibfk_2` FOREIGN KEY (`farm_id`) REFERENCES `Farms` (`farm_id`) ON DELETE SET NULL;

--
-- Constraints for table `ChatMessages`
--
ALTER TABLE `ChatMessages`
  ADD CONSTRAINT `ChatMessages_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `ChatbotSessions` (`session_id`) ON DELETE CASCADE;

--
-- Constraints for table `Devices`
--
ALTER TABLE `Devices`
  ADD CONSTRAINT `Devices_ibfk_1` FOREIGN KEY (`field_id`) REFERENCES `Fields` (`field_id`) ON DELETE CASCADE;

--
-- Constraints for table `Events`
--
ALTER TABLE `Events`
  ADD CONSTRAINT `Events_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `Devices` (`device_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `Events_ibfk_2` FOREIGN KEY (`field_id`) REFERENCES `Fields` (`field_id`) ON DELETE CASCADE;

--
-- Constraints for table `Farms`
--
ALTER TABLE `Farms`
  ADD CONSTRAINT `Farms_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `Fields`
--
ALTER TABLE `Fields`
  ADD CONSTRAINT `Fields_ibfk_1` FOREIGN KEY (`farm_id`) REFERENCES `Farms` (`farm_id`) ON DELETE CASCADE;

--
-- Constraints for table `Images`
--
ALTER TABLE `Images`
  ADD CONSTRAINT `Images_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `Devices` (`device_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `Images_ibfk_2` FOREIGN KEY (`field_id`) REFERENCES `Fields` (`field_id`) ON DELETE CASCADE;

--
-- Constraints for table `Notifications`
--
ALTER TABLE `Notifications`
  ADD CONSTRAINT `Notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `Notifications_ibfk_2` FOREIGN KEY (`farm_id`) REFERENCES `Farms` (`farm_id`) ON DELETE CASCADE;

--
-- Constraints for table `SensingNodes`
--
ALTER TABLE `SensingNodes`
  ADD CONSTRAINT `SensingNodes_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `Devices` (`device_id`) ON DELETE CASCADE;

--
-- Constraints for table `SensorLog`
--
ALTER TABLE `SensorLog`
  ADD CONSTRAINT `SensorLog_ibfk_1` FOREIGN KEY (`node_id`) REFERENCES `SensingNodes` (`node_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `SensorLog_ibfk_2` FOREIGN KEY (`device_id`) REFERENCES `Devices` (`device_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
