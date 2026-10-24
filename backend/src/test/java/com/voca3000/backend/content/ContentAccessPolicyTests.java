package com.voca3000.backend.content;

import static org.assertj.core.api.Assertions.assertThat;

import com.voca3000.backend.user.MembershipTier;
import org.junit.jupiter.api.Test;

class ContentAccessPolicyTests {

	@Test
	void mapsMembershipTiersToTheirDayLimits() {
		assertThat(ContentAccessPolicy.maxDay(MembershipTier.FREE)).isEqualTo(50);
		assertThat(ContentAccessPolicy.maxDay(MembershipTier.PREMIUM)).isEqualTo(100);
		assertThat(ContentAccessPolicy.GUEST_MAX_DAY).isEqualTo(3);
	}
}
