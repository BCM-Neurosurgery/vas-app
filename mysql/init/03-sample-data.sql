-- Sample data for testing
USE catdi_db;

-- Insert sample patients (IDs will auto-increment)
INSERT INTO patient (emu_id, latest) VALUES 
('John Doe', true),
('Jane Smith', false),
('Bob Johnson', false),
('Alice Brown', false);

-- Insert sample interviews (IDs will auto-increment, patient_id references patient.id)
INSERT INTO interview (patient_id, status, survey_type, catmh_id, start_time, end_time, timeframe_id, diagnosis, confidence, severity, category, precision, prob, percentile) VALUES 
(1, 'completed', 'Depression Screening (PHQ-9)', 1, NOW() - INTERVAL 2 HOUR, NOW() - INTERVAL 1 HOUR, 1, 'Mild Depression', 0.85, 6.0, 'Mood Disorder', 0.92, 0.78, 65),
(1, 'completed', 'Anxiety Assessment (GAD-7)', 2, NOW() - INTERVAL 24 HOUR, NOW() - INTERVAL 23 HOUR + INTERVAL 15 MINUTE, 1, 'Moderate Anxiety', 0.78, 8.0, 'Anxiety Disorder', 0.89, 0.82, 78),
(1, 'in_progress', 'Substance Use Screening', 3, NOW(), NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(2, 'completed', 'Depression Screening (PHQ-9)', 1, NOW() - INTERVAL 48 HOUR, NOW() - INTERVAL 47 HOUR, 1, 'No Depression', 0.92, 2.0, 'Normal', 0.95, 0.15, 25),
(3, 'terminated', 'Anxiety Assessment (GAD-7)', 2, NOW() - INTERVAL 12 HOUR, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
