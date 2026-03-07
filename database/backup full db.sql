--
-- PostgreSQL database dump
--

\restrict GnnBEGLiCdI4BI3mmBEEAJXIs1BH67cyZ8LADHUpUjKLZ3J0mdjvRRaXYkYy737

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-03-07 17:10:49

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
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

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- TOC entry 5115 (class 0 OID 0)
-- Dependencies: 4
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 247 (class 1255 OID 16674)
-- Name: generate_daily_broadcast(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_daily_broadcast() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    final_message TEXT;
BEGIN

    SELECT
        '━━━━━━━━━━━━━━━━━━' || E'\n' ||
        '🟢 UMIYA AGRO DIGITAL PRIVATE LIMITED' || E'\n' ||
        'અરવિંદભાઈ પટેલ – મહેસાણા – 9426501245' || E'\n' ||
        '━━━━━━━━━━━━━━━━━━' || E'\n\n' ||
        '📊 સવારનો બજાર ભાવ અપડેટ | Morning Market Update' || E'\n' ||
        '📅 ' || TO_CHAR(CURRENT_DATE, 'DD Mon YYYY') || E'\n' ||
        '🕘 Morning Edition – 09:30 AM' || E'\n\n' ||
        '━━━━━━━━━━━━━━━━━━' || E'\n\n' ||

        STRING_AGG(
            '🏭 ' || f.name || ' – ' || f.city || E'\n' ||
            (
                SELECT STRING_AGG(
                    '🐄 ' || c2.name || ' – ₹' || dp2.price || ' / ' || c2.unit ||
                    CASE
                        WHEN dp_y.price IS NULL OR dp_y.price = 0 THEN ''
                        WHEN dp2.price > dp_y.price THEN
                            ' ↑ +' || (dp2.price - dp_y.price) ||
                            ' (' ||
                            ROUND(((dp2.price - dp_y.price) / dp_y.price) * 100, 2)
                            || '%)'
                        WHEN dp2.price < dp_y.price THEN
                            ' ↓ ' || (dp2.price - dp_y.price) ||
                            ' (' ||
                            ROUND(((dp2.price - dp_y.price) / dp_y.price) * 100, 2)
                            || '%)'
                        ELSE
                            ' → 0 (0%)'
                    END,
                    E'\n'
                    ORDER BY c2.name
                )
                FROM daily_prices dp2
                LEFT JOIN daily_prices dp_y
                    ON dp2.factory_id = dp_y.factory_id
                    AND dp2.commodity_id = dp_y.commodity_id
                    AND dp_y.price_date = CURRENT_DATE - INTERVAL '1 day'
                JOIN commodities c2 ON dp2.commodity_id = c2.id
                WHERE dp2.factory_id = f.id
                AND dp2.price_date = CURRENT_DATE
            ),
            E'\n\n━━━━━━━━━━━━━━━━━━\n\n'
        )

        || E'\n\n━━━━━━━━━━━━━━━━━━' ||
        E'\n📈 બજાર વિશ્લેષણ સેવા | Market Intelligence Service' ||
        E'\nUmiya Agro Digital Private Limited' ||
        E'\n━━━━━━━━━━━━━━━━━━'

    INTO final_message
    FROM factories f
    WHERE EXISTS (
        SELECT 1
        FROM daily_prices dp
        WHERE dp.factory_id = f.id
        AND dp.price_date = CURRENT_DATE
    );

    IF final_message IS NULL THEN
        RETURN 'No price data found for today.';
    END IF;

    INSERT INTO broadcasts (message, status)
    VALUES (final_message, 'PENDING');

    RETURN 'Broadcast generated successfully.';

END;
$$;


ALTER FUNCTION public.generate_daily_broadcast() OWNER TO postgres;

--
-- TOC entry 235 (class 1255 OID 16727)
-- Name: log_price_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_price_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN

    IF TG_OP = 'INSERT' THEN
        INSERT INTO price_history (
            factory_id,
            commodity_id,
            old_price,
            new_price,
            price_date,
            change_type
        )
        VALUES (
            NEW.factory_id,
            NEW.commodity_id,
            NULL,
            NEW.price,
            NEW.price_date,
            'INSERT'
        );

    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO price_history (
            factory_id,
            commodity_id,
            old_price,
            new_price,
            price_date,
            change_type
        )
        VALUES (
            NEW.factory_id,
            NEW.commodity_id,
            OLD.price,
            NEW.price,
            NEW.price_date,
            'UPDATE'
        );
    END IF;

    RETURN NEW;

END;
$$;


ALTER FUNCTION public.log_price_change() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 228 (class 1259 OID 16659)
-- Name: broadcasts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.broadcasts (
    id integer NOT NULL,
    message text NOT NULL,
    status character varying(50) DEFAULT 'PENDING'::character varying,
    sent_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    broadcast_type character varying(50) DEFAULT 'GENERAL'::character varying
);


ALTER TABLE public.broadcasts OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16658)
-- Name: broadcasts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.broadcasts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.broadcasts_id_seq OWNER TO postgres;

