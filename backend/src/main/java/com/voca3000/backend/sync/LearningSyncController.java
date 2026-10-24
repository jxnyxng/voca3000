package com.voca3000.backend.sync;

import com.voca3000.backend.user.GoogleAccountService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/sync")
public class LearningSyncController {
	private final GoogleAccountService accounts;
	private final LearningSyncService sync;

	public LearningSyncController(GoogleAccountService accounts, LearningSyncService sync) {
		this.accounts = accounts;
		this.sync = sync;
	}

	@GetMapping
	LearningSnapshot load(@AuthenticationPrincipal OidcUser principal) {
		return sync.load(userId(principal));
	}

	@PutMapping
	ResponseEntity<Void> replace(@AuthenticationPrincipal OidcUser principal, @RequestBody LearningSnapshot snapshot) {
		sync.replace(userId(principal), snapshot);
		return ResponseEntity.noContent().build();
	}

	@ExceptionHandler(IllegalArgumentException.class)
	ResponseEntity<Void> invalidSnapshot() {
		return ResponseEntity.badRequest().build();
	}

	private long userId(OidcUser principal) {
		if (principal == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
		return accounts.findActive(principal.getSubject()).orElseThrow(
			() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED)).getId();
	}
}
