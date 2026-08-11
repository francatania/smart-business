package com.smartbusiness;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({PlatformProperties.class, SessionSecurityProperties.class})
public class SmartBusinessApplication {

    public static void main(String[] args) {
        SpringApplication.run(SmartBusinessApplication.class, args);
    }
}
