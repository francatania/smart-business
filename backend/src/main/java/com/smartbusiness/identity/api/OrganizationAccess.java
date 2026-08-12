package com.smartbusiness.identity.api;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

/** An active organization relationship and its server-calculated capabilities. */
public record OrganizationAccess(
        @NotNull UUID organizationId, @NotNull List<String> capabilities) {

    public OrganizationAccess {
        capabilities = List.copyOf(capabilities);
    }
}
