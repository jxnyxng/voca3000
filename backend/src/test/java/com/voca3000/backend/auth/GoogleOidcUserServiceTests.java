package com.voca3000.backend.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.voca3000.backend.user.GoogleAccountService;
import com.voca3000.backend.user.GoogleProfile;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

class GoogleOidcUserServiceTests {

	private final OAuth2UserService<OidcUserRequest, OidcUser> delegate = mock();
	private final GoogleAccountService accountService = mock();
	private final GoogleOidcUserService service = new GoogleOidcUserService(delegate, accountService);
	private final OidcUserRequest request = mock();
	private final OidcUser oidcUser = mock();

	@Test
	void provisionsVerifiedGoogleProfileUsingSubjectAsIdentity() {
		when(delegate.loadUser(request)).thenReturn(oidcUser);
		when(oidcUser.getClaimAsBoolean("email_verified")).thenReturn(true);
		when(oidcUser.getSubject()).thenReturn("google-subject");
		when(oidcUser.getEmail()).thenReturn("user@example.com");
		when(oidcUser.getFullName()).thenReturn("Test User");
		when(oidcUser.getPicture()).thenReturn("https://example.com/avatar.png");

		assertThat(service.loadUser(request)).isSameAs(oidcUser);
		verify(accountService).provision(new GoogleProfile(
			"google-subject",
			"user@example.com",
			"Test User",
			"https://example.com/avatar.png"));
	}

	@Test
	void rejectsUnverifiedEmailBeforeWritingAccount() {
		when(delegate.loadUser(request)).thenReturn(oidcUser);
		when(oidcUser.getClaimAsBoolean("email_verified")).thenReturn(false);

		assertThatThrownBy(() -> service.loadUser(request))
			.isInstanceOfSatisfying(OAuth2AuthenticationException.class, exception ->
				assertThat(exception.getError().getErrorCode()).isEqualTo("invalid_user_info"));
		verify(accountService, never()).provision(org.mockito.ArgumentMatchers.any());
	}
}
