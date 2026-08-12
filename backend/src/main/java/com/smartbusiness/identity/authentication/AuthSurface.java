package com.smartbusiness.identity.authentication;

import java.util.Set;

public enum AuthSurface {
    PORTAL("portal", "portal-bff", "/book", Set.of("/book", "/appointments", "/professional/schedule")),
    ADMIN("admin", "admin-bff", "/calendar", Set.of("/calendar", "/customers", "/configuration", "/metrics"));

    private final String externalName;
    private final String registrationId;
    private final String defaultReturnTarget;
    private final Set<String> allowedPaths;

    AuthSurface(String externalName, String registrationId, String defaultReturnTarget, Set<String> allowedPaths) {
        this.externalName = externalName;
        this.registrationId = registrationId;
        this.defaultReturnTarget = defaultReturnTarget;
        this.allowedPaths = allowedPaths;
    }

    public String externalName() {
        return externalName;
    }

    public String registrationId() {
        return registrationId;
    }

    public String defaultReturnTarget() {
        return defaultReturnTarget;
    }

    public boolean allows(String path) {
        return allowedPaths.contains(path);
    }

    public static AuthSurface fromExternalName(String value) {
        for (var surface : values()) {
            if (surface.externalName.equals(value)) {
                return surface;
            }
        }
        throw new IllegalArgumentException("Unknown authentication surface");
    }

    public static AuthSurface fromRegistrationId(String value) {
        for (var surface : values()) {
            if (surface.registrationId.equals(value)) {
                return surface;
            }
        }
        throw new IllegalArgumentException("Unknown OIDC registration");
    }
}
