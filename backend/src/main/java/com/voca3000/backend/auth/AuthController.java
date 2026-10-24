package com.voca3000.backend.auth;

import com.voca3000.backend.user.GoogleAccountService;
import com.voca3000.backend.user.UserAccount;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/api")
public class AuthController {

	private final GoogleAccountService googleAccountService;
	private final LogoutHandler accountLogoutHandler;

	public AuthController(
		GoogleAccountService googleAccountService,
		LogoutHandler accountLogoutHandler
	) {
		this.googleAccountService = googleAccountService;
		this.accountLogoutHandler = accountLogoutHandler;
	}

	@GetMapping("/me")
	ResponseEntity<MeResponse> me(@AuthenticationPrincipal OidcUser principal) {
		if (principal == null) {
			return ResponseEntity.ok(MeResponse.anonymous());
		}

		return googleAccountService.findActive(principal.getSubject())
			.map(user -> ResponseEntity.ok(MeResponse.authenticated(user)))
			.orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
	}

	@GetMapping("/csrf")
	CsrfResponse csrf(CsrfToken token) {
		return new CsrfResponse(token.getHeaderName(), token.getParameterName(), token.getToken());
	}

	@DeleteMapping("/me")
	ResponseEntity<Void> deleteAccount(
		@AuthenticationPrincipal OidcUser principal,
		Authentication authentication,
		HttpServletRequest request,
		HttpServletResponse response
	) {
		if (principal == null || !googleAccountService.deleteAccount(principal.getSubject())) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
		}

		accountLogoutHandler.logout(request, response, authentication);
		SecurityContextHolder.clearContext();
		return ResponseEntity.noContent().build();
	}

	record MeResponse(boolean authenticated, UserSummary user) {

		static MeResponse anonymous() {
			return new MeResponse(false, null);
		}

		static MeResponse authenticated(UserAccount user) {
			return new MeResponse(true, new UserSummary(
				user.getId(),
				user.getEmail(),
				user.getDisplayName(),
				user.getProfileImageUrl()));
		}
	}

	record UserSummary(Long id, String email, String displayName, String profileImageUrl) {
	}

	record CsrfResponse(String headerName, String parameterName, String token) {
	}
}
