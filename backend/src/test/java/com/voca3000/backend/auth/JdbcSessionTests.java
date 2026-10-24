package com.voca3000.backend.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;

@SpringBootTest
@AutoConfigureMockMvc
@Import(JdbcSessionTests.SessionProbeController.class)
class JdbcSessionTests {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Test
	void storesHttpSessionsThroughJdbc() throws Exception {
		jdbc.update("DELETE FROM spring_session_attributes");
		jdbc.update("DELETE FROM spring_session");

		mockMvc.perform(get("/api/session-probe")
			.with(SecurityMockMvcRequestPostProcessors.oidcLogin()))
			.andExpect(status().isOk());

		assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM spring_session", Integer.class))
			.isEqualTo(1);
	}

	@RestController
	static class SessionProbeController {
		@GetMapping("/api/session-probe")
		void store(HttpServletRequest request) {
			request.getSession().setAttribute("proof", "stored-in-database");
		}
	}
}
