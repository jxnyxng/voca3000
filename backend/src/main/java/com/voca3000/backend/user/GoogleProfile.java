package com.voca3000.backend.user;

public record GoogleProfile(
	String subject,
	String email,
	String displayName,
	String profileImageUrl
) {
}
