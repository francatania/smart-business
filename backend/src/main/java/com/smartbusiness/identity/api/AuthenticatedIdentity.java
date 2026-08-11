package com.smartbusiness.identity.api;

import java.net.URI;
import java.time.Instant;
import java.util.Objects;

/** A verified OpenID Connect identity after token validation by the BFF. */
public record AuthenticatedIdentity(
        URI issuer, String subject, String displayName, String verifiedEmail, Instant authenticatedAt) {

    public AuthenticatedIdentity {
        issuer = normalizeIssuer(issuer);
        subject = requireNonBlank(subject, "subject");
        displayName = requireNonBlank(displayName, "displayName");
        verifiedEmail = normalizeOptional(verifiedEmail);
        authenticatedAt = Objects.requireNonNull(authenticatedAt, "authenticatedAt must not be null");
    }

    private static URI normalizeIssuer(URI candidate) {
        var issuer =
                Objects.requireNonNull(candidate, "issuer must not be null").normalize();
        if (!issuer.isAbsolute() || issuer.getScheme() == null || issuer.getHost() == null) {
            throw new IllegalArgumentException("issuer must be an absolute URI with a host");
        }
        return issuer;
    }

    private static String requireNonBlank(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " must not be blank");
        }
        return value;
    }

    private static String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
