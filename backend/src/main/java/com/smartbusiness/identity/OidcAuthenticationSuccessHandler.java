package com.smartbusiness.identity;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component("oidcAuthenticationSuccessHandler")
public class OidcAuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final AuthReturnTargets returnTargets;

    public OidcAuthenticationSuccessHandler(AuthReturnTargets returnTargets) {
        this.returnTargets = returnTargets;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException, ServletException {
        var oidcAuthentication = (OAuth2AuthenticationToken) authentication;
        var surface = AuthSurface.fromRegistrationId(oidcAuthentication.getAuthorizedClientRegistrationId());
        var returnTarget = returnTargets.consume(request, surface);
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        response.sendRedirect(returnTarget);
    }
}
