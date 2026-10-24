package com.voca3000.backend.user;

import java.time.Clock;
import java.time.Instant;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GoogleAccountService {

	private final UserAccountRepository userAccountRepository;
	private final SocialAccountRepository socialAccountRepository;
	private final Clock clock;

	@Autowired
	public GoogleAccountService(
		UserAccountRepository userAccountRepository,
		SocialAccountRepository socialAccountRepository
	) {
		this(userAccountRepository, socialAccountRepository, Clock.systemUTC());
	}

	GoogleAccountService(
		UserAccountRepository userAccountRepository,
		SocialAccountRepository socialAccountRepository,
		Clock clock
	) {
		this.userAccountRepository = userAccountRepository;
		this.socialAccountRepository = socialAccountRepository;
		this.clock = clock;
	}

	@Transactional
	public UserAccount provision(GoogleProfile rawProfile) {
		GoogleProfile profile = validate(rawProfile);
		Instant now = clock.instant();

		return socialAccountRepository
			.findByProviderAndProviderUserId(SocialProvider.GOOGLE, profile.subject())
			.map(account -> updateExisting(account, profile, now))
			.orElseGet(() -> createNew(profile, now));
	}

	@Transactional(readOnly = true)
	public Optional<UserAccount> findActive(String rawSubject) {
		String subject = requireText(rawSubject, "subject", 255);
		return socialAccountRepository
			.findByProviderAndProviderUserId(SocialProvider.GOOGLE, subject)
			.map(SocialAccount::getUser)
			.filter(user -> user.getStatus() == UserStatus.ACTIVE);
	}

	@Transactional
	public boolean deleteAccount(String rawSubject) {
		String subject = requireText(rawSubject, "subject", 255);
		return socialAccountRepository
			.findByProviderAndProviderUserId(SocialProvider.GOOGLE, subject)
			.map(account -> {
				UserAccount user = account.getUser();
				socialAccountRepository.delete(account);
				socialAccountRepository.flush();
				userAccountRepository.delete(user);
				userAccountRepository.flush();
				return true;
			})
			.orElse(false);
	}

	private UserAccount updateExisting(SocialAccount account, GoogleProfile profile, Instant now) {
		UserAccount user = account.getUser();
		if (user.getStatus() != UserStatus.ACTIVE) {
			throw new IllegalStateException("Withdrawn users cannot sign in");
		}
		user.updateGoogleProfile(
			profile.email(),
			profile.displayName(),
			profile.profileImageUrl(),
			now);
		account.updateEmail(profile.email(), now);
		return user;
	}

	private UserAccount createNew(GoogleProfile profile, Instant now) {
		UserAccount user = userAccountRepository.save(UserAccount.create(
			profile.email(),
			profile.displayName(),
			profile.profileImageUrl(),
			now));
		socialAccountRepository.save(SocialAccount.createGoogle(
			user,
			profile.subject(),
			profile.email(),
			now));
		return user;
	}

	private GoogleProfile validate(GoogleProfile profile) {
		if (profile == null) {
			throw new IllegalArgumentException("Google profile is required");
		}
		return new GoogleProfile(
			requireText(profile.subject(), "subject", 255),
			requireText(profile.email(), "email", 320),
			requireText(profile.displayName(), "displayName", 100),
			optionalText(profile.profileImageUrl(), "profileImageUrl", 2048));
	}

	private String requireText(String value, String field, int maxLength) {
		String normalized = optionalText(value, field, maxLength);
		if (normalized == null) {
			throw new IllegalArgumentException(field + " is required");
		}
		return normalized;
	}

	private String optionalText(String value, String field, int maxLength) {
		if (value == null) {
			return null;
		}
		String normalized = value.trim();
		if (normalized.isEmpty()) {
			return null;
		}
		if (normalized.length() > maxLength) {
			throw new IllegalArgumentException(field + " is too long");
		}
		return normalized;
	}
}
