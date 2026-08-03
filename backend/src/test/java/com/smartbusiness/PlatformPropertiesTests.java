package com.smartbusiness;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

class PlatformPropertiesTests {

    private final ApplicationContextRunner contextRunner =
            new ApplicationContextRunner().withUserConfiguration(PropertiesConfiguration.class);

    @Test
    void bindsValidPlatformConfiguration() {
        contextRunner
                .withPropertyValues(
                        "smart-business.environment=test", "smart-business.public-base-url=http://localhost")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context.getBean(PlatformProperties.class).environment())
                            .isEqualTo("test");
                });
    }

    @Test
    void failsFastWhenRequiredConfigurationIsMissing() {
        contextRunner.run(context -> assertThat(context)
                .hasFailed()
                .getFailure()
                .rootCause()
                .hasMessageContaining("smart-business.environment"));
    }

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(PlatformProperties.class)
    static class PropertiesConfiguration {}
}