--
-- TOC entry 5116 (class 0 OID 0)
-- Dependencies: 227
-- Name: broadcasts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.broadcasts_id_seq OWNED BY public.broadcasts.id;


--
-- TOC entry 222 (class 1259 OID 16608)
-- Name: commodities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.commodities (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    category character varying(100),
    unit character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.commodities OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16607)
-- Name: commodities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.commodities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.commodities_id_seq OWNER TO postgres;

--
-- TOC entry 5117 (class 0 OID 0)
-- Dependencies: 221
-- Name: commodities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.commodities_id_seq OWNED BY public.commodities.id;


--
-- TOC entry 224 (class 1259 OID 16619)
-- Name: daily_prices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_prices (
    id integer NOT NULL,
    factory_id integer NOT NULL,
    commodity_id integer NOT NULL,
    price numeric(10,2) NOT NULL,
    remarks text,
    price_date date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.daily_prices OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16618)
-- Name: daily_prices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_prices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.daily_prices_id_seq OWNER TO postgres;

--
-- TOC entry 5118 (class 0 OID 0)
-- Dependencies: 223
-- Name: daily_prices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_prices_id_seq OWNED BY public.daily_prices.id;


--
-- TOC entry 220 (class 1259 OID 16597)
-- Name: factories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.factories (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    city character varying(100),
    contact_number character varying(20),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.factories OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16596)
-- Name: factories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.factories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.factories_id_seq OWNER TO postgres;

--
-- TOC entry 5119 (class 0 OID 0)
-- Dependencies: 219
-- Name: factories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.factories_id_seq OWNED BY public.factories.id;


--
-- TOC entry 229 (class 1259 OID 16681)
-- Name: final_message; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.final_message (
    "?column?" text
);


ALTER TABLE public.final_message OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16694)
-- Name: latest_prices; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.latest_prices AS
 SELECT DISTINCT ON (factory_id, commodity_id) factory_id,
    commodity_id,
    price,
    price_date
   FROM public.daily_prices
  ORDER BY factory_id, commodity_id, price_date DESC;


ALTER VIEW public.latest_prices OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 16715)
-- Name: price_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.price_history (
    id integer NOT NULL,
    factory_id integer NOT NULL,
    commodity_id integer NOT NULL,
    old_price numeric,
    new_price numeric,
    price_date date,
    change_type character varying(20),
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.price_history OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 16714)
-- Name: price_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.price_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.price_history_id_seq OWNER TO postgres;

--
-- TOC entry 5120 (class 0 OID 0)
-- Dependencies: 233
-- Name: price_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.price_history_id_seq OWNED BY public.price_history.id;


