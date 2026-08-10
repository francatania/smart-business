package com.smartbusiness.identity;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class IdentityConfiguration {

    @Bean
    Clock identityClock() {
        return Clock.systemUTC();
    }
}
