package com.smartbusiness;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class OpenApiConfiguration {

    @Bean
    OpenAPI smartBusinessOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Smart Business API")
                        .description("HTTP contract shared by the Smart Business browser applications.")
                        .version("0.1.0"));
    }
}
