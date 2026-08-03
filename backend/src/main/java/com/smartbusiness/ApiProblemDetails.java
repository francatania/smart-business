package com.smartbusiness;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;

final class ApiProblemDetails {

    private ApiProblemDetails() {}

    static ProblemDetail create(HttpStatusCode statusCode, String code, String detail, HttpServletRequest request) {
        var problem = ProblemDetail.forStatusAndDetail(statusCode, detail);
        problem.setType(URI.create("urn:smart-business:problem:" + code));
        problem.setTitle(HttpStatus.valueOf(statusCode.value()).getReasonPhrase());
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("code", code);
        problem.setProperty("correlationId", correlationId(request));
        return problem;
    }

    static String correlationId(HttpServletRequest request) {
        var value = request.getAttribute(CorrelationIdFilter.REQUEST_ATTRIBUTE);
        return value instanceof String correlationId ? correlationId : "unavailable";
    }
}
