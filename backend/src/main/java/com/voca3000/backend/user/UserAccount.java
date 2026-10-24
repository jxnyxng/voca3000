package com.voca3000.backend.user;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class UserAccount {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 320)
	private String email;

	@Column(name = "display_name", nullable = false, length = 100)
	private String displayName;

	@Column(name = "profile_image_url", length = 2048)
	private String profileImageUrl;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private UserStatus status;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private UserRole role;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected UserAccount() {
	}

	private UserAccount(String email, String displayName, String profileImageUrl, Instant now) {
		this.email = email;
		this.displayName = displayName;
		this.profileImageUrl = profileImageUrl;
		this.status = UserStatus.ACTIVE;
		this.role = UserRole.USER;
		this.createdAt = now;
		this.updatedAt = now;
	}

	public static UserAccount create(
		String email,
		String displayName,
		String profileImageUrl,
		Instant now
	) {
		return new UserAccount(email, displayName, profileImageUrl, now);
	}

	public void updateGoogleProfile(String email, String displayName, String profileImageUrl, Instant now) {
		this.email = email;
		this.displayName = displayName;
		this.profileImageUrl = profileImageUrl;
		this.updatedAt = now;
	}

	public Long getId() {
		return id;
	}

	public String getEmail() {
		return email;
	}

	public String getDisplayName() {
		return displayName;
	}

	public String getProfileImageUrl() {
		return profileImageUrl;
	}

	public UserStatus getStatus() {
		return status;
	}

	public UserRole getRole() {
		return role;
	}
}
