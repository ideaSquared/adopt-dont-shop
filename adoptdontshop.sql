--
-- PostgreSQL database dump
--

-- Dumped from database version 16.2
-- Dumped by pg_dump version 16.2

-- Started on 2024-06-24 18:16:42

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 4 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

-- Check if the schema exists before creating it
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'public') THEN
        CREATE SCHEMA public;
    END IF;
END $$;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- TOC entry 4899 (class 0 OID 0)
-- Dependencies: 4
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 226 (class 1255 OID 16555)
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_modified_column() OWNER TO postgres;

--
-- TOC entry 227 (class 1255 OID 25341)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 225 (class 1259 OID 25315)
-- Name: applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.applications (
    application_id text DEFAULT ('application_'::text || "left"(md5((random())::text), 12)) NOT NULL,
    user_id text NOT NULL,
    pet_id text NOT NULL,
    description text,
    status text,
    actioned_by text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT applications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'rejected'::text, 'approved'::text])))
);


ALTER TABLE public.applications OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16861)
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    conversation_id character varying DEFAULT ('conversation_0000'::text || "left"(md5((random())::text), 12)) NOT NULL,
    started_by character varying,
    started_at timestamp without time zone,
    last_message text,
    last_message_at timestamp without time zone,
    last_message_by character varying,
    pet_id character varying,
    status text,
    unread_messages integer,
    messages_count integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.conversations OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16887)
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    message_id character varying DEFAULT ('message_0000'::text || "left"(md5((random())::text), 12)) NOT NULL,
    conversation_id character varying,
    sender_id character varying,
    message_text text,
    sent_at timestamp without time zone,
    read_at timestamp without time zone,
    attachments text[],
    status text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16908)
-- Name: participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.participants (
    participant_id character varying DEFAULT ('participant_0000'::text || "left"(md5((random())::text), 12)) NOT NULL,
    user_id character varying,
    conversation_id character varying,
    rescue_id character varying,
    participant_type text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.participants OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16798)
-- Name: pets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pets (
    pet_id character varying DEFAULT ('pet_0000'::text || "left"(md5((random())::text), 12)) NOT NULL,
    name text,
    owner_id character varying,
    short_description text,
    long_description text,
    age integer,
    gender text,
    status text,
    type text,
    archived boolean,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    images text[],
    vaccination_status character varying(255),
    breed character varying(255),
    other_pets character varying,
    household character varying,
    energy character varying,
    family character varying,
    temperament character varying,
    health character varying,
    size character varying,
    grooming_needs character varying,
    training_socialization character varying,
    commitment_level character varying
);


ALTER TABLE public.pets OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16814)
-- Name: ratings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ratings (
    rating_id character varying DEFAULT ('rating_0000'::text || "left"(md5((random())::text), 12)) NOT NULL,
    user_id character varying,
    pet_id character varying,
    rating_type text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ratings OWNER TO postgres;

--
-- TOC entry 215 (class 1259 OID 16566)
-- Name: ratings_rating_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ratings_rating_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ratings_rating_id_seq OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 16766)
-- Name: rescues; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rescues (
    rescue_id character varying DEFAULT ('rescue_0000'::text || "left"(md5((random())::text), 12)) NOT NULL,
    rescue_name text,
    rescue_type text,
    reference_number text,
    reference_number_verified boolean,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    address_line_1 text,
    address_line_2 text,
    city text,
    county text,
    postcode text,
    country text,
    location point
);