--
-- TOC entry 226 (class 1259 OID 16646)
-- Name: subscribers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscribers (
    id integer NOT NULL,
    name character varying(150),
    mobile character varying(20) NOT NULL,
    city character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    whatsapp_number character varying(20),
    subscribed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.subscribers OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16645)
-- Name: subscribers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscribers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscribers_id_seq OWNER TO postgres;

--
-- TOC entry 5121 (class 0 OID 0)
-- Dependencies: 225
-- Name: subscribers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscribers_id_seq OWNED BY public.subscribers.id;


--
-- TOC entry 232 (class 1259 OID 16700)
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    id integer NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value text NOT NULL,
    description text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16699)
-- Name: system_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_settings_id_seq OWNER TO postgres;

--
-- TOC entry 5122 (class 0 OID 0)
-- Dependencies: 231
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;


--
-- TOC entry 4908 (class 2604 OID 16662)
-- Name: broadcasts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcasts ALTER COLUMN id SET DEFAULT nextval('public.broadcasts_id_seq'::regclass);


--
-- TOC entry 4899 (class 2604 OID 16611)
-- Name: commodities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commodities ALTER COLUMN id SET DEFAULT nextval('public.commodities_id_seq'::regclass);


--
-- TOC entry 4902 (class 2604 OID 16622)
-- Name: daily_prices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_prices ALTER COLUMN id SET DEFAULT nextval('public.daily_prices_id_seq'::regclass);


--
-- TOC entry 4896 (class 2604 OID 16600)
-- Name: factories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.factories ALTER COLUMN id SET DEFAULT nextval('public.factories_id_seq'::regclass);


--
-- TOC entry 4914 (class 2604 OID 16718)
-- Name: price_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_history ALTER COLUMN id SET DEFAULT nextval('public.price_history_id_seq'::regclass);


--
-- TOC entry 4904 (class 2604 OID 16649)
-- Name: subscribers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscribers ALTER COLUMN id SET DEFAULT nextval('public.subscribers_id_seq'::regclass);


