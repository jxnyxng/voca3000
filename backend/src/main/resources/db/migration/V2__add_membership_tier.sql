ALTER TABLE users
    ADD COLUMN membership_tier VARCHAR(20) NOT NULL DEFAULT 'FREE';

ALTER TABLE users
    ADD CONSTRAINT ck_users_membership_tier
        CHECK (membership_tier IN ('FREE', 'PREMIUM'));
