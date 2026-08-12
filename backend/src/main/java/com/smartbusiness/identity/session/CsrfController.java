package com.smartbusiness.identity.session;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class CsrfController {

    private final CsrfTokenRepository csrfTokens;

    CsrfController(CsrfTokenRepository csrfTokens) {
        this.csrfTokens = csrfTokens;
    }

    @GetMapping("/csrf")
    ResponseEntity<CsrfTokenResponse> csrf(HttpServletRequest request, HttpServletResponse response) {
        var token = csrfTokens.loadDeferredToken(request, response).get();
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(new CsrfTokenResponse(token.getToken(), token.getHeaderName(), token.getParameterName()));
    }

    record CsrfTokenResponse(String token, String headerName, String parameterName) {}
}
