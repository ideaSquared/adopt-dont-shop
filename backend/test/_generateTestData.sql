
INSERT INTO pets (name, gender, type, age, short_description, long_description, images) VALUES ('Charlie', 'Unknown', 'Rabbit', 3, 'Loves to play and cuddle.', 'Young and spirited, this pet will bring a lot of joy and activity to your household.', NULL);
INSERT INTO pets (name, gender, type, age, short_description, long_description, images) VALUES ('Coco', 'Female', 'Bird', 28, 'Needs a lot of attention and care.', 'Prefers a quiet home without other pets, as it likes a lot of personal attention.', NULL);
INSERT INTO pets (name, gender, type, age, short_description, long_description, images) VALUES ('Bailey', 'Female', 'Guinea Pig', 25, 'Very friendly and loves kids.', 'This pet is perfect for families looking for a loving and interactive addition to their home.', NULL);
INSERT INTO pets (name, gender, type, age, short_description, long_description, images) VALUES ('Daisy', 'Unknown', 'Dog', 29, 'Loves to play and cuddle.', 'Young and spirited, this pet will bring a lot of joy and activity to your household.', NULL);
INSERT INTO pets (name, gender, type, age, short_description, long_description, images) VALUES ('Molly', 'Unknown', 'Hamster', 30, 'Very friendly and loves kids.', 'Adapts well to apartment living and is great with children.', NULL);
INSERT INTO pets (name, gender, type, age, short_description, long_description, images) VALUES ('Molly', 'Unknown', 'Hamster', 3, 'Energetic and loves going on walks.', 'Prefers a quiet home without other pets, as it likes a lot of personal attention.', NULL);
INSERT INTO pets (name, gender, type, age, short_description, long_description, images) VALUES ('Luna', 'Unknown', 'Hamster', 13, 'Adaptable to indoor living.', 'Young and spirited, this pet will bring a lot of joy and activity to your household.', NULL);
INSERT INTO pets (name, gender, type, age, short_description, long_description, images) VALUES ('Bella', 'Male', 'Guinea Pig', 12, 'Loves to eat and nap.', 'Needs a patient owner who can help them come out of their shell.', NULL);
INSERT INTO pets (name, gender, type, age, short_description, long_description, images) VALUES ('Charlie', 'Male', 'Bird', 20, 'Shy at first, but very affectionate once comfortable.', 'Perfect for anyone who wants a cuddly pet to spend time with indoors.', NULL);
INSERT INTO pets (name, gender, type, age, short_description, long_description, images) VALUES ('Charlie', 'Male', 'Dog', 7, 'Young and playful, full of energy.', 'This pet is perfect for families looking for a loving and interactive addition to their home.', NULL);

-- Insert test data into rescues
INSERT INTO rescues (rescue_name, city, country, rescue_type, reference_number, reference_number_verified)
VALUES ('Happy Paws', 'New York', 'USA', 'Charity', 'CH123', TRUE);

-- Insert test data into users
INSERT INTO users (email, password, first_name, last_name, email_verified)
VALUES ('test@example.com', 'hashedpassword123', 'John', 'Doe', TRUE);

-- Insert test data into staff_members
INSERT INTO staff_members (user_id, rescue_id, verified_by_rescue, permissions)
VALUES (1, 1, TRUE, ARRAY['edit_rescue_info', 'view_rescue_info']);