package com.voca3000.backend.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class GoogleAccountServiceTests {

	@Autowired
	private GoogleAccountService googleAccountService;

	@Autowired
	private UserAccountRepository userAccountRepository;

	@Autowired
	private SocialAccountRepository socialAccountRepository;

	@Test
	void createsOneInternalUserOnFirstLogin() {
		UserAccount user = googleAccountService.provision(new GoogleProfile(
			"google-subject-1",
			"first@example.com",
			"First User",
			"https://example.com/first.png"));

		assertThat(user.getId()).isNotNull();
		assertThat(user.getRole()).isEqualTo(UserRole.USER);
		assertThat(user.getMembershipTier()).isEqualTo(MembershipTier.FREE);
		assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
		assertThat(userAccountRepository.count()).isEqualTo(1);
		assertThat(socialAccountRepository.count()).isEqualTo(1);
	}

	@Test
	void returnsSameInternalUserAndRefreshesProfileOnRelogin() {
		UserAccount firstLogin = googleAccountService.provision(new GoogleProfile(
			"google-subject-2",
			"old@example.com",
			"Old Name",
			null));

		UserAccount secondLogin = googleAccountService.provision(new GoogleProfile(
			"google-subject-2",
			"new@example.com",
			"New Name",
			"https://example.com/new.png"));

		assertThat(secondLogin.getId()).isEqualTo(firstLogin.getId());
		assertThat(secondLogin.getEmail()).isEqualTo("new@example.com");
		assertThat(secondLogin.getDisplayName()).isEqualTo("New Name");
		assertThat(secondLogin.getProfileImageUrl()).isEqualTo("https://example.com/new.png");
		assertThat(userAccountRepository.count()).isEqualTo(1);
		assertThat(socialAccountRepository.count()).isEqualTo(1);
		assertThat(socialAccountRepository
			.findByProviderAndProviderUserId(SocialProvider.GOOGLE, "google-subject-2"))
			.get()
			.extracting(SocialAccount::getEmail)
			.isEqualTo("new@example.com");
	}

	@Test
	void doesNotMergeDifferentGoogleSubjectsWithSameEmail() {
		GoogleProfile first = new GoogleProfile("subject-a", "same@example.com", "A", null);
		GoogleProfile second = new GoogleProfile("subject-b", "same@example.com", "B", null);

		googleAccountService.provision(first);
		googleAccountService.provision(second);

		assertThat(userAccountRepository.count()).isEqualTo(2);
		assertThat(socialAccountRepository.count()).isEqualTo(2);
	}

	@Test
	void rejectsMissingOrOversizedIdentityFieldsWithoutWritingData() {
		assertThatThrownBy(() -> googleAccountService.provision(
			new GoogleProfile(" ", "user@example.com", "User", null)))
			.isInstanceOf(IllegalArgumentException.class)
			.hasMessage("subject is required");

		assertThatThrownBy(() -> googleAccountService.provision(
			new GoogleProfile("subject", "user@example.com", "x".repeat(101), null)))
			.isInstanceOf(IllegalArgumentException.class)
			.hasMessage("displayName is too long");

		assertThat(userAccountRepository.count()).isZero();
		assertThat(socialAccountRepository.count()).isZero();
	}
}
