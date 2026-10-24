package com.voca3000.backend.content;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.voca3000.backend.user.GoogleAccountService;
import com.voca3000.backend.user.GoogleProfile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class MemberContentControllerTests {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private GoogleAccountService accounts;

	@BeforeEach
	void createFreeMember() {
		accounts.provision(new GoogleProfile("content-member", "content@example.com", "Content", null));
	}

	@Test
	void rejectsAnonymousContentRequests() throws Exception {
		mockMvc.perform(get("/api/content/english/days"))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void exposesOnlyFreeRangeToFreeMembers() throws Exception {
		mockMvc.perform(get("/api/content/english/days").with(member()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(50))
			.andExpect(jsonPath("$[49].day").value(50));

		mockMvc.perform(get("/api/content/english/days/50").with(member()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(30));

		mockMvc.perform(get("/api/content/english/days/51").with(member()))
			.andExpect(status().isForbidden());
	}

	private org.springframework.test.web.servlet.request.RequestPostProcessor member() {
		return oidcLogin().idToken(token -> token.subject("content-member"));
	}
}
