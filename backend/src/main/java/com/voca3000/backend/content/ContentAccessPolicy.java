package com.voca3000.backend.content;

import com.voca3000.backend.user.MembershipTier;

public final class ContentAccessPolicy {

	public static final int GUEST_MAX_DAY = 3;
	public static final int FREE_MAX_DAY = 50;
	public static final int PREMIUM_MAX_DAY = 100;

	private ContentAccessPolicy() {
	}

	public static int maxDay(MembershipTier tier) {
		return tier == MembershipTier.PREMIUM ? PREMIUM_MAX_DAY : FREE_MAX_DAY;
	}
}
