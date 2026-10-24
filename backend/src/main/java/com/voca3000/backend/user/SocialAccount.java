package com.voca3000.backend.user;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "social_accounts")
public class SocialAccount {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private UserAccount user;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private SocialProvider provider;

	@Column(name = "provider_user_id", nullable = false, length = 255)
	private String providerUserId;

	@Column(nullable = false, length = 320)
	private String email;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected SocialAccount() {
	}

	private SocialAccount(
		UserAccount user,
		SocialProvider provider,
		String providerUserId,
		String email,
		Instant now
	) {
		this.user = user;
		this.provider = provider;
		this.providerUserId = providerUserId;
		this.email = email;
		this.createdAt = now;
		this.updatedAt = now;
	}

	public static SocialAccount createGoogle(
		UserAccount user,
		String providerUserId,
		String email,
		Instant now
	) {
		return new SocialAccount(user, SocialProvider.GOOGLE, providerUserId, email, now);
	}

	public void updateEmail(String email, Instant now) {
		this.email = email;
		this.updatedAt = now;
	}

	public UserAccount getUser() {
		return user;
	}

	public String getEmail() {
		return email;
	}
}
