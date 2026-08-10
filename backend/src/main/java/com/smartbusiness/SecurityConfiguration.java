package com.smartbusiness;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.savedrequest.NullRequestCache;
import tools.jackson.databind.ObjectMapper;

@Configuration(proxyBeanMethods = false)
class SecurityConfiguration {

    private static final Logger logger = LoggerFactory.getLogger(SecurityConfiguration.class);

    @Bean
    OAuth2AuthorizedClientRepository authorizedClientRepository() {
        return new HttpSessionOAuth2AuthorizedClientRepository();
    }

    @Bean
    SessionAuthenticationStrategy sessionAuthenticationStrategy() {
        return new ChangeSessionIdAuthenticationStrategy();
    }

    @Bean
    SecurityFilterChain applicationSecurity(
            HttpSecurity http,
            ObjectMapper objectMapper,
            OAuth2AuthorizedClientRepository authorizedClientRepository,
            SessionAuthenticationStrategy sessionAuthenticationStrategy,
            @Qualifier("oidcAuthenticationSuccessHandler") AuthenticationSuccessHandler authenticationSuccessHandler)
            throws Exception {
        return http.authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(
                                "/api/system/info",
                                "/api/public/**",
                                "/api/auth/login/**",
                                "/oauth2/authorization/**",
                                "/api/auth/callback/**",
                                "/v3/api-docs/**",
                                "/error")
                        .permitAll()
                        .requestMatchers("/actuator/health/**", "/actuator/info", "/actuator/prometheus")
                        .permitAll()
                        .anyRequest()
                        .authenticated())
                .csrf(Customizer.withDefaults())
                .requestCache(cache -> cache.requestCache(new NullRequestCache()))
                .sessionManagement(session -> session.sessionAuthenticationStrategy(sessionAuthenticationStrategy))
                .oauth2Login(oauth -> oauth.authorizedClientRepository(authorizedClientRepository)
                        .redirectionEndpoint(endpoint -> endpoint.baseUri("/api/auth/callback/*"))
                        .successHandler(authenticationSuccessHandler)
                        .failureHandler((request, response, exception) -> {
                            logger.warn(
                                    "OIDC callback failed exceptionType={} errorCode={} correlationId={}",
                                    exception.getClass().getName(),
                                    oidcErrorCode(exception),
                                    ApiProblemDetails.correlationId(request));
                            writeProblem(
                                    objectMapper,
                                    response,
                                    ApiProblemDetails.create(
                                            HttpStatus.UNAUTHORIZED,
                                            "authentication_failed",
                                            "Authentication could not be completed.",
                                            request));
                        }))
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

    private String oidcErrorCode(Exception exception) {
        return exception instanceof OAuth2AuthenticationException oauthException
                ? oauthException.getError().getErrorCode()
                : "unavailable";
    }
}
