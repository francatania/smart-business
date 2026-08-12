package com.smartbusiness.identity.api;

import java.net.URI;
import java.util.Optional;
import java.util.UUID;

/** Narrow module API for resolving and reading stable platform identities. */
public interface PlatformIdentityDirectory {

    PlatformIdentity resolve(AuthenticatedIdentity authenticatedIdentity);

    Optional<PlatformIdentity> findByUserId(UUID userId);

    Optional<PlatformIdentity> findByExternalIdentity(URI issuer, String subject);
}
