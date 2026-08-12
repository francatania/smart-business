package com.smartbusiness.identity.authorization;

import com.smartbusiness.identity.api.CurrentActor;
import com.smartbusiness.identity.api.OrganizationAccessResolver;
import com.smartbusiness.identity.api.PlatformIdentityDirectory;
import com.smartbusiness.identity.api.SessionSecurityPolicy;
import jakarta.servlet.http.HttpSession;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;

@Service
public class CurrentActorService {

    private static final Set<String> ALLOWED_GLOBAL_ROLES = Set.of("platform_admin");

    private final PlatformIdentityDirectory identities;
    private final OrganizationAccessResolver organizationAccess;
    private final SessionSecurityPolicy sessionSecurityPolicy;

    public CurrentActorService(
            PlatformIdentityDirectory identities,
            OrganizationAccessResolver organizationAccess,
            SessionSecurityPolicy sessionSecurityPolicy) {
        this.identities = identities;
        this.organizationAccess = organizationAccess;
        this.sessionSecurityPolicy = sessionSecurityPolicy;
    }

    public Optional<CurrentActor> resolve(OAuth2AuthenticationToken authentication, HttpSession session) {
        if (!(authentication.getPrincipal() instanceof OidcUser user)) {
            return Optional.empty();
        }
        if (user.getIssuer() == null) {
            return Optional.empty();
        }
        var identity = identities.findByExternalIdentity(
                java.net.URI.create(user.getIssuer().toExternalForm()), user.getSubject());
        return identity.map(platformIdentity -> new CurrentActor(
                platformIdentity.userId(),
                platformIdentity.status(),
                platformIdentity.displayName(),
                platformIdentity.verifiedEmail(),
                allowedGlobalRoles(user),
                organizationAccess.resolveActiveAccess(platformIdentity.userId()),
                platformIdentity.authenticatedAt(),
                absoluteExpiresAt(session),
                "standard"));
    }

    private List<String> allowedGlobalRoles(OidcUser user) {
        Map<String, Object> realmAccess = user.getClaimAsMap("realm_access");
        if (realmAccess == null || !(realmAccess.get("roles") instanceof Collection<?> roles)) {
            return List.of();
        }
        return roles.stream()
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .filter(ALLOWED_GLOBAL_ROLES::contains)
                .sorted()
                .toList();
    }

    private Instant absoluteExpiresAt(HttpSession session) {
        return Instant.ofEpochMilli(session.getCreationTime()).plus(sessionSecurityPolicy.absoluteTimeout());
    }
}
