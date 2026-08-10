package com.smartbusiness.identity;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component("oidcAuthenticationSuccessHandler")
public class OidcAuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private static final Logger logger = LoggerFactory.getLogger(OidcAuthenticationSuccessHandler.class);

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
        logger.info(
                "OIDC login succeeded surface={} registrationId={} subjectFingerprint={} correlationId={}",
                surface.name().toLowerCase(),
                oidcAuthentication.getAuthorizedClientRegistrationId(),
                subjectFingerprint(oidcAuthentication.getName()),
                MDC.get("correlationId"));
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        response.sendRedirect(returnTarget);
    }

    private String subjectFingerprint(String subject) {
        try {
            var digest = MessageDigest.getInstance("SHA-256").digest(subject.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest, 0, 12);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is required by the Java runtime.", exception);
        }
    }
}
