






CREATE TABLE public.academic_year (
    id integer NOT NULL,
    name character varying(20) NOT NULL,
    start_year integer NOT NULL,
    end_year integer NOT NULL,
    start_month smallint DEFAULT '9'::smallint NOT NULL,
    end_month smallint DEFAULT '6'::smallint NOT NULL,
    is_current boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0) NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0),
    deleted_at timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL
);



CREATE SEQUENCE public.academic_year_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.academic_year_id_seq OWNED BY public.academic_year.id;



CREATE TABLE public.grade (
    level smallint NOT NULL,
    section character varying(50) NOT NULL,
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0) NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0),
    deleted_at timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL
);



CREATE SEQUENCE public.grade_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.grade_id_seq OWNED BY public.grade.id;



CREATE TABLE public.lesson_material (
    file_url text NOT NULL,
    original_name character varying(255) NOT NULL,
    file_size bigint NOT NULL,
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0),
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0),
    deleted_at timestamp with time zone,
    is_deleted boolean NOT NULL,
    lesson_plan_id integer NOT NULL
);



CREATE SEQUENCE public.lesson_material_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.lesson_material_id_seq OWNED BY public.lesson_material.id;



CREATE TABLE public.lesson_plan (
    id integer NOT NULL,
    schedule_entry_id integer,
    plan_date date NOT NULL,
    topic text,
    lesson_type character varying(30),
    objectives jsonb,
    keywords jsonb,
    homework text,
    homework_deadline date,
    stages jsonb,
    resources jsonb,
    assessment_methods jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL,
    homework_test_id integer,
    homework_test_title character varying(200)
);



CREATE SEQUENCE public.lesson_plan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.lesson_plan_id_seq OWNED BY public.lesson_plan.id;



CREATE TABLE public.lesson_session (
    id integer NOT NULL,
    schedule_entry_id integer,
    session_date date NOT NULL,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    status character varying(20) DEFAULT 'in_progress'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0),
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0),
    deleted_at timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL,
    lesson_plan_id integer
);



CREATE SEQUENCE public.lesson_session_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.lesson_session_id_seq OWNED BY public.lesson_session.id;



CREATE TABLE public.parent_auth (
    id integer NOT NULL,
    phone character varying(20) NOT NULL,
    hashed_password character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0) NOT NULL
);



CREATE SEQUENCE public.parent_auth_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.parent_auth_id_seq OWNED BY public.parent_auth.id;



CREATE TABLE public.quarter (
    id integer NOT NULL,
    academic_year_id integer NOT NULL,
    number smallint NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL,
    holidays date[] DEFAULT '{}'::date[] NOT NULL
);



CREATE SEQUENCE public.quarter_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.quarter_id_seq OWNED BY public.quarter.id;



CREATE TABLE public.refresh_token (
    id integer NOT NULL,
    subject character varying(64) NOT NULL,
    role character varying(20),
    family_id uuid NOT NULL,
    jti uuid NOT NULL,
    used_at timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0) NOT NULL
);



CREATE SEQUENCE public.refresh_token_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.refresh_token_id_seq OWNED BY public.refresh_token.id;



CREATE TABLE public.schedule_entry (
    id integer NOT NULL,
    academic_year_id integer NOT NULL,
    grade_id integer NOT NULL,
    subject_id integer NOT NULL,
    teacher_id integer NOT NULL,
    time_slot_id integer NOT NULL,
    day_of_week smallint NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0) NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0),
    deleted_at timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL,
    room character varying(20)
);



CREATE SEQUENCE public.schedule_entry_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.schedule_entry_id_seq OWNED BY public.schedule_entry.id;



CREATE TABLE public.school_settings (
    id integer NOT NULL,
    lesson_duration_minutes smallint DEFAULT '45'::smallint NOT NULL,
    short_break_minutes smallint DEFAULT '10'::smallint NOT NULL,
    long_break_minutes smallint DEFAULT '25'::smallint NOT NULL,
    long_break_after_period smallint DEFAULT '3'::smallint NOT NULL,
    periods_per_day smallint DEFAULT '6'::smallint NOT NULL,
    working_days smallint[] DEFAULT '{1,2,3,4,5,6}'::smallint[] NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0) NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0),
    deleted_at timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL,
    day_start_time character varying(5) DEFAULT '08:00'::character varying NOT NULL,
    day_end_time character varying(5) DEFAULT '16:00'::character varying NOT NULL,
    default_break_minutes smallint DEFAULT 5 NOT NULL,
    breaks json DEFAULT '[]'::json NOT NULL
);



