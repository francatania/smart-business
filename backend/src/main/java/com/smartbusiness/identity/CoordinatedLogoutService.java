package com.smartbusiness.identity;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class CoordinatedLogoutService {

    private final ClientRegistrationRepository clientRegistrations;
    private final OAuth2AuthorizedClientRepository authorizedClients;
    private final OidcBffProperties properties;
    private final CookieSerializer sessionCookies;
    private final SecurityContextLogoutHandler securityContextLogoutHandler = new SecurityContextLogoutHandler();

    CoordinatedLogoutService(
            ClientRegistrationRepository clientRegistrations,
            OAuth2AuthorizedClientRepository authorizedClients,
            OidcBffProperties properties,
            CookieSerializer sessionCookies) {
        this.clientRegistrations = clientRegistrations;
        this.authorizedClients = authorizedClients;
        this.properties = properties;
        this.sessionCookies = sessionCookies;
    }

    Optional<URI> logout(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
        var endSessionTarget = endSessionTarget(authentication);
        removeAuthorizedClient(request, response, authentication);
        securityContextLogoutHandler.logout(request, response, authentication);
        SecurityContextHolder.clearContext();
        sessionCookies.writeCookieValue(new CookieSerializer.CookieValue(request, response, ""));
        return endSessionTarget;
    }

    private Optional<URI> endSessionTarget(Authentication authentication) {
        if (!(authentication instanceof OAuth2AuthenticationToken oidcAuthentication)
                || !(oidcAuthentication.getPrincipal() instanceof OidcUser oidcUser)) {
            return Optional.empty();
        }

        var surface = AuthSurface.fromRegistrationId(oidcAuthentication.getAuthorizedClientRegistrationId());
        var registration = clientRegistrations.findByRegistrationId(surface.registrationId());
        if (registration == null) {
            return Optional.empty();
        }
        var endSessionEndpoint =
                registration.getProviderDetails().getConfigurationMetadata().get("end_session_endpoint");
        if (endSessionEndpoint == null) {
            return Optional.empty();
        }

        return Optional.of(UriComponentsBuilder.fromUriString(endSessionEndpoint.toString())
                .queryParam("id_token_hint", oidcUser.getIdToken().getTokenValue())
                .queryParam("client_id", registration.getClientId())
                .queryParam(
                        "post_logout_redirect_uri",
                        properties.postLogoutUri(surface).toString())
                .encode(StandardCharsets.UTF_8)
                .build()
                .toUri());
    }

    private void removeAuthorizedClient(
            HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
        if (authentication instanceof OAuth2AuthenticationToken oidcAuthentication) {
            authorizedClients.removeAuthorizedClient(
                    oidcAuthentication.getAuthorizedClientRegistrationId(), authentication, request, response);
        }
    }
}