--
-- TOC entry 4912 (class 2604 OID 16703)
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- TOC entry 5104 (class 0 OID 16659)
-- Dependencies: 228
-- Data for Name: broadcasts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.broadcasts (id, message, status, sent_at, created_at, broadcast_type) FROM stdin;
1	📊 આજનો બજાર ભાવ અપડેટ\n📅 2026-03-03\n\n🏭 ભાવેશ ઓઇલ  મિલ – હારીજ\n🐄 કપાસિયા ખોળ – ₹1650.00 / સુગર બારદાન 50kg\n🐄 જાડુ ભુસુ – ₹2450.00 / 39kg Bag \n━━━━━━━━━━━━━━━━━━\n\n🏭 જય અંબે  ઇન્ડસ્ટ્રીઝ – વિસનગર\n🐄 કપાસિયા ખોળ – ₹1625.00 / સુગર બારદાન 50kg\n🐄 જીણું ભુસુ – ₹1980.00 / 49kg Bag\n━━━━━━━━━━━━━━━━━━\n\n🏭 ભગવતી મિલ – ભાયલા\n🐄 કપાસિયા ખોળ – ₹1675.00 / સુગર બારદાન 50kg\n🐄 જાડુ ભુસુ – ₹2480.00 / 39kg Bag \n━━━━━━━━━━━━━━━━━━	PENDING	\N	2026-03-03 12:23:20.486305	GENERAL
2	📊 આજનો બજાર ભાવ અપડેટ\n📅 2026-03-03\n\n🏭 ભાવેશ ઓઇલ  મિલ – હારીજ\n🐄 કપાસિયા ખોળ – ₹1650.00 / સુગર બારદાન 50kg\n🐄 જાડુ ભુસુ – ₹2450.00 / 39kg Bag \n━━━━━━━━━━━━━━━━━━\n\n🏭 જય અંબે  ઇન્ડસ્ટ્રીઝ – વિસનગર\n🐄 કપાસિયા ખોળ – ₹1625.00 / સુગર બારદાન 50kg\n🐄 જીણું ભુસુ – ₹1980.00 / 49kg Bag\n━━━━━━━━━━━━━━━━━━\n\n🏭 ભગવતી મિલ – ભાયલા\n🐄 કપાસિયા ખોળ – ₹1675.00 / સુગર બારદાન 50kg\n🐄 જાડુ ભુસુ – ₹2480.00 / 39kg Bag \n━━━━━━━━━━━━━━━━━━	PENDING	\N	2026-03-03 12:28:37.537141	GENERAL
3	📊 આજનો બજાર ભાવ અપડેટ\n📅 2026-03-03\n\n🏭 ભાવેશ ઓઇલ  મિલ – હારીજ\n🐄 કપાસિયા ખોળ – ₹1650.00 / સુગર બારદાન 50kg\n🐄 જાડુ ભુસુ – ₹2450.00 / 39kg Bag \n━━━━━━━━━━━━━━━━━━\n\n🏭 જય અંબે  ઇન્ડસ્ટ્રીઝ – વિસનગર\n🐄 કપાસિયા ખોળ – ₹1625.00 / સુગર બારદાન 50kg\n🐄 જીણું ભુસુ – ₹1980.00 / 49kg Bag\n━━━━━━━━━━━━━━━━━━\n\n🏭 ભગવતી મિલ – ભાયલા\n🐄 કપાસિયા ખોળ – ₹1675.00 / સુગર બારદાન 50kg\n🐄 જાડુ ભુસુ – ₹2480.00 / 39kg Bag \n━━━━━━━━━━━━━━━━━━	PENDING	\N	2026-03-03 12:28:46.928663	GENERAL
4	📊 આજનો બજાર ભાવ અપડેટ\n📅 2026-03-03\n\n🏭 ભાવેશ ઓઇલ  મિલ – હારીજ\n🐄 કપાસિયા ખોળ – ₹1650.00 / સુગર બારદાન 50kg ↑ +50.00\n🐄 જાડુ ભુસુ – ₹2450.00 / 39kg Bag  ↓ -20.00\n━━━━━━━━━━━━━━━━━━\n\n🏭 જય અંબે  ઇન્ડસ્ટ્રીઝ – વિસનગર\n🐄 કપાસિયા ખોળ – ₹1625.00 / સુગર બારદાન 50kg → 0\n🐄 જીણું ભુસુ – ₹1980.00 / 49kg Bag\n━━━━━━━━━━━━━━━━━━\n\n🏭 ભગવતી મિલ – ભાયલા\n🐄 કપાસિયા ખોળ – ₹1675.00 / સુગર બારદાન 50kg\n🐄 જાડુ ભુસુ – ₹2480.00 / 39kg Bag \n━━━━━━━━━━━━━━━━━━	PENDING	\N	2026-03-03 19:58:41.618695	GENERAL
5	━━━━━━━━━━━━━━━━━━\n🟢 UMIYA AGRO DIGITAL PRIVATE LIMITED\nઅરવિંદભાઈ પટેલ – મહેસાણા – 9426501245\n━━━━━━━━━━━━━━━━━━\n\n📊 સવારનો બજાર ભાવ અપડેટ | Morning Market Update\n📅 03 Mar 2026\n🕘 Morning Edition – 09:30 AM\n\n━━━━━━━━━━━━━━━━━━\n\n🏭 ભાવેશ ઓઇલ  મિલ – હારીજ\n🐄 કપાસિયા ખોળ – ₹1650.00 / સુગર બારદાન 50kg ↑ +50.00\n🐄 જાડુ ભુસુ – ₹2450.00 / 39kg Bag  ↓ -20.00\n━━━━━━━━━━━━━━━━━━\n\n🏭 જય અંબે  ઇન્ડસ્ટ્રીઝ – વિસનગર\n🐄 કપાસિયા ખોળ – ₹1625.00 / સુગર બારદાન 50kg → 0\n🐄 જીણું ભુસુ – ₹1980.00 / 49kg Bag\n━━━━━━━━━━━━━━━━━━\n\n🏭 ભગવતી મિલ – ભાયલા\n🐄 કપાસિયા ખોળ – ₹1675.00 / સુગર બારદાન 50kg\n🐄 જાડુ ભુસુ – ₹2480.00 / 39kg Bag \n━━━━━━━━━━━━━━━━━━	PENDING	\N	2026-03-03 20:27:37.798003	GENERAL
6	━━━━━━━━━━━━━━━━━━\n🟢 UMIYA AGRO DIGITAL PRIVATE LIMITED\nઅરવિંદભાઈ પટેલ – મહેસાણા – 9426501245\n━━━━━━━━━━━━━━━━━━\n\n📊 સવારનો બજાર ભાવ અપડેટ | Morning Market Update\n📅 03 Mar 2026\n🕘 Morning Edition – 09:30 AM\n\n━━━━━━━━━━━━━━━━━━\n\n🏭 ભાવેશ ઓઇલ  મિલ – હારીજ\n🐄 કપાસિયા ખોળ – ₹1650.00 / સુગર બારદાન 50kg ↑ +50.00\n🐄 જાડુ ભુસુ – ₹2450.00 / 39kg Bag  ↓ -20.00\n\n━━━━━━━━━━━━━━━━━━\n\n🏭 જય અંબે  ઇન્ડસ્ટ્રીઝ – વિસનગર\n🐄 કપાસિયા ખોળ – ₹1625.00 / સુગર બારદાન 50kg → 0\n🐄 જીણું ભુસુ – ₹1980.00 / 49kg Bag\n\n━━━━━━━━━━━━━━━━━━\n\n🏭 ભગવતી મિલ – ભાયલા\n🐄 કપાસિયા ખોળ – ₹1675.00 / સુગર બારદાન 50kg\n🐄 જાડુ ભુસુ – ₹2480.00 / 39kg Bag \n\n━━━━━━━━━━━━━━━━━━\n📈 બજાર વિશ્લેષણ સેવા | Market Intelligence Service\nUmiya Agro Digital Private Limited\n━━━━━━━━━━━━━━━━━━	PENDING	\N	2026-03-03 20:34:23.570491	GENERAL
7	━━━━━━━━━━━━━━━━━━\n🟢 UMIYA AGRO DIGITAL PRIVATE LIMITED\nઅરવિંદભાઈ પટેલ – મહેસાણા – 9426501245\n━━━━━━━━━━━━━━━━━━\n\n📊 સવારનો બજાર ભાવ અપડેટ | Morning Market Update\n📅 03 Mar 2026\n🕘 Morning Edition – 09:30 AM\n\n━━━━━━━━━━━━━━━━━━\n\n🏭 ભાવેશ ઓઇલ  મિલ – હારીજ\n🐄 કપાસિયા ખોળ – ₹1650.00 / સુગર બારદાન 50kg ↑ +50.00 (3.13%)\n🐄 જાડુ ભુસુ – ₹2450.00 / 39kg Bag  ↓ -20.00 (-0.81%)\n\n━━━━━━━━━━━━━━━━━━\n\n🏭 જય અંબે  ઇન્ડસ્ટ્રીઝ – વિસનગર\n🐄 કપાસિયા ખોળ – ₹1625.00 / સુગર બારદાન 50kg → 0 (0%)\n🐄 જીણું ભુસુ – ₹1980.00 / 49kg Bag\n\n━━━━━━━━━━━━━━━━━━\n\n🏭 ભગવતી મિલ – ભાયલા\n🐄 કપાસિયા ખોળ – ₹1675.00 / સુગર બારદાન 50kg\n🐄 જાડુ ભુસુ – ₹2480.00 / 39kg Bag \n\n━━━━━━━━━━━━━━━━━━\n📈 બજાર વિશ્લેષણ સેવા | Market Intelligence Service\nUmiya Agro Digital Private Limited\n━━━━━━━━━━━━━━━━━━	PENDING	\N	2026-03-03 20:37:47.330364	GENERAL
\.


