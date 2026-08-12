package com.smartbusiness.identity.api;

import java.util.List;
import java.util.UUID;

/** Boundary implemented by the Organizations module to resolve active organization capabilities. */
public interface OrganizationAccessResolver {

    List<OrganizationAccess> resolveActiveAccess(UUID platformUserId);
}