CREATE SEQUENCE public.school_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.school_settings_id_seq OWNED BY public.school_settings.id;



CREATE TABLE public.session_assessment (
    id integer NOT NULL,
    lesson_session_id integer NOT NULL,
    student_id integer NOT NULL,
    knowing smallint,
    applying smallint,
    reasoning smallint,
    marked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0) NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0),
    deleted_at timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL,
    CONSTRAINT ck_applying_range CHECK (((applying IS NULL) OR ((applying >= 0) AND (applying <= 4)))),
    CONSTRAINT ck_knowing_range CHECK (((knowing IS NULL) OR ((knowing >= 0) AND (knowing <= 4)))),
    CONSTRAINT ck_reasoning_range CHECK (((reasoning IS NULL) OR ((reasoning >= 0) AND (reasoning <= 2))))
);



CREATE SEQUENCE public.session_assessment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.session_assessment_id_seq OWNED BY public.session_assessment.id;



CREATE TABLE public.session_attendance (
    id integer NOT NULL,
    lesson_session_id integer NOT NULL,
    student_id integer NOT NULL,
    status character varying(20) DEFAULT 'unmarked'::character varying NOT NULL,
    marked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0),
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0),
    deleted_at timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL
);



CREATE SEQUENCE public.session_attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.session_attendance_id_seq OWNED BY public.session_attendance.id;



CREATE TABLE public.subject (
    name character varying(100) NOT NULL,
    name_uz character varying(100),
    icon character varying(50),
    color character varying(7),
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0) NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0),
    deleted_at timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL
);



CREATE SEQUENCE public.subject_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.subject_id_seq OWNED BY public.subject.id;



CREATE TABLE public.sync_log (
    id integer NOT NULL,
    synced_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0) NOT NULL,
    status character varying(20) DEFAULT 'success'::character varying NOT NULL,
    stats jsonb,
    error_message text,
    triggered_by character varying(50) DEFAULT 'manual'::character varying NOT NULL
);



CREATE SEQUENCE public.sync_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.sync_log_id_seq OWNED BY public.sync_log.id;



CREATE TABLE public.time_slot (
    id integer NOT NULL,
    academic_year_id integer NOT NULL,
    period_number smallint NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0) NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0),
    deleted_at timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL
);



CREATE SEQUENCE public.time_slot_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.time_slot_id_seq OWNED BY public.time_slot.id;



CREATE TABLE public."user" (
    document_id character varying(20) NOT NULL,
    phone_number character varying(20),
    hashed_password character varying(255),
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    birth_date date,
    photo_url text,
    role character varying(20) NOT NULL,
    is_active boolean NOT NULL,
    is_superuser boolean NOT NULL,
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0) NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP(0),
    deleted_at timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL,
    gender character varying(10),
    student_id character varying(20),
    grade_id integer,
    father_phone character varying(20),
    mother_phone character varying(20),
    address text,
    enrollment_date date,
    middle_name character varying(50),
    father_first_name character varying(50),
    father_last_name character varying(50),
    mother_first_name character varying(50),
    mother_last_name character varying(50),
    withdrawal_date date,
    is_frozen boolean DEFAULT false NOT NULL,
    frozen_at date,
    frozen_reason text,
    departure_date date,
    return_date date,
    subjects jsonb,
    class_teacher_grade_id integer,
    teaching_grade_ids jsonb
);



COMMENT ON COLUMN public."user".teaching_grade_ids IS 'Dars beradigan sinflar ID ro''yxati';



CREATE SEQUENCE public.user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.user_id_seq OWNED BY public."user".id;



