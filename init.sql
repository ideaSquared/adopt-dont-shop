-- Ensure the 'public' schema exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'public') THEN
        CREATE SCHEMA public;
    END IF;
END $$;

-- =====================
-- Function Definitions
-- =====================

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- =====================
-- Table Definitions
-- =====================

CREATE TABLE public.applications (
    application_id text DEFAULT ('application_' || left(md5(random()::text), 12)) NOT NULL,
    user_id text NOT NULL,
    pet_id text NOT NULL,
    description text,
    status text,
    actioned_by text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT applications_status_check CHECK (status = ANY (ARRAY['pending', 'rejected', 'approved']))
);

CREATE TABLE public.conversations (
    conversation_id varchar DEFAULT ('conversation_' || left(md5(random()::text), 12)) NOT NULL,
    started_by varchar,
    started_at timestamp,
    last_message text,
    last_message_at timestamp,
    last_message_by varchar,
    pet_id varchar,
    status text,
    unread_messages integer,
    messages_count integer,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.messages (
    message_id varchar DEFAULT ('message_' || left(md5(random()::text), 12)) NOT NULL,
    conversation_id varchar,
    sender_id varchar,
    message_text text,
    sent_at timestamp,
    read_at timestamp,
    attachments text[],
    status text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.participants (
    participant_id varchar DEFAULT ('participant_' || left(md5(random()::text), 12)) NOT NULL,
    user_id varchar,
    conversation_id varchar,
    rescue_id varchar,
    participant_type text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.pets (
    pet_id varchar DEFAULT ('pet_' || left(md5(random()::text), 12)) NOT NULL,
    name text,
    owner_id varchar,
    short_description text,
    long_description text,
    age integer,
    gender text,
    status text,
    type text,
    archived boolean,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
    images text[],
    vaccination_status varchar(255),
    breed varchar(255),
    other_pets varchar,
    household varchar,
    energy varchar,
    family varchar,
    temperament varchar,
    health varchar,
    size varchar,
    grooming_needs varchar,
    training_socialization varchar,
    commitment_level varchar
);


CREATE TABLE public.ratings (
    rating_id varchar DEFAULT ('rating_' || left(md5(random()::text), 12)) NOT NULL,
    user_id varchar,
    pet_id varchar,
    rating_type text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.rescues (
    rescue_id varchar DEFAULT ('rescue_' || left(md5(random()::text), 12)) NOT NULL,
    rescue_name text,
    rescue_type text,
    reference_number text,
    reference_number_verified boolean,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
    address_line_1 text,
    address_line_2 text,
    city text,
    county text,
    postcode text,
    country text,
    location point
);

CREATE TABLE public.staff_members (
    staff_member_id varchar DEFAULT ('staff_member_' || left(md5(random()::text), 12)) NOT NULL,
    user_id varchar,
    verified_by_rescue boolean,
    permissions text[],
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
    rescue_id varchar
);

CREATE TABLE public.user_preferences (
    preferences_id varchar(255) DEFAULT ('user_preferences_' || left(md5(random()::text), 12)) NOT NULL,
    user_id varchar(255) NOT NULL,
    preference_key varchar(255) NOT NULL,
    preference_value varchar(255) NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.users (
    user_id varchar DEFAULT ('user_' || left(md5(random()::text), 12)) NOT NULL,
    first_name text,
    email text,
    password text,
    email_verified boolean,
    verification_token varchar(64),
    reset_token varchar(64),
    reset_token_expiration timestamp,
    reset_token_force_flag boolean,
    is_admin boolean,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
    last_name text,
    country varchar(255),
    city varchar(255),
    location point
);

-- =====================
-- Primary Keys
-- =====================

ALTER TABLE public.applications ADD CONSTRAINT applications_pkey PRIMARY KEY (application_id);
ALTER TABLE public.conversations ADD CONSTRAINT conversations_pkey PRIMARY KEY (conversation_id);
ALTER TABLE public.messages ADD CONSTRAINT messages_pkey PRIMARY KEY (message_id);
ALTER TABLE public.participants ADD CONSTRAINT participants_pkey PRIMARY KEY (participant_id);
ALTER TABLE public.pets ADD CONSTRAINT pets_pkey PRIMARY KEY (pet_id);
ALTER TABLE public.ratings ADD CONSTRAINT ratings_pkey PRIMARY KEY (rating_id);
ALTER TABLE public.rescues ADD CONSTRAINT rescues_pkey PRIMARY KEY (rescue_id);
ALTER TABLE public.staff_members ADD CONSTRAINT staff_members_pkey PRIMARY KEY (staff_member_id);
ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (preferences_id);
ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);
ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);

-- =====================
-- Foreign Keys
-- =====================

ALTER TABLE public.applications
    ADD CONSTRAINT applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT applications_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(pet_id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.conversations
    ADD CONSTRAINT conversations_started_by_fkey FOREIGN KEY (started_by) REFERENCES public.users(user_id) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT conversations_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(pet_id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(conversation_id) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(user_id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.participants
    ADD CONSTRAINT participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(conversation_id) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT participants_rescue_id_fkey FOREIGN KEY (rescue_id) REFERENCES public.rescues(rescue_id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.pets
    ADD CONSTRAINT pets_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.rescues(rescue_id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.ratings
    ADD CONSTRAINT ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT ratings_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(pet_id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public.staff_members
    ADD CONSTRAINT staff_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT staff_members_rescue_id_fkey FOREIGN KEY (rescue_id) REFERENCES public.rescues(rescue_id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE ON UPDATE CASCADE;


-- =====================
-- Triggers
-- =====================

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_conversations_modtime BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();
CREATE TRIGGER update_messages_modtime BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();
CREATE TRIGGER update_participants_modtime BEFORE UPDATE ON public.participants FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();
CREATE TRIGGER update_pets_modtime BEFORE UPDATE ON public.pets FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();
CREATE TRIGGER update_ratings_modtime BEFORE UPDATE ON public.ratings FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();
CREATE TRIGGER update_rescues_modtime BEFORE UPDATE ON public.rescues FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();
CREATE TRIGGER update_staff_members_modtime BEFORE UPDATE ON public.staff_members FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- =====================
-- Users (default password: 123456)
-- =====================

DO $$
DECLARE
    admin_user_id text := 'user_' || left(md5(random()::text), 12);
    user_ids text[] := array[
        'user_' || left(md5(random()::text), 12),
        'user_' || left(md5(random()::text), 12),
        'user_' || left(md5(random()::text), 12),
        'user_' || left(md5(random()::text), 12),
        'user_' || left(md5(random()::text), 12),
        'user_' || left(md5(random()::text), 12),
        'user_' || left(md5(random()::text), 12),
        'user_' || left(md5(random()::text), 12),
        'user_' || left(md5(random()::text), 12),
        'user_' || left(md5(random()::text), 12)
    ];
    rescue_ids text[] := array[
        'rescue_' || left(md5(random()::text), 12),
        'rescue_' || left(md5(random()::text), 12),
        'rescue_' || left(md5(random()::text), 12),
        'rescue_' || left(md5(random()::text), 12)
    ];
    pet_ids text[] := array[
        'pet_' || left(md5(random()::text), 12),
        'pet_' || left(md5(random()::text), 12),
        'pet_' || left(md5(random()::text), 12),
        'pet_' || left(md5(random()::text), 12),
        'pet_' || left(md5(random()::text), 12),
        'pet_' || left(md5(random()::text), 12),
        'pet_' || left(md5(random()::text), 12),
        'pet_' || left(md5(random()::text), 12),
        'pet_' || left(md5(random()::text), 12),
        'pet_' || left(md5(random()::text), 12),
        'pet_' || left(md5(random()::text), 12),
        'pet_' || left(md5(random()::text), 12),
        'pet_' || left(md5(random()::text), 12),
        'pet_' || left(md5(random()::text), 12),
        'pet_' || left(md5(random()::text), 12),
        'pet_' || left(md5(random()::text), 12),
        'pet_' || left(md5(random()::text), 12),
        'pet_' || left(md5(random()::text), 12),
        'pet_' || left(md5(random()::text), 12),
        'pet_' || left(md5(random()::text), 12)
    ];
    conversation_ids text[] := array[
        'conversation_' || left(md5(random()::text), 12),
        'conversation_' || left(md5(random()::text), 12),
        'conversation_' || left(md5(random()::text), 12)
    ];
BEGIN
    INSERT INTO public.users (user_id, first_name, last_name, email, password, email_verified, is_admin, created_at, updated_at)
    VALUES
        (admin_user_id, 'Admin', 'User', 'admin@example.com', '$2a$12$G7.KLn8vGgaXqeQH71106OfcelJr7cOe0qh5c4Ra7kDyG6iFnyCmi', TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (user_ids[1], 'User2', 'Example', 'user2@example.com', '$2a$12$G7.KLn8vGgaXqeQH71106OfcelJr7cOe0qh5c4Ra7kDyG6iFnyCmi', TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (user_ids[2], 'User3', 'Example', 'user3@example.com', '$2a$12$G7.KLn8vGgaXqeQH71106OfcelJr7cOe0qh5c4Ra7kDyG6iFnyCmi', TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (user_ids[3], 'User4', 'Example', 'user4@example.com', '$2a$12$G7.KLn8vGgaXqeQH71106OfcelJr7cOe0qh5c4Ra7kDyG6iFnyCmi', TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (user_ids[4], 'User5', 'Example', 'user5@example.com', '$2a$12$G7.KLn8vGgaXqeQH71106OfcelJr7cOe0qh5c4Ra7kDyG6iFnyCmi', TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (user_ids[5], 'User6', 'Example', 'user6@example.com', '$2a$12$G7.KLn8vGgaXqeQH71106OfcelJr7cOe0qh5c4Ra7kDyG6iFnyCmi', TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (user_ids[6], 'User7', 'Example', 'user7@example.com', '$2a$12$G7.KLn8vGgaXqeQH71106OfcelJr7cOe0qh5c4Ra7kDyG6iFnyCmi', TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (user_ids[7], 'User8', 'Example', 'user8@example.com', '$2a$12$G7.KLn8vGgaXqeQH71106OfcelJr7cOe0qh5c4Ra7kDyG6iFnyCmi', TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (user_ids[8], 'User9', 'Example', 'user9@example.com', '$2a$12$G7.KLn8vGgaXqeQH71106OfcelJr7cOe0qh5c4Ra7kDyG6iFnyCmi', TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (user_ids[9], 'User10', 'Example', 'user10@example.com', '$2a$12$G7.KLn8vGgaXqeQH71106OfcelJr7cOe0qh5c4Ra7kDyG6iFnyCmi', TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (user_ids[10], 'User11', 'Example', 'user11@example.com', '$2a$12$G7.KLn8vGgaXqeQH71106OfcelJr7cOe0qh5c4Ra7kDyG6iFnyCmi', TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

    -- =====================
    -- Rescues
    -- =====================

    INSERT INTO public.rescues (rescue_id, rescue_name, rescue_type, reference_number, reference_number_verified, created_at, updated_at, address_line_1, city, country)
    VALUES
        (rescue_ids[1], 'Charity Rescue', 'charity', '123456', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '123 Charity St', 'Charity City', 'Country'),
        (rescue_ids[2], 'Company Rescue', 'company', '789101', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '456 Company Ave', 'Company Town', 'Country'),
        (rescue_ids[3], 'Individual Rescue', 'individual', '112131', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '789 Individual Rd', 'Individual Village', 'Country'),
        (rescue_ids[4], 'Empty Rescue', 'charity', '415161', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Empty St', 'Empty City', 'Country');

    -- =====================
    -- Staff Members
    -- =====================

    INSERT INTO public.staff_members (staff_member_id, user_id, verified_by_rescue, permissions, created_at, updated_at, rescue_id)
    VALUES
        ('staff_member_' || left(md5(random()::text), 12), user_ids[1], TRUE, '{"view_rescue_info", "edit_rescue_info", "delete_rescue", "view_staff", "add_staff", "edit_staff", "verify_staff", "delete_staff", "view_pet", "add_pet", "edit_pet", "delete_pet", "create_messages", "view_messages", "view_applications", "action_applications"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, rescue_ids[1]),
        ('staff_member_' || left(md5(random()::text), 12), user_ids[2], TRUE, '{"view_rescue_info", "edit_rescue_info", "view_staff", "verify_staff", "view_pet", "create_messages", "view_messages", "view_applications"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, rescue_ids[1]),
        ('staff_member_' || left(md5(random()::text), 12), user_ids[3], TRUE, '{"view_rescue_info", "edit_rescue_info", "delete_rescue", "view_staff", "add_staff", "edit_staff", "verify_staff", "delete_staff", "view_pet", "add_pet", "edit_pet", "delete_pet", "create_messages", "view_messages", "view_applications", "action_applications"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, rescue_ids[2]),
        ('staff_member_' || left(md5(random()::text), 12), user_ids[4], TRUE, '{"view_rescue_info", "delete_rescue", "view_staff", "add_staff", "view_pet", "delete_pet", "view_messages", "action_applications"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, rescue_ids[2]),
        ('staff_member_' || left(md5(random()::text), 12), admin_user_id, TRUE, '{"view_rescue_info", "edit_rescue_info", "view_staff", "delete_staff", "view_pet", "edit_pet", "delete_pet", "create_messages", "view_messages"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, rescue_ids[3]);


    -- =====================
    -- Pets
    -- =====================

    INSERT INTO public.pets (pet_id, name, owner_id, short_description, long_description, age, gender, status, type, archived, created_at, updated_at)
    VALUES
        (pet_ids[1], 'Pet1', rescue_ids[1], 'Short description 1', 'Long description 1', 1, 'Male', 'Available', 'Dog', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (pet_ids[2], 'Pet2', rescue_ids[1], 'Short description 2', 'Long description 2', 2, 'Female', 'Available', 'Cat', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (pet_ids[3], 'Pet3', rescue_ids[1], 'Short description 3', 'Long description 3', 3, 'Male', 'Adopted', 'Dog', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (pet_ids[4], 'Pet4', rescue_ids[1], 'Short description 4', 'Long description 4', 4, 'Female', 'Available', 'Cat', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (pet_ids[5], 'Pet5', rescue_ids[1], 'Short description 5', 'Long description 5', 5, 'Male', 'Available', 'Dog', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (pet_ids[6], 'Pet6', rescue_ids[1], 'Short description 6', 'Long description 6', 6, 'Female', 'Adopted', 'Cat', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (pet_ids[7], 'Pet7', rescue_ids[2], 'Short description 7', 'Long description 7', 7, 'Male', 'Available', 'Dog', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (pet_ids[8], 'Pet8', rescue_ids[2], 'Short description 8', 'Long description 8', 8, 'Female', 'Available', 'Cat', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (pet_ids[9], 'Pet9', rescue_ids[2], 'Short description 9', 'Long description 9', 9, 'Male', 'Adopted', 'Dog', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (pet_ids[10], 'Pet10', rescue_ids[2], 'Short description 10', 'Long description 10', 10, 'Female', 'Available', 'Cat', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (pet_ids[11], 'Pet11', rescue_ids[2], 'Short description 11', 'Long description 11', 11, 'Male', 'Available', 'Dog', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (pet_ids[12], 'Pet12', rescue_ids[2], 'Short description 12', 'Long description 12', 12, 'Female', 'Adopted', 'Cat', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (pet_ids[13], 'Pet13', rescue_ids[3], 'Short description 13', 'Long description 13', 13, 'Male', 'Available', 'Dog', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (pet_ids[14], 'Pet14', rescue_ids[3], 'Short description 14', 'Long description 14', 14, 'Female', 'Available', 'Cat', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (pet_ids[15], 'Pet15', rescue_ids[3], 'Short description 15', 'Long description 15', 15, 'Male', 'Adopted', 'Dog', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (pet_ids[16], 'Pet16', rescue_ids[3], 'Short description 16', 'Long description 16', 16, 'Female', 'Available', 'Cat', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (pet_ids[17], 'Pet17', rescue_ids[3], 'Short description 17', 'Long description 17', 17, 'Male', 'Available', 'Dog', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (pet_ids[18], 'Pet18', rescue_ids[3], 'Short description 18', 'Long description 18', 18, 'Female', 'Adopted', 'Cat', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (pet_ids[19], 'Pet19', rescue_ids[3], 'Short description 19', 'Long description 19', 19, 'Male', 'Available', 'Dog', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (pet_ids[20], 'Pet20', rescue_ids[3], 'Short description 20', 'Long description 20', 20, 'Female', 'Available', 'Cat', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

    -- =====================
    -- Applications
    -- =====================

    INSERT INTO public.applications (application_id, user_id, pet_id, description, status, actioned_by, created_at, updated_at)
    VALUES
        ('application_' || left(md5(random()::text), 12), user_ids[1], pet_ids[1], 'Application description 1', 'pending', admin_user_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('application_' || left(md5(random()::text), 12), user_ids[2], pet_ids[2], 'Application description 2', 'approved', user_ids[1], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('application_' || left(md5(random()::text), 12), user_ids[3], pet_ids[3], 'Application description 3', 'rejected', user_ids[2], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('application_' || left(md5(random()::text), 12), user_ids[4], pet_ids[4], 'Application description 4', 'pending', user_ids[3], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('application_' || left(md5(random()::text), 12), user_ids[5], pet_ids[5], 'Application description 5', 'approved', user_ids[4], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('application_' || left(md5(random()::text), 12), user_ids[6], pet_ids[6], 'Application description 6', 'rejected', user_ids[5], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('application_' || left(md5(random()::text), 12), user_ids[7], pet_ids[7], 'Application description 7', 'pending', user_ids[6], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('application_' || left(md5(random()::text), 12), user_ids[8], pet_ids[8], 'Application description 8', 'approved', user_ids[7], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('application_' || left(md5(random()::text), 12), user_ids[9], pet_ids[9], 'Application description 9', 'rejected', user_ids[8], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('application_' || left(md5(random()::text), 12), user_ids[10], pet_ids[10], 'Application description 10', 'pending', user_ids[9], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

    -- =====================
    -- Ratings
    -- =====================

    INSERT INTO public.ratings (rating_id, user_id, pet_id, rating_type, created_at, updated_at)
    VALUES
        ('rating_' || left(md5(random()::text), 12), user_ids[1], pet_ids[1], 'like', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('rating_' || left(md5(random()::text), 12), user_ids[2], pet_ids[2], 'like', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('rating_' || left(md5(random()::text), 12), user_ids[3], pet_ids[3], 'like', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('rating_' || left(md5(random()::text), 12), user_ids[4], pet_ids[4], 'like', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('rating_' || left(md5(random()::text), 12), user_ids[5], pet_ids[5], 'like', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('rating_' || left(md5(random()::text), 12), user_ids[6], pet_ids[6], 'like', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('rating_' || left(md5(random()::text), 12), user_ids[7], pet_ids[7], 'like', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('rating_' || left(md5(random()::text), 12), user_ids[8], pet_ids[8], 'like', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('rating_' || left(md5(random()::text), 12), user_ids[9], pet_ids[9], 'like', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('rating_' || left(md5(random()::text), 12), user_ids[10], pet_ids[10], 'like', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

    -- =====================
    -- Conversations and Messages
    -- =====================

    INSERT INTO public.conversations (conversation_id, started_by, started_at, last_message, last_message_at, last_message_by, pet_id, status, unread_messages, messages_count, created_at, updated_at)
    VALUES
        (conversation_ids[1], user_ids[1], CURRENT_TIMESTAMP, 'Last message text 1', CURRENT_TIMESTAMP, user_ids[1], pet_ids[1], 'open', 0, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (conversation_ids[2], user_ids[2], CURRENT_TIMESTAMP, 'Last message text 2', CURRENT_TIMESTAMP, user_ids[2], pet_ids[2], 'open', 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (conversation_ids[3], user_ids[3], CURRENT_TIMESTAMP, 'Last message text 3', CURRENT_TIMESTAMP, user_ids[3], pet_ids[3], 'open', 2, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

    INSERT INTO public.messages (message_id, conversation_id, sender_id, message_text, sent_at, read_at, status, created_at, updated_at)
    VALUES
        ('message_' || left(md5(random()::text), 12), conversation_ids[1], user_ids[1], 'Message text 1', CURRENT_TIMESTAMP, NULL, 'sent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('message_' || left(md5(random()::text), 12), conversation_ids[1], user_ids[2], 'Message text 2', CURRENT_TIMESTAMP, NULL, 'sent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('message_' || left(md5(random()::text), 12), conversation_ids[1], user_ids[1], 'Message text 3', CURRENT_TIMESTAMP, NULL, 'sent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('message_' || left(md5(random()::text), 12), conversation_ids[1], user_ids[2], 'Message text 4', CURRENT_TIMESTAMP, NULL, 'sent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('message_' || left(md5(random()::text), 12), conversation_ids[1], user_ids[1], 'Message text 5', CURRENT_TIMESTAMP, NULL, 'sent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('message_' || left(md5(random()::text), 12), conversation_ids[2], user_ids[2], 'Message text 6', CURRENT_TIMESTAMP, NULL, 'sent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('message_' || left(md5(random()::text), 12), conversation_ids[2], user_ids[3], 'Message text 7', CURRENT_TIMESTAMP, NULL, 'sent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('message_' || left(md5(random()::text), 12), conversation_ids[2], user_ids[2], 'Message text 8', CURRENT_TIMESTAMP, NULL, 'sent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('message_' || left(md5(random()::text), 12), conversation_ids[3], user_ids[3], 'Message text 9', CURRENT_TIMESTAMP, NULL, 'sent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('message_' || left(md5(random()::text), 12), conversation_ids[3], user_ids[4], 'Message text 10', CURRENT_TIMESTAMP, NULL, 'sent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
END $$;
