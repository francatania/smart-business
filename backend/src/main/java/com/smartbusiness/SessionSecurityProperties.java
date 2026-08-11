package com.smartbusiness;

import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("smart-business.session")
public record SessionSecurityProperties(@NotNull Duration absoluteTimeout) {

    public SessionSecurityProperties {
        if (absoluteTimeout == null || absoluteTimeout.isNegative() || absoluteTimeout.isZero()) {
            throw new IllegalArgumentException("absoluteTimeout must be positive");
        }
    }
}