ALTER TABLE ONLY public.academic_year ALTER COLUMN id SET DEFAULT nextval('public.academic_year_id_seq'::regclass);



ALTER TABLE ONLY public.grade ALTER COLUMN id SET DEFAULT nextval('public.grade_id_seq'::regclass);



ALTER TABLE ONLY public.lesson_material ALTER COLUMN id SET DEFAULT nextval('public.lesson_material_id_seq'::regclass);



ALTER TABLE ONLY public.lesson_plan ALTER COLUMN id SET DEFAULT nextval('public.lesson_plan_id_seq'::regclass);



ALTER TABLE ONLY public.lesson_session ALTER COLUMN id SET DEFAULT nextval('public.lesson_session_id_seq'::regclass);



ALTER TABLE ONLY public.parent_auth ALTER COLUMN id SET DEFAULT nextval('public.parent_auth_id_seq'::regclass);



ALTER TABLE ONLY public.quarter ALTER COLUMN id SET DEFAULT nextval('public.quarter_id_seq'::regclass);



ALTER TABLE ONLY public.refresh_token ALTER COLUMN id SET DEFAULT nextval('public.refresh_token_id_seq'::regclass);



ALTER TABLE ONLY public.schedule_entry ALTER COLUMN id SET DEFAULT nextval('public.schedule_entry_id_seq'::regclass);



ALTER TABLE ONLY public.school_settings ALTER COLUMN id SET DEFAULT nextval('public.school_settings_id_seq'::regclass);



ALTER TABLE ONLY public.session_assessment ALTER COLUMN id SET DEFAULT nextval('public.session_assessment_id_seq'::regclass);



ALTER TABLE ONLY public.session_attendance ALTER COLUMN id SET DEFAULT nextval('public.session_attendance_id_seq'::regclass);



ALTER TABLE ONLY public.subject ALTER COLUMN id SET DEFAULT nextval('public.subject_id_seq'::regclass);



ALTER TABLE ONLY public.sync_log ALTER COLUMN id SET DEFAULT nextval('public.sync_log_id_seq'::regclass);



ALTER TABLE ONLY public.time_slot ALTER COLUMN id SET DEFAULT nextval('public.time_slot_id_seq'::regclass);



ALTER TABLE ONLY public."user" ALTER COLUMN id SET DEFAULT nextval('public.user_id_seq'::regclass);



ALTER TABLE ONLY public.academic_year
    ADD CONSTRAINT academic_year_name_key UNIQUE (name);



ALTER TABLE ONLY public.academic_year
    ADD CONSTRAINT academic_year_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.grade
    ADD CONSTRAINT grade_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.lesson_material
    ADD CONSTRAINT lesson_material_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.lesson_plan
    ADD CONSTRAINT lesson_plan_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.lesson_session
    ADD CONSTRAINT lesson_session_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.parent_auth
    ADD CONSTRAINT parent_auth_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.quarter
    ADD CONSTRAINT quarter_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.refresh_token
    ADD CONSTRAINT refresh_token_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.schedule_entry
    ADD CONSTRAINT schedule_entry_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.school_settings
    ADD CONSTRAINT school_settings_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.session_assessment
    ADD CONSTRAINT session_assessment_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.session_attendance
    ADD CONSTRAINT session_attendance_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.subject
    ADD CONSTRAINT subject_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.sync_log
    ADD CONSTRAINT sync_log_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.time_slot
    ADD CONSTRAINT time_slot_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.quarter
    ADD CONSTRAINT uq_quarter_year_number UNIQUE (academic_year_id, number);



ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);



CREATE INDEX ix_academic_year_is_current ON public.academic_year USING btree (is_current);



CREATE INDEX ix_academic_year_is_deleted ON public.academic_year USING btree (is_deleted);



CREATE INDEX ix_academic_year_name ON public.academic_year USING btree (name);



CREATE INDEX ix_academic_year_start_year ON public.academic_year USING btree (start_year);



CREATE INDEX ix_grade_is_deleted ON public.grade USING btree (is_deleted);



CREATE INDEX ix_grade_level ON public.grade USING btree (level);



CREATE INDEX ix_grade_level_section ON public.grade USING btree (level, section);



