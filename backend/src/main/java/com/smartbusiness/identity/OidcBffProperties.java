package com.smartbusiness.identity;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("smart-business.identity.oidc")
public record OidcBffProperties(
        @NotNull URI issuerUri,
        URI authorizationUri,
        URI tokenUri,
        URI jwkSetUri,
        URI endSessionUri,
        @NotBlank String portalClientSecret,
        @NotNull URI portalCallbackUri,
        @NotNull URI portalPostLogoutUri,
        @NotBlank String adminClientSecret,
        @NotNull URI adminCallbackUri,
        @NotNull URI adminPostLogoutUri) {

    @AssertTrue(message = "provider endpoint overrides must be supplied together")
    public boolean isProviderEndpointOverridesComplete() {
        var supplied = 0;
        supplied += authorizationUri == null ? 0 : 1;
        supplied += tokenUri == null ? 0 : 1;
        supplied += jwkSetUri == null ? 0 : 1;
        supplied += endSessionUri == null ? 0 : 1;
        return supplied == 0 || supplied == 4;
    }

    @AssertTrue(message = "OIDC URLs must be absolute HTTP(S) URLs with exact backend callback paths")
    public boolean isUrlsSafe() {
        return isHttpUrl(issuerUri)
                && isOptionalHttpUrl(authorizationUri)
                && isOptionalHttpUrl(tokenUri)
                && isOptionalHttpUrl(jwkSetUri)
                && isOptionalHttpUrl(endSessionUri)
                && isCallback(portalCallbackUri, "/api/auth/callback/portal-bff")
                && isPostLogoutUri(portalPostLogoutUri)
                && isCallback(adminCallbackUri, "/api/auth/callback/admin-bff")
                && isPostLogoutUri(adminPostLogoutUri);
    }

    boolean hasProviderEndpointOverrides() {
        return authorizationUri != null && tokenUri != null && jwkSetUri != null && endSessionUri != null;
    }

    URI postLogoutUri(AuthSurface surface) {
        return switch (surface) {
            case PORTAL -> portalPostLogoutUri;
            case ADMIN -> adminPostLogoutUri;
        };
    }

    private boolean isCallback(URI value, String expectedPath) {
        return isHttpUrl(value)
                && expectedPath.equals(value.getPath())
                && value.getRawQuery() == null
                && value.getRawFragment() == null;
    }

    private boolean isPostLogoutUri(URI value) {
        return isHttpUrl(value)
                && "/".equals(value.getPath())
                && value.getRawQuery() == null
                && value.getRawFragment() == null;
    }

    private boolean isOptionalHttpUrl(URI value) {
        return value == null || isHttpUrl(value);
    }

    private boolean isHttpUrl(URI value) {
        return value != null
                && value.isAbsolute()
                && value.getHost() != null
                && ("http".equals(value.getScheme()) || "https".equals(value.getScheme()))
                && value.getUserInfo() == null;
    }
}
