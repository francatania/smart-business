package com.smartbusiness;

import static org.assertj.core.api.Assertions.assertThat;

import com.smartbusiness.identity.configuration.SessionSecurityProperties;
import java.net.URI;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.session.web.http.CookieSerializer;

class SessionSecurityConfigurationTests {

    private final SessionSecurityConfiguration configuration = new SessionSecurityConfiguration();
    private final SessionSecurityProperties sessionProperties = new SessionSecurityProperties(Duration.ofDays(90));

    @Test
    void localCookieSupportsHttpDevelopmentWithoutBroadDomainScope() {
        var header = writeCookie("local");

        assertThat(header).startsWith("SBSESSION=");
        assertThat(header).contains("Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=7776000");
        assertThat(header).doesNotContain("Domain=", "Secure");
    }

    @Test
    void deployedCookieUsesTheHostPrefixAndSecureAttributes() {
        var header = writeCookie("deployed");

        assertThat(header).startsWith("__Host-SBSESSION=");
        assertThat(header).contains("Path=/", "HttpOnly", "SameSite=Lax", "Secure", "Max-Age=7776000");
        assertThat(header).doesNotContain("Domain=");
    }

    private String writeCookie(String environment) {
        var serializer = configuration.sessionCookieSerializer(
                new PlatformProperties(environment, URI.create("https://smart-business.example.test")),
                sessionProperties);
        var request = new MockHttpServletRequest();
        var response = new MockHttpServletResponse();
        serializer.writeCookieValue(new CookieSerializer.CookieValue(request, response, "session-id"));
        return response.getHeader("Set-Cookie");
    }
}
