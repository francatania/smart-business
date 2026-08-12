package com.smartbusiness.identity;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.session.web.http.DefaultCookieSerializer;
import org.springframework.web.util.UriComponentsBuilder;

class CoordinatedLogoutServiceTests {

    @Test
    void removesTheAuthorizedClientBeforeInvalidatingTheLocalSession() {
        var registration = registration();
        var authorizedClients = new RecordingAuthorizedClientRepository();
        var cookies = new DefaultCookieSerializer();
        cookies.setCookieName("SBSESSION");
        cookies.setCookiePath("/");
        var service =
                new CoordinatedLogoutService(registrationId -> registration, authorizedClients, properties(), cookies);
        var request = new MockHttpServletRequest();
        request.getSession();
        var response = new MockHttpServletResponse();
        var authentication = authentication();

        var target = service.logout(request, response, authentication);

        assertThat(authorizedClients.removedRegistrationId).isEqualTo("portal-bff");
        assertThat(authorizedClients.removedAuthentication).isSameAs(authentication);
        assertThat(request.getSession(false)).isNull();
        assertThat(response.getHeader("Set-Cookie")).contains("SBSESSION=").contains("Max-Age=0");
        var parameters =
                UriComponentsBuilder.fromUri(target.orElseThrow()).build().getQueryParams();
        assertThat(parameters.getFirst("client_id")).isEqualTo("portal-bff");
        assertThat(parameters.getFirst("post_logout_redirect_uri")).isEqualTo("https://portal.example.test/");
    }

    private OidcBffProperties properties() {
        return new OidcBffProperties(
                URI.create("https://auth.example.test/realms/smart-business"),
                null,
                null,
                null,
                null,
                "portal-secret",
                URI.create("https://portal.example.test/api/auth/callback/portal-bff"),
                URI.create("https://portal.example.test/"),
                "admin-secret",
                URI.create("https://admin.example.test/api/auth/callback/admin-bff"),
                URI.create("https://admin.example.test/"));
    }

    private ClientRegistration registration() {
        return ClientRegistration.withRegistrationId("portal-bff")
                .clientId("portal-bff")
                .clientSecret("server-side-secret")
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("https://portal.example.test/api/auth/callback/portal-bff")
                .scope("openid")
                .authorizationUri("https://auth.example.test/authorize")
                .tokenUri("https://auth.example.test/token")
                .jwkSetUri("https://auth.example.test/certs")
                .issuerUri("https://auth.example.test/realms/smart-business")
                .providerConfigurationMetadata(Map.of("end_session_endpoint", "https://auth.example.test/logout"))
                .userNameAttributeName("sub")
                .clientName("Portal BFF")
                .build();
    }

    private OAuth2AuthenticationToken authentication() {
        var now = Instant.parse("2026-08-12T20:00:00Z");
        var user = new DefaultOidcUser(
                Set.of(new SimpleGrantedAuthority("OIDC_USER")),
                new OidcIdToken(
                        "test-id-token",
                        now,
                        now.plusSeconds(300),
                        Map.of("iss", "https://auth.example.test", "sub", "test-user")));
        return new OAuth2AuthenticationToken(user, user.getAuthorities(), "portal-bff");
    }

    private static final class RecordingAuthorizedClientRepository implements OAuth2AuthorizedClientRepository {

        private String removedRegistrationId;
        private Authentication removedAuthentication;

        @Override
        public <T extends OAuth2AuthorizedClient> T loadAuthorizedClient(
                String clientRegistrationId,
                Authentication principal,
                jakarta.servlet.http.HttpServletRequest request) {
            return null;
        }

        @Override
        public void saveAuthorizedClient(
                OAuth2AuthorizedClient authorizedClient,
                Authentication principal,
                jakarta.servlet.http.HttpServletRequest request,
                jakarta.servlet.http.HttpServletResponse response) {}

        @Override
        public void removeAuthorizedClient(
                String clientRegistrationId,
                Authentication principal,
                jakarta.servlet.http.HttpServletRequest request,
                jakarta.servlet.http.HttpServletResponse response) {
            removedRegistrationId = clientRegistrationId;
            removedAuthentication = principal;
        }
    }
}
