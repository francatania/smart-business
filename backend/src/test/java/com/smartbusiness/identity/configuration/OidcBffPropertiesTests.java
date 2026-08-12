package com.smartbusiness.identity.configuration;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;

class OidcBffPropertiesTests {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(OidcClientConfiguration.class)
            .withPropertyValues(
                    "smart-business.identity.oidc.issuer-uri=https://auth.example.test/realms/smart-business",
                    "smart-business.identity.oidc.authorization-uri=https://auth.example.test/auth",
                    "smart-business.identity.oidc.token-uri=https://auth.example.test/token",
                    "smart-business.identity.oidc.jwk-set-uri=https://auth.example.test/certs",
                    "smart-business.identity.oidc.end-session-uri=https://auth.example.test/logout",
                    "smart-business.identity.oidc.portal-client-secret=portal-test-secret",
                    "smart-business.identity.oidc.portal-callback-uri=https://portal.example.test/api/auth/callback/portal-bff",
                    "smart-business.identity.oidc.portal-post-logout-uri=https://portal.example.test/",
                    "smart-business.identity.oidc.admin-client-secret=admin-test-secret",
                    "smart-business.identity.oidc.admin-callback-uri=https://admin.example.test/api/auth/callback/admin-bff",
                    "smart-business.identity.oidc.admin-post-logout-uri=https://admin.example.test/");

    @Test
    void createsSeparateConfidentialAuthorizationCodeRegistrations() {
        contextRunner.run(context -> {
            assertThat(context).hasNotFailed();
            var repository = context.getBean(ClientRegistrationRepository.class);
            var portal = repository.findByRegistrationId("portal-bff");
            var admin = repository.findByRegistrationId("admin-bff");

            assertThat(portal.getClientId()).isEqualTo("portal-bff");
            assertThat(portal.getClientSecret()).isEqualTo("portal-test-secret");
            assertThat(portal.getRedirectUri()).isEqualTo("https://portal.example.test/api/auth/callback/portal-bff");
            assertThat(portal.getProviderDetails().getConfigurationMetadata().get("end_session_endpoint"))
                    .isEqualTo("https://auth.example.test/logout");
            assertThat(admin.getClientId()).isEqualTo("admin-bff");
            assertThat(admin.getClientSecret()).isEqualTo("admin-test-secret");
            assertThat(admin.getRedirectUri()).isEqualTo("https://admin.example.test/api/auth/callback/admin-bff");
            assertThat(portal.getAuthorizationGrantType().getValue()).isEqualTo("authorization_code");
            assertThat(admin.getAuthorizationGrantType().getValue()).isEqualTo("authorization_code");
        });
    }

    @Test
    void failsFastWhenADeployedCredentialIsMissing() {
        contextRunner
                .withPropertyValues("smart-business.identity.oidc.admin-client-secret=")
                .run(context -> assertThat(context)
                        .hasFailed()
                        .getFailure()
                        .rootCause()
                        .hasMessageContaining("adminClientSecret"));
    }

    @Test
    void rejectsPartialProviderOverridesAndUnsafeApplicationDestinations() {
        contextRunner
                .withPropertyValues(
                        "smart-business.identity.oidc.end-session-uri=",
                        "smart-business.identity.oidc.portal-post-logout-uri=https://untrusted.example.test/next")
                .run(context -> assertThat(context).hasFailed());
    }
}