CREATE INDEX ix_lesson_material_is_deleted ON public.lesson_material USING btree (is_deleted);



CREATE INDEX ix_lesson_material_lesson_plan_id ON public.lesson_material USING btree (lesson_plan_id);



CREATE INDEX ix_lesson_plan_is_deleted ON public.lesson_plan USING btree (is_deleted);



CREATE INDEX ix_lesson_plan_schedule_entry_id ON public.lesson_plan USING btree (schedule_entry_id);



CREATE INDEX ix_lesson_session_is_deleted ON public.lesson_session USING btree (is_deleted);



CREATE INDEX ix_lesson_session_lesson_plan_id ON public.lesson_session USING btree (lesson_plan_id);



CREATE INDEX ix_lesson_session_schedule_entry_id ON public.lesson_session USING btree (schedule_entry_id);



CREATE UNIQUE INDEX ix_parent_auth_phone ON public.parent_auth USING btree (phone);



CREATE INDEX ix_quarter_academic_year_id ON public.quarter USING btree (academic_year_id);



CREATE INDEX ix_refresh_token_expires_at ON public.refresh_token USING btree (expires_at);



CREATE INDEX ix_refresh_token_family_id ON public.refresh_token USING btree (family_id);



CREATE UNIQUE INDEX ix_refresh_token_jti ON public.refresh_token USING btree (jti);



CREATE INDEX ix_refresh_token_subject ON public.refresh_token USING btree (subject);



CREATE INDEX ix_schedule_entry_academic_year_id ON public.schedule_entry USING btree (academic_year_id);



CREATE INDEX ix_schedule_entry_grade_id ON public.schedule_entry USING btree (grade_id);



CREATE INDEX ix_schedule_entry_is_deleted ON public.schedule_entry USING btree (is_deleted);



CREATE INDEX ix_schedule_entry_subject_id ON public.schedule_entry USING btree (subject_id);



CREATE INDEX ix_schedule_entry_teacher_id ON public.schedule_entry USING btree (teacher_id);



CREATE INDEX ix_schedule_entry_time_slot_id ON public.schedule_entry USING btree (time_slot_id);



CREATE INDEX ix_school_settings_is_deleted ON public.school_settings USING btree (is_deleted);



CREATE INDEX ix_session_assessment_is_deleted ON public.session_assessment USING btree (is_deleted);



CREATE INDEX ix_session_assessment_lesson_session_id ON public.session_assessment USING btree (lesson_session_id);



CREATE INDEX ix_session_assessment_student_id ON public.session_assessment USING btree (student_id);



CREATE INDEX ix_session_attendance_is_deleted ON public.session_attendance USING btree (is_deleted);



CREATE INDEX ix_session_attendance_lesson_session_id ON public.session_attendance USING btree (lesson_session_id);



CREATE INDEX ix_session_attendance_student_id ON public.session_attendance USING btree (student_id);



CREATE INDEX ix_subject_is_deleted ON public.subject USING btree (is_deleted);



CREATE UNIQUE INDEX ix_subject_name ON public.subject USING btree (name);



CREATE INDEX ix_time_slot_academic_year_id ON public.time_slot USING btree (academic_year_id);



CREATE INDEX ix_time_slot_is_deleted ON public.time_slot USING btree (is_deleted);



CREATE UNIQUE INDEX ix_time_slot_year_period ON public.time_slot USING btree (academic_year_id, period_number);



CREATE INDEX ix_user_class_teacher_grade_id ON public."user" USING btree (class_teacher_grade_id);



CREATE UNIQUE INDEX ix_user_document_id ON public."user" USING btree (document_id);



CREATE INDEX ix_user_grade_id ON public."user" USING btree (grade_id);



CREATE INDEX ix_user_is_active ON public."user" USING btree (is_active);



CREATE INDEX ix_user_is_deleted ON public."user" USING btree (is_deleted);



CREATE INDEX ix_user_is_frozen ON public."user" USING btree (is_frozen);



CREATE INDEX ix_user_phone_number ON public."user" USING btree (phone_number);



