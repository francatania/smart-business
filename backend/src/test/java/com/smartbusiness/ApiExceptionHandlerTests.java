package com.smartbusiness;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

class ApiExceptionHandlerTests {

    @Test
    void returnsSafeStandardProblemDetails() throws Exception {
        var mockMvc = MockMvcBuilders.standaloneSetup(new FailingController())
                .setControllerAdvice(new ApiExceptionHandler())
                .addFilters(new CorrelationIdFilter())
                .build();

        mockMvc.perform(get("/api/test/failure").header(CorrelationIdFilter.HEADER_NAME, "problem-test-1"))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(header().string(CorrelationIdFilter.HEADER_NAME, "problem-test-1"))
                .andExpect(jsonPath("$.type").value("urn:smart-business:problem:internal_error"))
                .andExpect(jsonPath("$.title").value("Internal Server Error"))
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.detail").value("An unexpected error occurred."))
                .andExpect(jsonPath("$.instance").value("/api/test/failure"))
                .andExpect(jsonPath("$.code").value("internal_error"))
                .andExpect(jsonPath("$.correlationId").value("problem-test-1"))
                .andExpect(content()
                        .string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("do-not-expose"))));
    }

    @RestController
    static class FailingController {

        @GetMapping("/api/test/failure")
        void fail() {
            throw new IllegalStateException("do-not-expose");
        }
    }
}
