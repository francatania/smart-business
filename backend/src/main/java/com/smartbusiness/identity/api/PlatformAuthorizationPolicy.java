package com.smartbusiness.identity.api;

import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;

/** Authorization policy used by the platform security filter chain. */
public interface PlatformAuthorizationPolicy extends AuthorizationManager<RequestAuthorizationContext> {}
