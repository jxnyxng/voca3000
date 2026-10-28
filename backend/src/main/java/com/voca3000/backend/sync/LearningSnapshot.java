package com.voca3000.backend.sync;

import java.time.Instant;
import java.util.List;

public record LearningSnapshot(List<Progress> progress, List<DaySession> daySessions) {

	public record Progress(
		String progressId, String contentId, String wordId, boolean isMastered, Boolean isFavorite,
		int correctCountKoToEn, int incorrectCountKoToEn,
		int correctCountEnToKo, int incorrectCountEnToKo,
		String lastResultKoToEn, String lastResultEnToKo, Instant lastStudiedAt
	) {
	}

	public record DaySession(
		String contentId, boolean completedStudy, int koToEnHighScore, int enToKoHighScore,
		Instant lastAttemptAtKoToEn, Instant lastAttemptAtEnToKo
	) {
	}
}
