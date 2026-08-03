package com.smartbusiness;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import tools.jackson.databind.ObjectMapper;

@Configuration(proxyBeanMethods = false)
class SecurityConfiguration {

    @Bean
    SecurityFilterChain applicationSecurity(HttpSecurity http, ObjectMapper objectMapper) throws Exception {
        return http.authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/api/system/info", "/v3/api-docs/**", "/error")
                        .permitAll()
                        .requestMatchers("/actuator/health/**", "/actuator/info", "/actuator/prometheus")
                        .permitAll()
                        .anyRequest()
                        .authenticated())
                .csrf(Customizer.withDefaults())
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, exception) -> writeProblem(
                                objectMapper,
                                response,
                                ApiProblemDetails.create(
                                        HttpStatus.UNAUTHORIZED,
                                        "authentication_required",
                                        "Authentication is required to access this resource.",
                                        request)))
                        .accessDeniedHandler((request, response, exception) -> writeProblem(
                                objectMapper,
                                response,
                                ApiProblemDetails.create(
                                        HttpStatus.FORBIDDEN,
                                        "access_denied",
                                        "The authenticated user cannot access this resource.",
                                        request))))
                .build();
    }

    private void writeProblem(ObjectMapper objectMapper, HttpServletResponse response, ProblemDetail problem)
            throws IOException {
        response.setStatus(problem.getStatus());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), problem);
    }
}