CREATE UNIQUE INDEX ix_user_phone_number_unique ON public."user" USING btree (phone_number) WHERE ((phone_number IS NOT NULL) AND (is_deleted = false));



CREATE INDEX ix_user_role ON public."user" USING btree (role);



CREATE INDEX ix_user_role_active_deleted ON public."user" USING btree (role, is_active, is_deleted);



CREATE UNIQUE INDEX ix_user_student_id ON public."user" USING btree (student_id);



CREATE UNIQUE INDEX uq_assessment_session_student ON public.session_assessment USING btree (lesson_session_id, student_id) WHERE (is_deleted = false);



CREATE UNIQUE INDEX uq_attendance_session_student ON public.session_attendance USING btree (lesson_session_id, student_id) WHERE (is_deleted = false);



CREATE UNIQUE INDEX uq_lesson_plan_entry_date ON public.lesson_plan USING btree (schedule_entry_id, plan_date) WHERE (is_deleted = false);



CREATE UNIQUE INDEX uq_lesson_session_entry_date ON public.lesson_session USING btree (schedule_entry_id, session_date) WHERE (is_deleted = false);



CREATE UNIQUE INDEX uq_schedule_grade_day_slot ON public.schedule_entry USING btree (grade_id, day_of_week, time_slot_id, academic_year_id) WHERE (is_deleted = false);



CREATE UNIQUE INDEX uq_schedule_teacher_day_slot ON public.schedule_entry USING btree (teacher_id, day_of_week, time_slot_id, academic_year_id) WHERE (is_deleted = false);



ALTER TABLE ONLY public.lesson_material
    ADD CONSTRAINT lesson_material_lesson_plan_id_fkey FOREIGN KEY (lesson_plan_id) REFERENCES public.lesson_plan(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.lesson_plan
    ADD CONSTRAINT lesson_plan_schedule_entry_id_fkey FOREIGN KEY (schedule_entry_id) REFERENCES public.schedule_entry(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.lesson_session
    ADD CONSTRAINT lesson_session_lesson_plan_id_fkey FOREIGN KEY (lesson_plan_id) REFERENCES public.lesson_plan(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.lesson_session
    ADD CONSTRAINT lesson_session_schedule_entry_id_fkey FOREIGN KEY (schedule_entry_id) REFERENCES public.schedule_entry(id) ON DELETE SET NULL;



ALTER TABLE ONLY public.quarter
    ADD CONSTRAINT quarter_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_year(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.schedule_entry
    ADD CONSTRAINT schedule_entry_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_year(id);



ALTER TABLE ONLY public.schedule_entry
    ADD CONSTRAINT schedule_entry_grade_id_fkey FOREIGN KEY (grade_id) REFERENCES public.grade(id);



ALTER TABLE ONLY public.schedule_entry
    ADD CONSTRAINT schedule_entry_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subject(id);



ALTER TABLE ONLY public.schedule_entry
    ADD CONSTRAINT schedule_entry_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public."user"(id);



ALTER TABLE ONLY public.schedule_entry
    ADD CONSTRAINT schedule_entry_time_slot_id_fkey FOREIGN KEY (time_slot_id) REFERENCES public.time_slot(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.session_assessment
    ADD CONSTRAINT session_assessment_lesson_session_id_fkey FOREIGN KEY (lesson_session_id) REFERENCES public.lesson_session(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.session_assessment
    ADD CONSTRAINT session_assessment_student_id_fkey FOREIGN KEY (student_id) REFERENCES public."user"(id);



ALTER TABLE ONLY public.session_attendance
    ADD CONSTRAINT session_attendance_lesson_session_id_fkey FOREIGN KEY (lesson_session_id) REFERENCES public.lesson_session(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.session_attendance
    ADD CONSTRAINT session_attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public."user"(id);



ALTER TABLE ONLY public.time_slot
    ADD CONSTRAINT time_slot_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_year(id);



ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_class_teacher_grade_id_fkey FOREIGN KEY (class_teacher_grade_id) REFERENCES public.grade(id) ON DELETE SET NULL;



ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_grade_id_fkey FOREIGN KEY (grade_id) REFERENCES public.grade(id) ON DELETE SET NULL;




