package com.smartbusiness.identity;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.net.URI;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class LogoutController {

    private final CoordinatedLogoutService logout;

    LogoutController(CoordinatedLogoutService logout) {
        this.logout = logout;
    }

    @PostMapping("/logout")
    @Operation(operationId = "logout", summary = "End the local application session and initiate OIDC logout")
    @ApiResponses({
        @ApiResponse(responseCode = "302", description = "Redirect to the configured OIDC end-session endpoint"),
        @ApiResponse(responseCode = "204", description = "No authenticated OIDC session required provider logout"),
        @ApiResponse(responseCode = "403", description = "Missing or invalid CSRF token")
    })
    ResponseEntity<Void> logout(
            Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
        return logout.logout(request, response, authentication)
                .map(this::redirectToEndSession)
                .orElseGet(() -> ResponseEntity.noContent()
                        .cacheControl(CacheControl.noStore())
                        .build());
    }

    private ResponseEntity<Void> redirectToEndSession(URI target) {
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(target)
                .cacheControl(CacheControl.noStore())
                .build();
    }
}
