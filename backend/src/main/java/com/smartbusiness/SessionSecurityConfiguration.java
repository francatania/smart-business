package com.smartbusiness;

import com.smartbusiness.identity.api.SessionSecurityPolicy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;

@Configuration(proxyBeanMethods = false)
class SessionSecurityConfiguration {

    @Bean
    CookieSerializer sessionCookieSerializer(
            PlatformProperties platformProperties, SessionSecurityPolicy sessionSecurityPolicy) {
        var serializer = new DefaultCookieSerializer();
        var deployed = "deployed".equals(platformProperties.environment());
        serializer.setCookieName(deployed ? "__Host-SBSESSION" : "SBSESSION");
        serializer.setCookiePath("/");
        serializer.setUseHttpOnlyCookie(true);
        serializer.setUseSecureCookie(deployed);
        serializer.setSameSite("Lax");
        serializer.setCookieMaxAge(
                Math.toIntExact(sessionSecurityPolicy.absoluteTimeout().toSeconds()));
        return serializer;
    }
}
