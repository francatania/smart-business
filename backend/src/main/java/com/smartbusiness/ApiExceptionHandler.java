package com.smartbusiness;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice
final class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> handleUnexpectedException(Exception exception, HttpServletRequest request) {
        var correlationId = ApiProblemDetails.correlationId(request);
        logger.error(
                "unhandled request failure exceptionType={} correlationId={}",
                exception.getClass().getName(),
                correlationId);

        var problem = ApiProblemDetails.create(
                HttpStatus.INTERNAL_SERVER_ERROR, "internal_error", "An unexpected error occurred.", request);
        return ResponseEntity.status(problem.getStatus()).body(problem);
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception exception, Object body, HttpHeaders headers, HttpStatusCode statusCode, WebRequest webRequest) {
        var request = ((ServletWebRequest) webRequest).getRequest();
        var code = statusCode.is4xxClientError() ? "request_invalid" : "request_failed";
        var detail = body instanceof ProblemDetail supplied && supplied.getDetail() != null
                ? supplied.getDetail()
                : "The request could not be processed.";
        var problem = ApiProblemDetails.create(statusCode, code, detail, request);
        return super.handleExceptionInternal(exception, problem, headers, statusCode, webRequest);
    }
}
