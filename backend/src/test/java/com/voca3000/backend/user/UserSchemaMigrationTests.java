package com.voca3000.backend.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class UserSchemaMigrationTests {

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void createsUserAndSocialAccountTables() {
		assertThat(tableExists("USERS")).isTrue();
		assertThat(tableExists("SOCIAL_ACCOUNTS")).isTrue();
		assertThat(columnExists("USERS", "MEMBERSHIP_TIER")).isTrue();
		assertThat(tableExists("SPRING_SESSION")).isTrue();
		assertThat(tableExists("SPRING_SESSION_ATTRIBUTES")).isTrue();
		assertThat(tableExists("LEARNING_PROGRESS")).isTrue();
		assertThat(tableExists("DAY_SESSIONS")).isTrue();
	}

	@Test
	void assignsFreeMembershipByDefaultAndRejectsUnsupportedTier() {
		long userId = insertUser("free@example.com");

		assertThat(jdbcTemplate.queryForObject(
			"SELECT membership_tier FROM users WHERE id = ?",
			String.class,
			userId)).isEqualTo("FREE");

		assertThatThrownBy(() -> jdbcTemplate.update("""
			UPDATE users SET membership_tier = ? WHERE id = ?
			""", "UNKNOWN", userId))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void rejectsDuplicateProviderIdentity() {
		long userId = insertUser("first@example.com");
		insertSocialAccount(userId, "GOOGLE", "google-user-1", "first@example.com");

		assertThatThrownBy(() ->
			insertSocialAccount(userId, "GOOGLE", "google-user-1", "other@example.com"))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void rejectsUnknownUserAndUnsupportedEnumValues() {
		assertThatThrownBy(() ->
			insertSocialAccount(Long.MAX_VALUE, "GOOGLE", "missing-user", "missing@example.com"))
			.isInstanceOf(DataIntegrityViolationException.class);

		assertThatThrownBy(() -> jdbcTemplate.update("""
			INSERT INTO users (email, display_name, status, role)
			VALUES (?, ?, ?, ?)
			""", "invalid@example.com", "Invalid", "UNKNOWN", "USER"))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	private boolean tableExists(String tableName) {
		Integer count = jdbcTemplate.queryForObject("""
			SELECT COUNT(*)
			FROM INFORMATION_SCHEMA.TABLES
			WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = ?
			""", Integer.class, tableName);
		return count != null && count == 1;
	}

	private boolean columnExists(String tableName, String columnName) {
		Integer count = jdbcTemplate.queryForObject("""
			SELECT COUNT(*)
			FROM INFORMATION_SCHEMA.COLUMNS
			WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = ? AND COLUMN_NAME = ?
			""", Integer.class, tableName, columnName);
		return count != null && count == 1;
	}

	private long insertUser(String email) {
		jdbcTemplate.update("""
			INSERT INTO users (email, display_name)
			VALUES (?, ?)
			""", email, "Test User");
		Long id = jdbcTemplate.queryForObject(
			"SELECT id FROM users WHERE email = ?",
			Long.class,
			email);
		if (id == null) {
			throw new IllegalStateException("Inserted user ID was not returned");
		}
		return id;
	}

	private void insertSocialAccount(
		long userId,
		String provider,
		String providerUserId,
		String email
	) {
		jdbcTemplate.update("""
			INSERT INTO social_accounts (user_id, provider, provider_user_id, email)
			VALUES (?, ?, ?, ?)
			""", userId, provider, providerUserId, email);
	}
}
