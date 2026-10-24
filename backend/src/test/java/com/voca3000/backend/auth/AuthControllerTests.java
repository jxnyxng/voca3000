package com.voca3000.backend.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.voca3000.backend.user.GoogleAccountService;
import com.voca3000.backend.user.GoogleProfile;
import com.voca3000.backend.user.SocialAccountRepository;
import com.voca3000.backend.user.UserAccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerTests {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private GoogleAccountService googleAccountService;

	@Autowired
	private UserAccountRepository userAccountRepository;

	@Autowired
	private SocialAccountRepository socialAccountRepository;

	@Test
	void returnsAnonymousStateWithoutRedirectingToLogin() throws Exception {
		mockMvc.perform(get("/api/me"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.authenticated").value(false))
			.andExpect(jsonPath("$.user").doesNotExist());
	}

	@Test
	void returnsInternalMemberForAuthenticatedGoogleSubject() throws Exception {
		googleAccountService.provision(new GoogleProfile(
			"subject-for-api",
			"member@example.com",
			"Member",
			null));

		mockMvc.perform(get("/api/me").with(oidcLogin()
			.idToken(token -> token
				.subject("subject-for-api")
				.claim("email", "member@example.com"))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.authenticated").value(true))
			.andExpect(jsonPath("$.user.email").value("member@example.com"))
			.andExpect(jsonPath("$.user.displayName").value("Member"));
	}

	@Test
	void returnsUnauthorizedForProtectedApi() throws Exception {
		mockMvc.perform(get("/api/protected-test"))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void exposesCsrfTokenAndRequiresItForLogout() throws Exception {
		mockMvc.perform(get("/api/csrf"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.headerName").value("X-XSRF-TOKEN"))
			.andExpect(jsonPath("$.token").isNotEmpty());

		mockMvc.perform(post("/api/logout"))
			.andExpect(status().isForbidden());

		mockMvc.perform(post("/api/logout").with(csrf()))
			.andExpect(status().isNoContent());
	}

	@Test
	void requiresAuthenticationAndCsrfThenDeletesServerAccount() throws Exception {
		googleAccountService.provision(new GoogleProfile(
			"subject-to-delete",
			"delete@example.com",
			"Delete Me",
			null));

		mockMvc.perform(delete("/api/me"))
			.andExpect(status().isForbidden());

		mockMvc.perform(delete("/api/me").with(oidcLogin()
			.idToken(token -> token.subject("subject-to-delete"))))
			.andExpect(status().isForbidden());

		mockMvc.perform(delete("/api/me")
			.with(oidcLogin().idToken(token -> token.subject("subject-to-delete")))
			.with(csrf()))
			.andExpect(status().isNoContent())
			.andExpect(cookie().maxAge("JSESSIONID", 0));

		assertThat(userAccountRepository.count()).isZero();
		assertThat(socialAccountRepository.count()).isZero();
	}
}
