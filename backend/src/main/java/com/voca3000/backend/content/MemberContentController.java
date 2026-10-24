package com.voca3000.backend.content;

import tools.jackson.databind.JsonNode;
import com.voca3000.backend.user.GoogleAccountService;
import com.voca3000.backend.user.UserAccount;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@RestController
@RequestMapping("/api/content/{language}/days")
public class MemberContentController {

	private final GoogleAccountService accounts;
	private final MemberContentService content;

	public MemberContentController(GoogleAccountService accounts, MemberContentService content) {
		this.accounts = accounts;
		this.content = content;
	}

	@GetMapping
	JsonNode index(@PathVariable String language, @AuthenticationPrincipal OidcUser principal) {
		UserAccount user = activeUser(principal);
		return content.loadIndex(language, ContentAccessPolicy.maxDay(user.getMembershipTier()));
	}

	@GetMapping("/{day}")
	ResponseEntity<JsonNode> day(
		@PathVariable String language,
		@PathVariable int day,
		@AuthenticationPrincipal OidcUser principal
	) {
		UserAccount user = activeUser(principal);
		if (day < 1 || day > ContentAccessPolicy.maxDay(user.getMembershipTier())) {
			return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
		}
		try {
			return ResponseEntity.ok(content.loadDay(language, day));
		} catch (MemberContentService.ContentNotFoundException error) {
			return ResponseEntity.notFound().build();
		}
	}

	private UserAccount activeUser(OidcUser principal) {
		if (principal == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
		return accounts.findActive(principal.getSubject())
			.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
	}
}