--
-- TOC entry 5098 (class 0 OID 16608)
-- Dependencies: 222
-- Data for Name: commodities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.commodities (id, name, category, unit, is_active, created_at) FROM stdin;
1	કપાસિયા ખોળ	cattle_feed	સુગર બારદાન 50kg	t	2026-03-03 12:15:07.350377
2	જાડુ ભુસુ	cattle_feed	39kg Bag 	t	2026-03-03 12:15:07.350377
3	જીણું ભુસુ	grain	49kg Bag	t	2026-03-03 12:15:07.350377
4	જીણું ભુસુ	grain	50kg Bag	t	2026-03-03 12:15:07.350377
5	ડી.ઓ.સી (DOC)	oilcake	50kg Bag	t	2026-03-03 12:15:07.350377
6	મિનરલ મિક્સ	supplement	25kg Bag	t	2026-03-03 12:15:07.350377
\.


--
-- TOC entry 5100 (class 0 OID 16619)
-- Dependencies: 224
-- Data for Name: daily_prices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_prices (id, factory_id, commodity_id, price, remarks, price_date, created_at) FROM stdin;
23	2	1	1000.00	\N	2026-03-05	2026-03-05 12:24:21.101085
26	3	1	999.00	\N	2026-03-05	2026-03-05 12:42:29.757188
29	1	1	1000.00	\N	2026-03-05	2026-03-05 12:43:54.707518
30	1	2	999.00	\N	2026-03-05	2026-03-05 12:43:54.714862
31	1	5	987.00	987	2026-03-05	2026-03-05 13:38:35.137873
\.


