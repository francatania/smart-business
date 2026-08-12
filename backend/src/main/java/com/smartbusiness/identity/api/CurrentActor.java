package com.smartbusiness.identity.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Safe authorization context for the currently authenticated Smart Business user. */
public record CurrentActor(
        @NotNull UUID id,
        @NotNull PlatformUserStatus status,
        @NotBlank String displayName,
        String verifiedEmail,
        @NotNull List<String> globalRoles,
        @NotNull List<OrganizationAccess> organizationAccess,
        @NotNull Instant authenticatedAt,
        @NotNull Instant absoluteExpiresAt,
        @NotBlank String assuranceLevel) {}
