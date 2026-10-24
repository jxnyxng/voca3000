package com.voca3000.backend.user;

import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SocialAccountRepository extends JpaRepository<SocialAccount, Long> {

	@EntityGraph(attributePaths = "user")
	Optional<SocialAccount> findByProviderAndProviderUserId(
		SocialProvider provider,
		String providerUserId
	);
}
