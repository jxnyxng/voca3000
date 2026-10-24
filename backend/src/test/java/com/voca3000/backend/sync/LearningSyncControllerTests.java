package com.voca3000.backend.sync;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.voca3000.backend.user.GoogleAccountService;
import com.voca3000.backend.user.GoogleProfile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class LearningSyncControllerTests {
	@Autowired MockMvc mockMvc;
	@Autowired GoogleAccountService accounts;

	@BeforeEach
	void users() {
		accounts.provision(new GoogleProfile("sync-a", "a@example.com", "A", null));
		accounts.provision(new GoogleProfile("sync-b", "b@example.com", "B", null));
	}

	@Test
	void requiresAuthenticationAndCsrf() throws Exception {
		mockMvc.perform(get("/api/sync")).andExpect(status().isUnauthorized());
		mockMvc.perform(put("/api/sync").with(oidcLogin().idToken(t -> t.subject("sync-a")))
			.contentType(MediaType.APPLICATION_JSON).content("{\"progress\":[],\"daySessions\":[]}"))
			.andExpect(status().isForbidden());
	}

	@Test
	void replacesAndIsolatesUserSnapshots() throws Exception {
		String body = """
			{"progress":[{"progressId":"builtin:en:day-1::w0001","contentId":"builtin:en:day-1","wordId":"w0001","isMastered":true,"correctCountKoToEn":1,"incorrectCountKoToEn":0,"correctCountEnToKo":0,"incorrectCountEnToKo":0,"lastStudiedAt":"2026-10-24T00:00:00Z"}],"daySessions":[{"contentId":"builtin:en:day-1","completedStudy":true,"koToEnHighScore":90,"enToKoHighScore":80}]}
			""";
		mockMvc.perform(put("/api/sync").with(csrf()).with(member("sync-a"))
			.contentType(MediaType.APPLICATION_JSON).content(body))
			.andExpect(status().isNoContent());
		mockMvc.perform(get("/api/sync").with(member("sync-a")))
			.andExpect(status().isOk()).andExpect(jsonPath("$.progress[0].wordId").value("w0001"));
		mockMvc.perform(get("/api/sync").with(member("sync-b")))
			.andExpect(status().isOk()).andExpect(jsonPath("$.progress.length()").value(0));
	}

	private org.springframework.test.web.servlet.request.RequestPostProcessor member(String subject) {
		return oidcLogin().idToken(token -> token.subject(subject));
	}
}
