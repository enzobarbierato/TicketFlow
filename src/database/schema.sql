-- Cria a estrutura do banco de dados para o sistema de tickets

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

    CONSTRAINT fk_users_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tickets (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(30) NOT NULL DEFAULT 'open',

    created_by BIGINT NOT NULL,
    assigned_to BIGINT,

    created_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_on TIMESTAMPTZ,

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
