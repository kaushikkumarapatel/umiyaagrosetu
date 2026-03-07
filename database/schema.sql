--
-- PostgreSQL database dump
--

\restrict 2SZdW90CetbG61Fgc7xv4kGaa0Ld25r6DmRakm4AaYQWy6wohOfWh6uGt5fh2Va

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

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
-- Name: broadcasts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.broadcasts_id_seq OWNED BY public.broadcasts.id;


--
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
-- Name: commodities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.commodities_id_seq OWNED BY public.commodities.id;


--
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
-- Name: daily_prices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_prices_id_seq OWNED BY public.daily_prices.id;


--
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
-- Name: factories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.factories_id_seq OWNED BY public.factories.id;


--
-- Name: final_message; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.final_message (
    "?column?" text
);


ALTER TABLE public.final_message OWNER TO postgres;

--
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
-- Name: price_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.price_history_id_seq OWNED BY public.price_history.id;


--
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
-- Name: subscribers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscribers_id_seq OWNED BY public.subscribers.id;


--
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
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;


--
-- Name: broadcasts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcasts ALTER COLUMN id SET DEFAULT nextval('public.broadcasts_id_seq'::regclass);


--
-- Name: commodities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commodities ALTER COLUMN id SET DEFAULT nextval('public.commodities_id_seq'::regclass);


--
-- Name: daily_prices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_prices ALTER COLUMN id SET DEFAULT nextval('public.daily_prices_id_seq'::regclass);


--
-- Name: factories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.factories ALTER COLUMN id SET DEFAULT nextval('public.factories_id_seq'::regclass);


--
-- Name: price_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_history ALTER COLUMN id SET DEFAULT nextval('public.price_history_id_seq'::regclass);


--
-- Name: subscribers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscribers ALTER COLUMN id SET DEFAULT nextval('public.subscribers_id_seq'::regclass);


--
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- Name: broadcasts broadcasts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcasts
    ADD CONSTRAINT broadcasts_pkey PRIMARY KEY (id);


--
-- Name: commodities commodities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commodities
    ADD CONSTRAINT commodities_pkey PRIMARY KEY (id);


--
-- Name: daily_prices daily_prices_factory_id_commodity_id_price_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_prices
    ADD CONSTRAINT daily_prices_factory_id_commodity_id_price_date_key UNIQUE (factory_id, commodity_id, price_date);


--
-- Name: daily_prices daily_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_prices
    ADD CONSTRAINT daily_prices_pkey PRIMARY KEY (id);


--
-- Name: factories factories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.factories
    ADD CONSTRAINT factories_pkey PRIMARY KEY (id);


--
-- Name: price_history price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_pkey PRIMARY KEY (id);


--
-- Name: subscribers subscribers_mobile_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscribers
    ADD CONSTRAINT subscribers_mobile_key UNIQUE (mobile);


--
-- Name: subscribers subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscribers
    ADD CONSTRAINT subscribers_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: subscribers unique_whatsapp; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscribers
    ADD CONSTRAINT unique_whatsapp UNIQUE (whatsapp_number);


--
-- Name: idx_daily_prices_commodity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_prices_commodity ON public.daily_prices USING btree (commodity_id);


--
-- Name: idx_daily_prices_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_prices_date ON public.daily_prices USING btree (price_date);


--
-- Name: idx_daily_prices_factory; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_prices_factory ON public.daily_prices USING btree (factory_id);


--
-- Name: idx_price_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_price_date ON public.daily_prices USING btree (price_date);


--
-- Name: idx_price_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_price_lookup ON public.daily_prices USING btree (factory_id, commodity_id, price_date);


--
-- Name: idx_subscriber_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subscriber_active ON public.subscribers USING btree (is_active);


--
-- Name: daily_prices trg_price_history; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_price_history AFTER INSERT OR UPDATE ON public.daily_prices FOR EACH ROW EXECUTE FUNCTION public.log_price_change();


--
-- Name: daily_prices daily_prices_commodity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_prices
    ADD CONSTRAINT daily_prices_commodity_id_fkey FOREIGN KEY (commodity_id) REFERENCES public.commodities(id) ON DELETE CASCADE;


--
-- Name: daily_prices daily_prices_factory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_prices
    ADD CONSTRAINT daily_prices_factory_id_fkey FOREIGN KEY (factory_id) REFERENCES public.factories(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 2SZdW90CetbG61Fgc7xv4kGaa0Ld25r6DmRakm4AaYQWy6wohOfWh6uGt5fh2Va

