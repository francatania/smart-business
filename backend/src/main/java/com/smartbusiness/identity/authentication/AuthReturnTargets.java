package com.smartbusiness.identity.authentication;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import org.springframework.stereotype.Component;

@Component
public class AuthReturnTargets {

    private static final int MAXIMUM_LENGTH = 2048;
    private static final String SESSION_ATTRIBUTE_PREFIX = "smart-business.auth.return-target.";

    String validateOrDefault(AuthSurface surface, String candidate) {
        return isAllowed(surface, candidate) ? candidate : surface.defaultReturnTarget();
    }

    void remember(HttpServletRequest request, AuthSurface surface, String candidate) {
        request.getSession().setAttribute(sessionAttribute(surface), validateOrDefault(surface, candidate));
    }

    String consume(HttpServletRequest request, AuthSurface surface) {
        var session = request.getSession(false);
        if (session == null) {
            return surface.defaultReturnTarget();
        }
        var attribute = sessionAttribute(surface);
        var saved = session.getAttribute(attribute);
        session.removeAttribute(attribute);
        return saved instanceof String value ? validateOrDefault(surface, value) : surface.defaultReturnTarget();
    }

    private boolean isAllowed(AuthSurface surface, String candidate) {
        if (candidate == null || candidate.isBlank() || candidate.length() > MAXIMUM_LENGTH) {
            return false;
        }
        var decoded = candidate;
        for (var pass = 0; pass < 3; pass++) {
            if (containsUnsafeSyntax(decoded)) {
                return false;
            }
            try {
                var uri = URI.create(decoded);
                if (uri.isAbsolute()
                        || uri.getRawAuthority() != null
                        || uri.getRawFragment() != null
                        || !surface.allows(uri.getPath())) {
                    return false;
                }
            } catch (IllegalArgumentException exception) {
                return false;
            }

            var next = decode(decoded);
            if (next == null) {
                return false;
            }
            if (next.equals(decoded)) {
                return true;
            }
            decoded = next;
        }
        return false;
    }

    private boolean containsUnsafeSyntax(String value) {
        if (!value.startsWith("/") || value.startsWith("//") || value.contains("\\") || value.contains("://")) {
            return true;
        }
        return value.chars().anyMatch(character -> character < 0x20 || character == 0x7f);
    }

    private String decode(String value) {
        try {
            return URLDecoder.decode(value, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private String sessionAttribute(AuthSurface surface) {
        return SESSION_ATTRIBUTE_PREFIX + surface.registrationId();
    }
}
