package com.smartbusiness;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.servlet.http.HttpSession;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class AbsoluteSessionTimeoutFilterTests {

    @Test
    void invalidatesSessionsAtTheAbsoluteLifetimeBoundary() throws Exception {
        var now = Instant.parse("2026-08-11T12:00:00Z");
        var filter = new AbsoluteSessionTimeoutFilter(
                new SessionSecurityProperties(Duration.ofDays(90)), Clock.fixed(now, ZoneOffset.UTC));
        var expiredSession = sessionCreatedAt(now.minus(Duration.ofDays(90)));
        var request = new MockHttpServletRequest();
        request.setSession(expiredSession);

        filter.doFilter(request, new MockHttpServletResponse(), (ignoredRequest, ignoredResponse) -> {});

        verify(expiredSession).invalidate();
    }

    private HttpSession sessionCreatedAt(Instant creationTime) {
        var session = mock(HttpSession.class);
        when(session.getCreationTime()).thenReturn(creationTime.toEpochMilli());
        return session;
    }
}
