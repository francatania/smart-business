package com.smartbusiness.identity;

import java.util.Map;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistration.ClientSettings;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.ClientRegistrations;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(OidcBffProperties.class)
class OidcClientConfiguration {

    @Bean
    ClientRegistrationRepository clientRegistrationRepository(OidcBffProperties properties) {
        var portal = registrationBuilder(properties)
                .registrationId(AuthSurface.PORTAL.registrationId())
                .clientId(AuthSurface.PORTAL.registrationId())
                .clientSecret(properties.portalClientSecret())
                .redirectUri(properties.portalCallbackUri().toString())
                .clientName("Portal BFF")
                .build();
        var admin = ClientRegistration.withClientRegistration(portal)
                .registrationId(AuthSurface.ADMIN.registrationId())
                .clientId(AuthSurface.ADMIN.registrationId())
                .clientSecret(properties.adminClientSecret())
                .redirectUri(properties.adminCallbackUri().toString())
                .clientName("Administration BFF")
                .build();
        return new InMemoryClientRegistrationRepository(portal, admin);
    }

    private ClientRegistration.Builder registrationBuilder(OidcBffProperties properties) {
        ClientRegistration.Builder builder;
        if (properties.hasProviderEndpointOverrides()) {
            builder = ClientRegistration.withRegistrationId(AuthSurface.PORTAL.registrationId())
                    .authorizationUri(properties.authorizationUri().toString())
                    .tokenUri(properties.tokenUri().toString())
                    .jwkSetUri(properties.jwkSetUri().toString())
                    .providerConfigurationMetadata(Map.of(
                            "end_session_endpoint", properties.endSessionUri().toString()))
                    .issuerUri(properties.issuerUri().toString())
                    .userNameAttributeName("sub");
        } else {
            builder = ClientRegistrations.fromIssuerLocation(
                    properties.issuerUri().toString());
        }
        return builder.clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .clientSettings(ClientSettings.builder().requireProofKey(true).build())
                .scope("openid", "profile", "email");
    }
}
