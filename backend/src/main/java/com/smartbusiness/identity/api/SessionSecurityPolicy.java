package com.smartbusiness.identity.api;

import java.time.Duration;

/** Session lifetime policy used by the platform session infrastructure. */
public interface SessionSecurityPolicy {

    Duration absoluteTimeout();
}
