package com.smartbusiness.identity.authentication;

import static org.assertj.core.api.Assertions.assertThat;

import com.smartbusiness.identity.api.AuthenticatedIdentity;
import com.smartbusiness.identity.api.PlatformIdentity;
import com.smartbusiness.identity.api.PlatformIdentityDirectory;
import com.smartbusiness.identity.api.PlatformUserStatus;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.slf4j.MDC;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;

@ExtendWith(OutputCaptureExtension.class)
class OidcAuthenticationSuccessHandlerTests {

    @Test
    void redirectsToTheServerSideTargetWithoutReturningTokensOrLoggingIdentity(CapturedOutput output) throws Exception {
        var returnTargets = new AuthReturnTargets();
        var identities = new RecordingIdentityDirectory();
        var authenticatedAt = Instant.parse("2026-08-10T12:00:00Z");
        var handler = new OidcAuthenticationSuccessHandler(
                returnTargets, identities, Clock.fixed(authenticatedAt, ZoneOffset.UTC));
        var request = new MockHttpServletRequest();
        var response = new MockHttpServletResponse();
        returnTargets.remember(request, AuthSurface.PORTAL, "/appointments");
        var authorities = Set.of(new SimpleGrantedAuthority("OIDC_USER"));
        var principal = new DefaultOidcUser(
                authorities,
                new OidcIdToken(
                        "id-token",
                        authenticatedAt,
                        authenticatedAt.plusSeconds(300),
                        Map.of(
                                "iss", "https://auth.example.test/realms/smart-business",
                                "sub", "test-subject",
                                "name", "Test User",
                                "email", "test@example.test",
                                "email_verified", true)));
        var authentication = new OAuth2AuthenticationToken(principal, authorities, "portal-bff");

        MDC.put("correlationId", "identity-login-test");
        try {
            handler.onAuthenticationSuccess(request, response, authentication);
        } finally {
            MDC.clear();
        }

        assertThat(response.getRedirectedUrl()).isEqualTo("/appointments");
        assertThat(response.getHeader(HttpHeaders.CACHE_CONTROL)).isEqualTo("no-store");
        assertThat(response.getContentAsString()).isEmpty();
        assertThat(response.getHeaderNames())
                .noneMatch(name -> name.toLowerCase().contains("token"));
        assertThat(identities.authenticatedIdentity)
                .isEqualTo(new AuthenticatedIdentity(
                        java.net.URI.create("https://auth.example.test/realms/smart-business"),
                        "test-subject",
                        "Test User",
                        "test@example.test",
                        authenticatedAt));
        assertThat(output).contains("surface=portal registrationId=portal-bff correlationId=identity-login-test");
        assertThat(output).doesNotContain("test-subject", "test@example.test", "id-token", "subjectFingerprint");
    }

    private static final class RecordingIdentityDirectory implements PlatformIdentityDirectory {

        private AuthenticatedIdentity authenticatedIdentity;

        @Override
        public PlatformIdentity resolve(AuthenticatedIdentity identity) {
            authenticatedIdentity = identity;
            return new PlatformIdentity(
                    UUID.randomUUID(),
                    PlatformUserStatus.ACTIVE,
                    identity.displayName(),
                    identity.verifiedEmail(),
                    identity.authenticatedAt());
        }

        @Override
        public Optional<PlatformIdentity> findByUserId(UUID userId) {
            return Optional.empty();
        }

        @Override
        public Optional<PlatformIdentity> findByExternalIdentity(java.net.URI issuer, String subject) {
            return Optional.empty();
        }
    }
}
