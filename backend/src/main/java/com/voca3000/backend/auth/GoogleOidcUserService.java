package com.voca3000.backend.auth;

import com.voca3000.backend.user.GoogleAccountService;
import com.voca3000.backend.user.GoogleProfile;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;

@Service
public class GoogleOidcUserService implements OAuth2UserService<OidcUserRequest, OidcUser> {

	private static final String INVALID_USER_INFO = "invalid_user_info";

	private final OAuth2UserService<OidcUserRequest, OidcUser> delegate;
	private final GoogleAccountService googleAccountService;

	@Autowired
	public GoogleOidcUserService(GoogleAccountService googleAccountService) {
		this(new OidcUserService(), googleAccountService);
	}

	GoogleOidcUserService(
		OAuth2UserService<OidcUserRequest, OidcUser> delegate,
		GoogleAccountService googleAccountService
	) {
		this.delegate = delegate;
		this.googleAccountService = googleAccountService;
	}

	@Override
	public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
		OidcUser oidcUser = delegate.loadUser(userRequest);
		if (!Boolean.TRUE.equals(oidcUser.getClaimAsBoolean("email_verified"))) {
			throw authenticationFailure("Google account email is not verified");
		}

		try {
			googleAccountService.provision(new GoogleProfile(
				oidcUser.getSubject(),
				oidcUser.getEmail(),
				oidcUser.getFullName(),
				oidcUser.getPicture()));
		} catch (IllegalArgumentException | IllegalStateException exception) {
			throw authenticationFailure("Google account profile is invalid", exception);
		}
		return oidcUser;
	}

	private OAuth2AuthenticationException authenticationFailure(String description) {
		return authenticationFailure(description, null);
	}

	private OAuth2AuthenticationException authenticationFailure(
		String description,
		RuntimeException cause
	) {
		OAuth2Error error = new OAuth2Error(INVALID_USER_INFO, description, null);
		return cause == null
			? new OAuth2AuthenticationException(error)
			: new OAuth2AuthenticationException(error, cause);
	}
}
