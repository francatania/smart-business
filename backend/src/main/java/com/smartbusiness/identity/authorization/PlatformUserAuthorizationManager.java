package com.smartbusiness.identity.authorization;

import com.smartbusiness.identity.api.PlatformAuthorizationPolicy;
import com.smartbusiness.identity.api.PlatformIdentityDirectory;
import com.smartbusiness.identity.api.PlatformUserStatus;
import java.util.function.Supplier;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.stereotype.Component;

@Component
public class PlatformUserAuthorizationManager implements PlatformAuthorizationPolicy {

    private final PlatformIdentityDirectory identities;

    public PlatformUserAuthorizationManager(PlatformIdentityDirectory identities) {
        this.identities = identities;
    }

    @Override
    public AuthorizationDecision authorize(
            Supplier<? extends Authentication> authenticationSupplier, RequestAuthorizationContext context) {
        var authentication = authenticationSupplier.get();
        if (!(authentication instanceof OAuth2AuthenticationToken oidcAuthentication)
                || !(oidcAuthentication.getPrincipal() instanceof OidcUser user)
                || user.getIssuer() == null) {
            return new AuthorizationDecision(false);
        }
        var active = identities
                .findByExternalIdentity(java.net.URI.create(user.getIssuer().toExternalForm()), user.getSubject())
                .map(identity -> identity.status() == PlatformUserStatus.ACTIVE)
                .orElse(false);
        return new AuthorizationDecision(active);
    }
}
