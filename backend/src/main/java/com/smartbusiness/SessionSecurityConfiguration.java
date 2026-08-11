package com.smartbusiness;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;

@Configuration(proxyBeanMethods = false)
class SessionSecurityConfiguration {

    @Bean
    CookieSerializer sessionCookieSerializer(
            PlatformProperties platformProperties, SessionSecurityProperties sessionProperties) {
        var serializer = new DefaultCookieSerializer();
        var deployed = "deployed".equals(platformProperties.environment());
        serializer.setCookieName(deployed ? "__Host-SBSESSION" : "SBSESSION");
        serializer.setCookiePath("/");
        serializer.setUseHttpOnlyCookie(true);
        serializer.setUseSecureCookie(deployed);
        serializer.setSameSite("Lax");
        serializer.setCookieMaxAge(
                Math.toIntExact(sessionProperties.absoluteTimeout().toSeconds()));
        return serializer;
    }
}
