-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users
(
    id              UUID PRIMARY KEY             DEFAULT uuid_generate_v4(),
    urn             VARCHAR(20) UNIQUE  NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    full_name       VARCHAR(255)        NOT NULL,
    password_hash   VARCHAR(255)        NOT NULL,
    refresh_token   TEXT,
    role            VARCHAR(20)         NOT NULL DEFAULT 'student',
    created_at      TIMESTAMP WITH TIME ZONE     DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE     DEFAULT CURRENT_TIMESTAMP
);

-- Subjects table
CREATE TABLE subjects
(
    id              UUID PRIMARY KEY         DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    domain          VARCHAR(255) NOT NULL,
    education_level VARCHAR(50)  NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Topics table
CREATE TABLE topics
(
    id         UUID PRIMARY KEY         DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects (id) ON DELETE CASCADE,
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Questions bank
CREATE TABLE questions
(
    id               UUID PRIMARY KEY         DEFAULT uuid_generate_v4(),
    topic_id         UUID REFERENCES topics (id) ON DELETE CASCADE,
    question_text    TEXT        NOT NULL,
    options          TEXT[]     NOT NULL, -- Array of strings with index as optionId
    correct_answer   INTEGER     NOT NULL,
    difficulty_level VARCHAR(20) NOT NULL,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by       UUID REFERENCES users (id)
);

-- Tests table
CREATE TABLE tests
(
    id              UUID PRIMARY KEY         DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    test_type       VARCHAR(50)  NOT NULL, -- GATE, CET, COMPANY_SPECIFIC, CUSTOM
    company_name    VARCHAR(255),          -- For company-specific tests
    duration        INTEGER      NOT NULL, -- in seconds
    total_questions INTEGER      NOT NULL,
    education_level VARCHAR(50)  NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP WITH TIME ZONE
);

-- Test Questions mapping
CREATE TABLE test_questions
(
    id              UUID PRIMARY KEY         DEFAULT uuid_generate_v4(),
    test_id         UUID REFERENCES tests (id) ON DELETE CASCADE,
    question_id     UUID REFERENCES questions (id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    marks           INTEGER                  DEFAULT 1,
    negative_marks  DECIMAL(3, 1)            DEFAULT 0.0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMPf
);

-- Test Attempts
CREATE TABLE test_attempts
(
    id              UUID PRIMARY KEY         DEFAULT uuid_generate_v4(),
    test_id         UUID REFERENCES tests (id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users (id) ON DELETE CASCADE,
    start_time      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time        TIMESTAMP WITH TIME ZONE,
    score           DECIMAL(5, 2),
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER,
    status          VARCHAR(20)              DEFAULT 'in_progress', -- in_progress, completed, abandoned
    tab_switches    INTEGER                  DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Answers
CREATE TABLE user_answers
(
    id              UUID PRIMARY KEY         DEFAULT uuid_generate_v4(),
    attempt_id      UUID REFERENCES test_attempts (id) ON DELETE CASCADE,
    question_id     UUID REFERENCES questions (id) ON DELETE CASCADE,
    selected_option INTEGER,
    is_correct      BOOLEAN,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Study Groups
CREATE TABLE study_groups
(
    id          UUID PRIMARY KEY         DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    created_by  UUID REFERENCES users (id),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Group Members
CREATE TABLE group_members
(
    id        UUID PRIMARY KEY         DEFAULT uuid_generate_v4(),
    group_id  UUID REFERENCES study_groups (id) ON DELETE CASCADE,
    user_id   UUID REFERENCES users (id) ON DELETE CASCADE,
    role      VARCHAR(20)              DEFAULT 'member', -- admin, member
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_questions_topic ON questions (topic_id);
CREATE INDEX idx_test_questions_test ON test_questions (test_id);
CREATE INDEX idx_test_attempts_user ON test_attempts (user_id);
CREATE INDEX idx_test_attempts_test ON test_attempts (test_id);
CREATE INDEX idx_user_answers_attempt ON user_answers (attempt_id);
CREATE INDEX idx_topics_subject ON topics (subject_id);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
