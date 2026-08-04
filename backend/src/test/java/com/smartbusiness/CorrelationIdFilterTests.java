package com.smartbusiness;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

@ExtendWith(OutputCaptureExtension.class)
class CorrelationIdFilterTests {

    private final CorrelationIdFilter filter = new CorrelationIdFilter();

    @Test
    void propagatesSafeCallerCorrelationIdWithoutLoggingSensitiveRequestValues(CapturedOutput output) throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/system/info");
        request.addHeader(CorrelationIdFilter.HEADER_NAME, "booking-request-42");
        request.addHeader("Authorization", "Bearer representative-sensitive-token");
        request.setQueryString("password=representative-password");
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getHeader(CorrelationIdFilter.HEADER_NAME)).isEqualTo("booking-request-42");
        assertThat(output).contains("correlationId=booking-request-42");
        assertThat(output).doesNotContain("representative-sensitive-token", "representative-password");
    }

    @Test
    void replacesUnsafeCorrelationId() throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/system/info");
        request.addHeader(CorrelationIdFilter.HEADER_NAME, "unsafe value with spaces");
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getHeader(CorrelationIdFilter.HEADER_NAME))
                .matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");
    }
}