--
-- TOC entry 5096 (class 0 OID 16597)
-- Dependencies: 220
-- Data for Name: factories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.factories (id, name, city, contact_number, is_active, created_at) FROM stdin;
1	ભાવેશ ઓઇલ  મિલ	હારીજ	9825011111	t	2026-03-03 12:09:04.502039
2	જય અંબે  ઇન્ડસ્ટ્રીઝ	વિસનગર	9825011111	t	2026-03-03 12:09:04.502039
3	ભગવતી મિલ	ભાયલા	9825011111	t	2026-03-03 12:09:04.502039
\.


--
-- TOC entry 5105 (class 0 OID 16681)
-- Dependencies: 229
-- Data for Name: final_message; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.final_message ("?column?") FROM stdin;
━━━━━━━━━━━━━━━━━━\n🟢 UMIYA AGRO DIGITAL PRIVATE LIMITED\nઅરવિંદભાઈ પટેલ – મહેસાણા – 9426501245\n━━━━━━━━━━━━━━━━━━\n\n📊 સવારનો બજાર ભાવ અપડેટ | Morning Market Update\n📅 03 Mar 2026\n🕘 Morning Edition – 09:30 AM\n\n━━━━━━━━━━━━━━━━━━\n\n🏭 ભાવેશ ઓઇલ  મિલ – હારીજ\n🐄 કપાસિયા ખોળ – ₹1650.00 / સુગર બારદાન 50kg ↑ +50.00\n🐄 જાડુ ભુસુ – ₹2450.00 / 39kg Bag  ↓ -20.00\n\n━━━━━━━━━━━━━━━━━━\n\n🏭 જય અંબે  ઇન્ડસ્ટ્રીઝ – વિસનગર\n🐄 કપાસિયા ખોળ – ₹1625.00 / સુગર બારદાન 50kg → 0\n🐄 જીણું ભુસુ – ₹1980.00 / 49kg Bag\n\n━━━━━━━━━━━━━━━━━━\n\n🏭 ભગવતી મિલ – ભાયલા\n🐄 કપાસિયા ખોળ – ₹1675.00 / સુગર બારદાન 50kg\n🐄 જાડુ ભુસુ – ₹2480.00 / 39kg Bag \n\n━━━━━━━━━━━━━━━━━━\n📈 બજાર વિશ્લેષણ સેવા | Market Intelligence Service\nUmiya Agro Digital Private Limited\n━━━━━━━━━━━━━━━━━━
\.


