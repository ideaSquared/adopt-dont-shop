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
