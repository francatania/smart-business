package com.smartbusiness.identity.api;

import java.time.Instant;
import java.util.UUID;

/** The stable Smart Business identity associated with an authenticated external identity. */
public record PlatformIdentity(
        UUID userId, PlatformUserStatus status, String displayName, String verifiedEmail, Instant authenticatedAt) {}
