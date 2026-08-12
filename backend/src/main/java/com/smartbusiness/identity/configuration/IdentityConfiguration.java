package com.smartbusiness.identity.configuration;

import com.smartbusiness.identity.api.OrganizationAccessResolver;
import java.time.Clock;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(SessionSecurityProperties.class)
class IdentityConfiguration {

    @Bean
    Clock identityClock() {
        return Clock.systemUTC();
    }

    @Bean
    @ConditionalOnMissingBean(OrganizationAccessResolver.class)
    OrganizationAccessResolver noOrganizationAccessResolver() {
        return platformUserId -> List.of();
    }
}