--
-- TOC entry 5109 (class 0 OID 16715)
-- Dependencies: 234
-- Data for Name: price_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.price_history (id, factory_id, commodity_id, old_price, new_price, price_date, change_type, changed_at) FROM stdin;
14	2	1	\N	1000.00	2026-03-05	INSERT	2026-03-05 12:24:21.101085
15	3	1	\N	999.00	2026-03-05	INSERT	2026-03-05 12:42:29.757188
16	1	1	\N	1000.00	2026-03-05	INSERT	2026-03-05 12:43:54.707518
17	1	2	\N	999.00	2026-03-05	INSERT	2026-03-05 12:43:54.714862
18	1	5	\N	987.00	2026-03-05	INSERT	2026-03-05 13:38:35.137873
2	1	1	\N	995	2026-03-04	INSERT	2026-03-04 00:00:00
3	1	1	\N	1005	2026-03-04	INSERT	2026-03-04 00:00:00
1	1	1	\N	1005	2026-03-04	INSERT	2026-03-04 00:00:00
\.


--
-- TOC entry 5102 (class 0 OID 16646)
-- Dependencies: 226
-- Data for Name: subscribers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscribers (id, name, mobile, city, is_active, created_at, whatsapp_number, subscribed_at) FROM stdin;
1	Arvind Patel	9664972038	Mehsana	t	2026-03-04 16:20:16.004848	9664972038	2026-03-04 16:20:16.004848
2	Tara Traders	8401330069	Patan	t	2026-03-04 16:20:16.004848	8401330069	2026-03-04 16:20:16.004848
\.


--
-- TOC entry 5107 (class 0 OID 16700)
-- Dependencies: 232
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (id, setting_key, setting_value, description, updated_at) FROM stdin;
1	company_name	Umiya Agro Digital Private Limited	Official company name	2026-03-04 16:48:26.241188
2	broker_name	Arvindbhai Patel	Primary broker contact	2026-03-04 16:48:26.241188
3	broker_city	Mehsana	Broker location	2026-03-04 16:48:26.241188
4	broker_mobile	9426501245	Broker contact number	2026-03-04 16:48:26.241188
5	broadcast_time	09:30	Daily broadcast time	2026-03-04 16:48:26.241188
6	edition_name	Morning Edition	Broadcast edition label	2026-03-04 16:48:26.241188
7	market_region	Gujarat	Commodity market region	2026-03-04 16:48:26.241188
\.


--
-- TOC entry 5123 (class 0 OID 0)
-- Dependencies: 227
-- Name: broadcasts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.broadcasts_id_seq', 7, true);


--
-- TOC entry 5124 (class 0 OID 0)
-- Dependencies: 221
-- Name: commodities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.commodities_id_seq', 6, true);


--
-- TOC entry 5125 (class 0 OID 0)
-- Dependencies: 223
-- Name: daily_prices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.daily_prices_id_seq', 32, true);


--
-- TOC entry 5126 (class 0 OID 0)
-- Dependencies: 219
-- Name: factories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.factories_id_seq', 3, true);


--
-- TOC entry 5127 (class 0 OID 0)
-- Dependencies: 233
-- Name: price_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.price_history_id_seq', 18, true);


--
-- TOC entry 5128 (class 0 OID 0)
-- Dependencies: 225
-- Name: subscribers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subscribers_id_seq', 2, true);


--
-- TOC entry 5129 (class 0 OID 0)
-- Dependencies: 231
-- Name: system_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.system_settings_id_seq', 7, true);


