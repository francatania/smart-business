CREATE TABLE platform_user (
    id UUID NOT NULL,
    status VARCHAR(16) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    verified_email VARCHAR(320),
    verified_email_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    last_authenticated_at TIMESTAMPTZ NOT NULL,
    disabled_at TIMESTAMPTZ,
    CONSTRAINT platform_user_pk PRIMARY KEY (id),
    CONSTRAINT platform_user_status_ck CHECK (status IN ('active', 'disabled')),
    CONSTRAINT platform_user_verified_email_ck CHECK (
        (verified_email IS NULL AND verified_email_at IS NULL)
        OR (verified_email IS NOT NULL AND verified_email_at IS NOT NULL)
    ),
    CONSTRAINT platform_user_disabled_ck CHECK (
        (status = 'active' AND disabled_at IS NULL)
        OR (status = 'disabled' AND disabled_at IS NOT NULL)
    )
);

CREATE TABLE external_identity (
    id UUID NOT NULL,
    platform_user_id UUID NOT NULL,
    issuer VARCHAR(512) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    last_authenticated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT external_identity_pk PRIMARY KEY (id),
    CONSTRAINT external_identity_platform_user_fk FOREIGN KEY (platform_user_id)
        REFERENCES platform_user (id),
    CONSTRAINT external_identity_issuer_subject_uk UNIQUE (issuer, subject)
);

CREATE INDEX external_identity_platform_user_ix ON external_identity (platform_user_id);
