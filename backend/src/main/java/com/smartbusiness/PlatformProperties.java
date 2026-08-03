package com.smartbusiness;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("smart-business")
public record PlatformProperties(
        @NotBlank String environment, @NotNull URI publicBaseUrl) {}