--
-- TOC entry 4937 (class 2606 OID 16670)
-- Name: broadcasts broadcasts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcasts
    ADD CONSTRAINT broadcasts_pkey PRIMARY KEY (id);


--
-- TOC entry 4919 (class 2606 OID 16617)
-- Name: commodities commodities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commodities
    ADD CONSTRAINT commodities_pkey PRIMARY KEY (id);


--
-- TOC entry 4921 (class 2606 OID 16634)
-- Name: daily_prices daily_prices_factory_id_commodity_id_price_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_prices
    ADD CONSTRAINT daily_prices_factory_id_commodity_id_price_date_key UNIQUE (factory_id, commodity_id, price_date);


--
-- TOC entry 4923 (class 2606 OID 16632)
-- Name: daily_prices daily_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_prices
    ADD CONSTRAINT daily_prices_pkey PRIMARY KEY (id);


--
-- TOC entry 4917 (class 2606 OID 16606)
-- Name: factories factories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.factories
    ADD CONSTRAINT factories_pkey PRIMARY KEY (id);


--
-- TOC entry 4943 (class 2606 OID 16726)
-- Name: price_history price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_pkey PRIMARY KEY (id);


--
-- TOC entry 4931 (class 2606 OID 16657)
-- Name: subscribers subscribers_mobile_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscribers
    ADD CONSTRAINT subscribers_mobile_key UNIQUE (mobile);


--
-- TOC entry 4933 (class 2606 OID 16655)
-- Name: subscribers subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscribers
    ADD CONSTRAINT subscribers_pkey PRIMARY KEY (id);


--
-- TOC entry 4939 (class 2606 OID 16711)
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 4941 (class 2606 OID 16713)
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- TOC entry 4935 (class 2606 OID 16689)
-- Name: subscribers unique_whatsapp; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscribers
    ADD CONSTRAINT unique_whatsapp UNIQUE (whatsapp_number);


--
-- TOC entry 4924 (class 1259 OID 16673)
-- Name: idx_daily_prices_commodity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_prices_commodity ON public.daily_prices USING btree (commodity_id);


--
-- TOC entry 4925 (class 1259 OID 16671)
-- Name: idx_daily_prices_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_prices_date ON public.daily_prices USING btree (price_date);


--
-- TOC entry 4926 (class 1259 OID 16672)
-- Name: idx_daily_prices_factory; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_prices_factory ON public.daily_prices USING btree (factory_id);


--
-- TOC entry 4927 (class 1259 OID 16698)
-- Name: idx_price_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_price_date ON public.daily_prices USING btree (price_date);


--
-- TOC entry 4928 (class 1259 OID 16693)
-- Name: idx_price_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_price_lookup ON public.daily_prices USING btree (factory_id, commodity_id, price_date);


--
-- TOC entry 4929 (class 1259 OID 16729)
-- Name: idx_subscriber_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subscriber_active ON public.subscribers USING btree (is_active);


--
-- TOC entry 4946 (class 2620 OID 16728)
-- Name: daily_prices trg_price_history; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_price_history AFTER INSERT OR UPDATE ON public.daily_prices FOR EACH ROW EXECUTE FUNCTION public.log_price_change();


--
-- TOC entry 4944 (class 2606 OID 16640)
-- Name: daily_prices daily_prices_commodity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_prices
    ADD CONSTRAINT daily_prices_commodity_id_fkey FOREIGN KEY (commodity_id) REFERENCES public.commodities(id) ON DELETE CASCADE;


--
-- TOC entry 4945 (class 2606 OID 16635)
-- Name: daily_prices daily_prices_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_prices
    ADD CONSTRAINT daily_prices_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id) ON DELETE CASCADE;


-- Completed on 2026-03-07 17:10:49

--
-- PostgreSQL database dump complete
--

\unrestrict GnnBEGLiCdI4BI3mmBEEAJXIs1BH67cyZ8LADHUpUjKLZ3J0mdjvRRaXYkYy737

