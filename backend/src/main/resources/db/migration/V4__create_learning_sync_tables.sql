CREATE TABLE learning_progress (
    user_id BIGINT NOT NULL,
    progress_id VARCHAR(600) NOT NULL,
    content_id VARCHAR(300) NOT NULL,
    word_id VARCHAR(255) NOT NULL,
    is_mastered BOOLEAN NOT NULL,
    correct_count_ko_to_en INTEGER NOT NULL,
    incorrect_count_ko_to_en INTEGER NOT NULL,
    correct_count_en_to_ko INTEGER NOT NULL,
    incorrect_count_en_to_ko INTEGER NOT NULL,
    last_result_ko_to_en VARCHAR(20),
    last_result_en_to_ko VARCHAR(20),
    last_studied_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (user_id, progress_id),
    CONSTRAINT fk_learning_progress_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_learning_progress_counts CHECK (
        correct_count_ko_to_en >= 0 AND incorrect_count_ko_to_en >= 0
        AND correct_count_en_to_ko >= 0 AND incorrect_count_en_to_ko >= 0
    ),
    CONSTRAINT ck_learning_progress_ko_result CHECK (last_result_ko_to_en IS NULL OR last_result_ko_to_en IN ('correct', 'incorrect')),
    CONSTRAINT ck_learning_progress_en_result CHECK (last_result_en_to_ko IS NULL OR last_result_en_to_ko IN ('correct', 'incorrect'))
);

CREATE TABLE day_sessions (
    user_id BIGINT NOT NULL,
    content_id VARCHAR(300) NOT NULL,
    completed_study BOOLEAN NOT NULL,
    ko_to_en_high_score INTEGER NOT NULL,
    en_to_ko_high_score INTEGER NOT NULL,
    last_attempt_at_ko_to_en TIMESTAMP WITH TIME ZONE,
    last_attempt_at_en_to_ko TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (user_id, content_id),
    CONSTRAINT fk_day_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_day_sessions_scores CHECK (
        ko_to_en_high_score BETWEEN 0 AND 100 AND en_to_ko_high_score BETWEEN 0 AND 100
    )
);
