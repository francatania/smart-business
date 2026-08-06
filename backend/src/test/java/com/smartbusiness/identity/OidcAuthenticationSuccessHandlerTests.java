package com.smartbusiness.identity;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;

class OidcAuthenticationSuccessHandlerTests {

    @Test
    void redirectsToTheServerSideTargetWithoutReturningTokens() throws Exception {
        var returnTargets = new AuthReturnTargets();
        var handler = new OidcAuthenticationSuccessHandler(returnTargets);
        var request = new MockHttpServletRequest();
        var response = new MockHttpServletResponse();
        returnTargets.remember(request, AuthSurface.PORTAL, "/appointments");
        var authorities = Set.of(new SimpleGrantedAuthority("OIDC_USER"));
        var principal = new DefaultOAuth2User(authorities, Map.of("sub", "test-subject"), "sub");
        var authentication = new OAuth2AuthenticationToken(principal, authorities, "portal-bff");

        handler.onAuthenticationSuccess(request, response, authentication);

        assertThat(response.getRedirectedUrl()).isEqualTo("/appointments");
        assertThat(response.getHeader(HttpHeaders.CACHE_CONTROL)).isEqualTo("no-store");
        assertThat(response.getContentAsString()).isEmpty();
        assertThat(response.getHeaderNames())
                .noneMatch(name -> name.toLowerCase().contains("token"));
    }
}