ALTER TABLE public.rescues OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 16777)
-- Name: staff_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff_members (
    staff_member_id character varying DEFAULT ('staff_member_0000'::text || "left"(md5((random())::text), 12)) NOT NULL,
    user_id character varying,
    verified_by_rescue boolean,
    permissions text[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    rescue_id character varying
);


ALTER TABLE public.staff_members OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 17108)
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_preferences (
    preferences_id character varying(255) DEFAULT ('user_preferences_0000'::text || "left"(md5((random())::text), 12)) NOT NULL,
    user_id character varying(255) NOT NULL,
    preference_key character varying(255) NOT NULL,
    preference_value character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_preferences OWNER TO postgres;

--
-- TOC entry 216 (class 1259 OID 16738)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    user_id character varying DEFAULT ('user_0000'::text || "left"(md5((random())::text), 12)) NOT NULL,
    first_name text,
    email text,
    password text,
    email_verified boolean,
    verification_token character varying(64),
    reset_token character varying(64),
    reset_token_expiration timestamp without time zone,
    reset_token_force_flag boolean,
    is_admin boolean,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_name text,
    country character varying(255),
    city character varying(255),
    location point
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 4724 (class 2606 OID 25325)
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (application_id);


--
-- TOC entry 4716 (class 2606 OID 16870)
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (conversation_id);


--
-- TOC entry 4718 (class 2606 OID 16896)
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (message_id);


--
-- TOC entry 4720 (class 2606 OID 16917)
-- Name: participants participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_pkey PRIMARY KEY (participant_id);


--
-- TOC entry 4712 (class 2606 OID 16807)
-- Name: pets pets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_pkey PRIMARY KEY (pet_id);


--
-- TOC entry 4714 (class 2606 OID 16823)
-- Name: ratings ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_pkey PRIMARY KEY (rating_id);


--
-- TOC entry 4708 (class 2606 OID 16775)
-- Name: rescues rescues_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rescues
    ADD CONSTRAINT rescues_pkey PRIMARY KEY (rescue_id);


--
-- TOC entry 4710 (class 2606 OID 16786)
-- Name: staff_members staff_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_members
    ADD CONSTRAINT staff_members_pkey PRIMARY KEY (staff_member_id);


--
-- TOC entry 4722 (class 2606 OID 17117)
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (preferences_id);


--
-- TOC entry 4704 (class 2606 OID 16749)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4706 (class 2606 OID 16747)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4750 (class 2620 OID 25342)
-- Name: applications update_applications_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4747 (class 2620 OID 16886)
-- Name: conversations update_conversations_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_conversations_modtime BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 4748 (class 2620 OID 16907)
-- Name: messages update_messages_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_messages_modtime BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 4749 (class 2620 OID 16933)
-- Name: participants update_participants_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_participants_modtime BEFORE UPDATE ON public.participants FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 4745 (class 2620 OID 16813)
-- Name: pets update_pets_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_pets_modtime BEFORE UPDATE ON public.pets FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 4746 (class 2620 OID 16834)
-- Name: ratings update_ratings_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_ratings_modtime BEFORE UPDATE ON public.ratings FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 4743 (class 2620 OID 16776)
-- Name: rescues update_rescues_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_rescues_modtime BEFORE UPDATE ON public.rescues FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 4744 (class 2620 OID 16797)
-- Name: staff_members update_staff_members_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_staff_members_modtime BEFORE UPDATE ON public.staff_members FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 4742 (class 2620 OID 16750)
-- Name: users update_users_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 4730 (class 2606 OID 16876)
-- Name: conversations conversations_last_message_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_last_message_by_fkey FOREIGN KEY (last_message_by) REFERENCES public.users(user_id);


--
-- TOC entry 4731 (class 2606 OID 17138)
-- Name: conversations conversations_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(pet_id) ON DELETE CASCADE;


--
-- TOC entry 4732 (class 2606 OID 17133)
-- Name: conversations conversations_started_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_started_by_fkey FOREIGN KEY (started_by) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 4739 (class 2606 OID 25336)
-- Name: applications fk_actioned_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT fk_actioned_by FOREIGN KEY (actioned_by) REFERENCES public.users(user_id);


--
-- TOC entry 4740 (class 2606 OID 25331)
-- Name: applications fk_pet; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT fk_pet FOREIGN KEY (pet_id) REFERENCES public.pets(pet_id) ON DELETE CASCADE;


--
-- TOC entry 4741 (class 2606 OID 25326)
-- Name: applications fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 4733 (class 2606 OID 17128)
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(conversation_id) ON DELETE CASCADE;


--
-- TOC entry 4734 (class 2606 OID 16902)
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(user_id);


--
-- TOC entry 4735 (class 2606 OID 17148)
-- Name: participants participants_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(conversation_id) ON DELETE CASCADE;


--
-- TOC entry 4736 (class 2606 OID 16928)
-- Name: participants participants_rescue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_rescue_id_fkey FOREIGN KEY (rescue_id) REFERENCES public.rescues(rescue_id);


--
-- TOC entry 4737 (class 2606 OID 17143)
-- Name: participants participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 4727 (class 2606 OID 16953)
-- Name: pets pets_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.rescues(rescue_id);


--
-- TOC entry 4728 (class 2606 OID 17123)
-- Name: ratings ratings_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(pet_id) ON DELETE SET NULL;


--
-- TOC entry 4729 (class 2606 OID 16824)
-- Name: ratings ratings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- TOC entry 4725 (class 2606 OID 16792)
-- Name: staff_members staff_members_rescue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_members
    ADD CONSTRAINT staff_members_rescue_id_fkey FOREIGN KEY (rescue_id) REFERENCES public.rescues(rescue_id);


--
-- TOC entry 4726 (class 2606 OID 16787)
-- Name: staff_members staff_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_members
    ADD CONSTRAINT staff_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- TOC entry 4738 (class 2606 OID 17118)
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


-- Completed on 2024-06-24 18:16:42

--
-- PostgreSQL database dump complete
--

