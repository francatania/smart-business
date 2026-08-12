package com.smartbusiness;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.smartbusiness.identity.AuthLoginController;
import com.smartbusiness.identity.AuthReturnTargets;
import com.smartbusiness.identity.CsrfController;
import com.smartbusiness.identity.CurrentActorService;
import com.smartbusiness.identity.OidcAuthenticationSuccessHandler;
import com.smartbusiness.identity.PlatformUserAuthorizationManager;
import com.smartbusiness.identity.SessionController;
import com.smartbusiness.identity.api.AuthenticatedIdentity;
import com.smartbusiness.identity.api.OrganizationAccessResolver;
import com.smartbusiness.identity.api.PlatformIdentity;
import com.smartbusiness.identity.api.PlatformIdentityDirectory;
import com.smartbusiness.identity.api.PlatformUserStatus;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(
        controllers = {
            SystemInfoController.class,
            AuthLoginController.class,
            CsrfController.class,
            SessionController.class,
            SecurityTestEndpoints.class
        },
        properties = {"info.application.name=smart-business", "info.application.version=test"})
@Import({
    SecurityConfiguration.class,
    PlatformUserAuthorizationManager.class,
    AuthReturnTargets.class,
    OidcAuthenticationSuccessHandler.class,
    CurrentActorService.class,
    SecurityOidcFlowTests.Clients.class
})
class SecurityOidcFlowTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ClientRegistrationRepository clients;

    @Autowired
    private SessionAuthenticationStrategy sessionAuthenticationStrategy;

    @Test
    void keepsSystemAndPublicBookingEndpointsPublic() throws Exception {
        mockMvc.perform(get("/api/system/info"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("smart-business"));
        mockMvc.perform(get("/api/public/booking-placeholder"))
                .andExpect(status().isOk())
                .andExpect(content().string("public"));
    }

    @Test
    void returnsProblemDetailsForAnUnauthenticatedApiRequest() throws Exception {
        mockMvc.perform(get("/api/private/test").header(CorrelationIdFilter.HEADER_NAME, "auth-test-1"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("authentication_required"))
                .andExpect(jsonPath("$.correlationId").value("auth-test-1"));
    }

    @Test
    void returnsACacheSafeAnonymousSessionWithoutTokens() throws Exception {
        mockMvc.perform(get("/api/auth/session"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(jsonPath("$.authenticated").value(false))
                .andExpect(jsonPath("$.actor").doesNotExist())
                .andExpect(content().string(not(containsString("access_token"))))
                .andExpect(content().string(not(containsString("refresh_token"))))
                .andExpect(content().string(not(containsString("id_token"))));
    }

    @Test
    void exposesOnlyAllowlistedGlobalRolesAndNoOrganizationAccess() throws Exception {
        mockMvc.perform(get("/api/auth/session").with(oidcLogin().idToken(token -> token.claim(
                                "iss", "https://auth.example.test")
                        .claim("sub", "platform-admin")
                        .claim("realm_access", Map.of("roles", List.of("platform_admin", "organization_admin"))))))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(jsonPath("$.authenticated").value(true))
                .andExpect(jsonPath("$.actor.status").value("ACTIVE"))
                .andExpect(jsonPath("$.actor.globalRoles[0]").value("platform_admin"))
                .andExpect(jsonPath("$.actor.globalRoles.length()").value(1))
                .andExpect(jsonPath("$.actor.organizationAccess").isEmpty())
                .andExpect(jsonPath("$.actor.assuranceLevel").value("standard"))
                .andExpect(content().string(not(containsString("organization_admin"))))
                .andExpect(content().string(not(containsString("access_token"))));
    }

    @Test
    void deniesPrivateAccessForADisabledPlatformUser() throws Exception {
        mockMvc.perform(get("/api/private/test")
                        .with(oidcLogin().idToken(token -> token.claim("iss", "https://auth.example.test")
                                .claim("sub", "disabled"))))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("access_denied"));
    }

    @Test
    void acceptsAnAuthenticatedOidcSession() throws Exception {
        var portal = clients.findByRegistrationId("portal-bff");

        mockMvc.perform(get("/api/private/test")
                        .with(oidcLogin()
                                .clientRegistration(portal)
                                .idToken(token -> token.claim("iss", "https://auth.example.test"))))
                .andExpect(status().isOk())
                .andExpect(content().string("private"));
    }

    @Test
    void requiresASessionBackedCsrfTokenForStateChangingRequests() throws Exception {
        var bootstrap = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(jsonPath("$.headerName").value("X-CSRF-TOKEN"))
                .andExpect(jsonPath("$.parameterName").value("_csrf"))
                .andReturn();
        var session = (MockHttpSession) bootstrap.getRequest().getSession(false);
        assertThat(session).isNotNull();
        mockMvc.perform(post("/api/private/test")
                        .with(oidcLogin().idToken(token -> token.claim("iss", "https://auth.example.test")))
                        .session(session))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("access_denied"));
        mockMvc.perform(post("/api/private/test")
                        .with(oidcLogin().idToken(token -> token.claim("iss", "https://auth.example.test")))
                        .session(session)
                        .with(csrf().asHeader()))
                .andExpect(status().isOk())
                .andExpect(content().string("updated"));
    }

    @Test
    void initiatesTheSelectedBffFlowWithoutPuttingTokensInTheBrowser() throws Exception {
        var login = mockMvc.perform(get("/api/auth/login/portal").queryParam("returnTo", "/appointments"))
                .andExpect(status().isFound())
                .andExpect(redirectedUrl("/oauth2/authorization/portal-bff"))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andReturn();

        mockMvc.perform(get("/oauth2/authorization/portal-bff")
                        .session((MockHttpSession) login.getRequest().getSession(false)))
                .andExpect(status().isFound())
                .andExpect(header().string(
                                HttpHeaders.LOCATION, startsWith("https://auth.example.test/oauth2/authorize?")))
                .andExpect(header().string(HttpHeaders.LOCATION, containsString("client_id=portal-bff")))
                .andExpect(header().string(
                                HttpHeaders.LOCATION,
                                containsString(
                                        "redirect_uri=https://portal.example.test/api/auth/callback/portal-bff")))
                .andExpect(header().string(HttpHeaders.LOCATION, containsString("code_challenge=")))
                .andExpect(header().string(HttpHeaders.LOCATION, not(containsString("access_token"))))
                .andExpect(header().string(HttpHeaders.LOCATION, not(containsString("refresh_token"))));
    }

    @Test
    void rejectsACallbackWithoutTheServerSideAuthorizationRequest() throws Exception {
        mockMvc.perform(get("/api/auth/callback/portal-bff")
                        .queryParam("code", "untrusted-code")
                        .queryParam("state", "untrusted-state"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("authentication_failed"))
                .andExpect(content().string(not(containsString("untrusted-code"))));
    }

    @Test
    void rotatesTheSessionIdentifierWithTheConfiguredAuthenticationStrategy() {
        var request = new MockHttpServletRequest();
        var response = new MockHttpServletResponse();
        var session = request.getSession();
        var originalId = session.getId();

        sessionAuthenticationStrategy.onAuthentication(
                new TestingAuthenticationToken("subject", "credential"), request, response);

        assertThat(session.getId()).isNotEqualTo(originalId);
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class Clients {

        @Bean
        Clock identityClock() {
            return Clock.systemUTC();
        }

        @Bean
        PlatformIdentityDirectory platformIdentityDirectory() {
            return new PlatformIdentityDirectory() {
                @Override
                public PlatformIdentity resolve(AuthenticatedIdentity identity) {
                    return new PlatformIdentity(
                            UUID.randomUUID(),
                            PlatformUserStatus.ACTIVE,
                            identity.displayName(),
                            identity.verifiedEmail(),
                            Instant.now());
                }

                @Override
                public Optional<PlatformIdentity> findByUserId(UUID userId) {
                    return Optional.empty();
                }

                @Override
                public Optional<PlatformIdentity> findByExternalIdentity(java.net.URI issuer, String subject) {
                    return Optional.of(new PlatformIdentity(
                            UUID.nameUUIDFromBytes(subject.getBytes(java.nio.charset.StandardCharsets.UTF_8)),
                            "disabled".equals(subject) ? PlatformUserStatus.DISABLED : PlatformUserStatus.ACTIVE,
                            "Test User",
                            "test@example.test",
                            Instant.parse("2026-08-11T12:00:00Z")));
                }
            };
        }

        @Bean
        OrganizationAccessResolver organizationAccessResolver() {
            return platformUserId -> java.util.List.of();
        }

        @Bean
        ClientRegistrationRepository clientRegistrationRepository() {
            var portal = registration("portal-bff", "https://portal.example.test/api/auth/callback/portal-bff");
            var admin = registration("admin-bff", "https://admin.example.test/api/auth/callback/admin-bff");
            return new InMemoryClientRegistrationRepository(portal, admin);
        }

        private ClientRegistration registration(String registrationId, String redirectUri) {
            return ClientRegistration.withRegistrationId(registrationId)
                    .clientId(registrationId)
                    .clientSecret("server-side-test-secret")
                    .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                    .redirectUri(redirectUri)
                    .scope("openid", "profile", "email")
                    .authorizationUri("https://auth.example.test/oauth2/authorize")
                    .tokenUri("https://auth.example.test/oauth2/token")
                    .jwkSetUri("https://auth.example.test/oauth2/certs")
                    .issuerUri("https://auth.example.test")
                    .userNameAttributeName("sub")
                    .clientSettings(ClientRegistration.ClientSettings.builder()
                            .requireProofKey(true)
                            .build())
                    .clientName(registrationId)
                    .build();
        }
    }
}
