package com.voca3000.backend.sync;

import java.sql.Timestamp;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LearningSyncService {

	private final JdbcTemplate jdbc;

	public LearningSyncService(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	@Transactional(readOnly = true)
	public LearningSnapshot load(long userId) {
		List<LearningSnapshot.Progress> progress = jdbc.query("""
			SELECT progress_id, content_id, word_id, is_mastered,
			       correct_count_ko_to_en, incorrect_count_ko_to_en,
			       correct_count_en_to_ko, incorrect_count_en_to_ko,
			       last_result_ko_to_en, last_result_en_to_ko, last_studied_at
			FROM learning_progress WHERE user_id = ? ORDER BY progress_id
			""", (rs, row) -> new LearningSnapshot.Progress(
			rs.getString(1), rs.getString(2), rs.getString(3), rs.getBoolean(4),
			rs.getInt(5), rs.getInt(6), rs.getInt(7), rs.getInt(8),
			rs.getString(9), rs.getString(10), rs.getTimestamp(11).toInstant()), userId);
		List<LearningSnapshot.DaySession> sessions = jdbc.query("""
			SELECT content_id, completed_study, ko_to_en_high_score, en_to_ko_high_score,
			       last_attempt_at_ko_to_en, last_attempt_at_en_to_ko
			FROM day_sessions WHERE user_id = ? ORDER BY content_id
			""", (rs, row) -> new LearningSnapshot.DaySession(
			rs.getString(1), rs.getBoolean(2), rs.getInt(3), rs.getInt(4),
			rs.getTimestamp(5) == null ? null : rs.getTimestamp(5).toInstant(),
			rs.getTimestamp(6) == null ? null : rs.getTimestamp(6).toInstant()), userId);
		return new LearningSnapshot(progress, sessions);
	}

	@Transactional
	public void merge(long userId, LearningSnapshot snapshot) {
		validate(snapshot);
		// Serialize syncs for one member so two browser tabs cannot race between UPDATE and INSERT.
		jdbc.queryForObject("SELECT id FROM users WHERE id = ? FOR UPDATE", Long.class, userId);
		var current = load(userId);
		var progressById = current.progress().stream().collect(
			Collectors.toMap(LearningSnapshot.Progress::progressId, Function.identity()));
		var sessionsById = current.daySessions().stream().collect(
			Collectors.toMap(LearningSnapshot.DaySession::contentId, Function.identity()));
		for (var item : snapshot.progress()) mergeProgress(userId, progressById.get(item.progressId()), item);
		for (var item : snapshot.daySessions()) mergeDaySession(userId, sessionsById.get(item.contentId()), item);
	}

	private void mergeProgress(long userId, LearningSnapshot.Progress current, LearningSnapshot.Progress incoming) {
		if (current == null) {
			insertProgress(userId, incoming);
			return;
		}
		var newest = incoming.lastStudiedAt().isAfter(current.lastStudiedAt()) ? incoming : current;
		jdbc.update("""
			UPDATE learning_progress SET content_id = ?, word_id = ?, is_mastered = ?,
			 correct_count_ko_to_en = ?, incorrect_count_ko_to_en = ?,
			 correct_count_en_to_ko = ?, incorrect_count_en_to_ko = ?,
			 last_result_ko_to_en = ?, last_result_en_to_ko = ?, last_studied_at = ?
			WHERE user_id = ? AND progress_id = ?
			""", newest.contentId(), newest.wordId(), newest.isMastered(),
			Math.max(current.correctCountKoToEn(), incoming.correctCountKoToEn()),
			Math.max(current.incorrectCountKoToEn(), incoming.incorrectCountKoToEn()),
			Math.max(current.correctCountEnToKo(), incoming.correctCountEnToKo()),
			Math.max(current.incorrectCountEnToKo(), incoming.incorrectCountEnToKo()),
			newest.lastResultKoToEn(), newest.lastResultEnToKo(), Timestamp.from(newest.lastStudiedAt()),
			userId, incoming.progressId());
	}

	private void insertProgress(long userId, LearningSnapshot.Progress item) {
		jdbc.update("""
			INSERT INTO learning_progress VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			""", userId, item.progressId(), item.contentId(), item.wordId(), item.isMastered(),
			item.correctCountKoToEn(), item.incorrectCountKoToEn(), item.correctCountEnToKo(),
			item.incorrectCountEnToKo(), item.lastResultKoToEn(), item.lastResultEnToKo(),
			Timestamp.from(item.lastStudiedAt()));
	}

	private void mergeDaySession(long userId, LearningSnapshot.DaySession current, LearningSnapshot.DaySession incoming) {
		if (current == null) {
			jdbc.update("INSERT INTO day_sessions VALUES (?, ?, ?, ?, ?, ?, ?)", userId,
				incoming.contentId(), incoming.completedStudy(), incoming.koToEnHighScore(),
				incoming.enToKoHighScore(), timestamp(incoming.lastAttemptAtKoToEn()),
				timestamp(incoming.lastAttemptAtEnToKo()));
			return;
		}
		jdbc.update("""
			UPDATE day_sessions SET completed_study = ?, ko_to_en_high_score = ?,
			 en_to_ko_high_score = ?, last_attempt_at_ko_to_en = ?, last_attempt_at_en_to_ko = ?
			WHERE user_id = ? AND content_id = ?
			""", current.completedStudy() || incoming.completedStudy(),
			Math.max(current.koToEnHighScore(), incoming.koToEnHighScore()),
			Math.max(current.enToKoHighScore(), incoming.enToKoHighScore()),
			timestamp(latest(current.lastAttemptAtKoToEn(), incoming.lastAttemptAtKoToEn())),
			timestamp(latest(current.lastAttemptAtEnToKo(), incoming.lastAttemptAtEnToKo())),
			userId, incoming.contentId());
	}

	private java.time.Instant latest(java.time.Instant first, java.time.Instant second) {
		if (first == null) return second;
		if (second == null) return first;
		return first.isAfter(second) ? first : second;
	}

	private void validate(LearningSnapshot snapshot) {
		if (snapshot == null || snapshot.progress() == null || snapshot.daySessions() == null) fail();
		if (snapshot.progress().size() > 3000 || snapshot.daySessions().size() > 1000) fail();
		for (var item : snapshot.progress()) {
			if (blank(item.progressId()) || blank(item.contentId()) || blank(item.wordId()) || item.lastStudiedAt() == null
				|| item.correctCountKoToEn() < 0 || item.incorrectCountKoToEn() < 0
				|| item.correctCountEnToKo() < 0 || item.incorrectCountEnToKo() < 0
				|| !result(item.lastResultKoToEn()) || !result(item.lastResultEnToKo())) fail();
		}
		for (var item : snapshot.daySessions()) {
			if (blank(item.contentId()) || item.koToEnHighScore() < 0 || item.koToEnHighScore() > 100
				|| item.enToKoHighScore() < 0 || item.enToKoHighScore() > 100) fail();
		}
	}

	private boolean result(String value) { return value == null || value.equals("correct") || value.equals("incorrect"); }
	private boolean blank(String value) { return value == null || value.isBlank(); }
	private Timestamp timestamp(java.time.Instant value) { return value == null ? null : Timestamp.from(value); }
	private void fail() { throw new IllegalArgumentException("Invalid learning snapshot"); }
}
