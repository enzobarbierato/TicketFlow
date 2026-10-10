CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    department VARCHAR(100) NOT NULL,
    job_title VARCHAR(100) NOT NULL,
    created_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT,
    role VARCHAR(20) NOT NULL DEFAULT 'user',

    CONSTRAINT chk_users_role
        CHECK (role IN ('user', 'support', 'manager')),

    CONSTRAINT fk_users_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_on TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_name_ci
ON categories (LOWER(name));

CREATE TABLE IF NOT EXISTS tickets (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    category_id BIGINT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(30) NOT NULL DEFAULT 'open',

    created_by BIGINT NOT NULL,
    assigned_to BIGINT,

    created_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_on TIMESTAMPTZ,

    CONSTRAINT chk_tickets_priority
        CHECK (priority IN ('low', 'medium', 'high', 'critical')),

    CONSTRAINT chk_tickets_status
        CHECK (
            status IN (
                'open',
                'in_progress',
                'waiting_user',
                'resolved',
                'closed'
            )
        ),

    CONSTRAINT fk_tickets_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id),

    CONSTRAINT fk_tickets_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id),

    CONSTRAINT fk_tickets_assigned_to
        FOREIGN KEY (assigned_to)
        REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    message TEXT NOT NULL,
    created_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ticket_messages_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ticket_messages_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
    sid VARCHAR NOT NULL,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL,

    CONSTRAINT user_sessions_pkey
        PRIMARY KEY (sid)
);

CREATE TABLE IF NOT EXISTS ticket_history (
    id BIGSERIAL PRIMARY KEY,

    ticket_id BIGINT NOT NULL,
    performed_by BIGINT NOT NULL,

    event_type VARCHAR(30) NOT NULL,

    from_user_id BIGINT,
    to_user_id BIGINT,

    old_value VARCHAR(100),
    new_value VARCHAR(100),

    created_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_ticket_history_event_type
        CHECK (
            event_type IN (
                'created',
                'assigned',
                'reassigned',
                'status_changed',
                'priority_changed'
            )
        ),

    CONSTRAINT fk_ticket_history_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ticket_history_performed_by
        FOREIGN KEY (performed_by)
        REFERENCES users(id),

    CONSTRAINT fk_ticket_history_from_user
        FOREIGN KEY (from_user_id)
        REFERENCES users(id),

    CONSTRAINT fk_ticket_history_to_user
        FOREIGN KEY (to_user_id)
        REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket
    ON ticket_history (ticket_id);

CREATE INDEX IF NOT EXISTS idx_ticket_history_performed_by
    ON ticket_history (performed_by);

CREATE INDEX IF NOT EXISTS idx_ticket_history_created_on
    ON ticket_history (created_on);

CREATE INDEX IF NOT EXISTS idx_user_sessions_expire
    ON user_sessions (expire);