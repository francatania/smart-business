package com.smartbusiness;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
class AbsoluteSessionTimeoutFilter extends OncePerRequestFilter {

    private final SessionSecurityProperties sessionProperties;
    private final Clock clock;

    AbsoluteSessionTimeoutFilter(SessionSecurityProperties sessionProperties, Clock identityClock) {
        this.sessionProperties = sessionProperties;
        this.clock = identityClock;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        var session = request.getSession(false);
        if (session != null && !expiresAt(session.getCreationTime()).isAfter(Instant.now(clock))) {
            session.invalidate();
        }
        filterChain.doFilter(request, response);
    }

    private Instant expiresAt(long creationTime) {
        return Instant.ofEpochMilli(creationTime).plus(sessionProperties.absoluteTimeout());
    }
}
