package com.smartbusiness.identity.authentication;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/login")
public class AuthLoginController {

    private final AuthReturnTargets returnTargets;

    AuthLoginController(AuthReturnTargets returnTargets) {
        this.returnTargets = returnTargets;
    }

    @GetMapping("/{surface:portal|admin}")
    @Operation(operationId = "initiateLogin", summary = "Start the Portal or Administration OIDC login flow")
    @ApiResponses({
        @ApiResponse(responseCode = "302", description = "Redirect to the selected confidential OIDC client"),
        @ApiResponse(responseCode = "404", description = "Unknown application surface")
    })
    ResponseEntity<Void> login(
            @Parameter(in = ParameterIn.PATH, required = true, schema = @Schema(allowableValues = {"portal", "admin"}))
                    @PathVariable
                    String surface,
            @Parameter(description = "Allowlisted relative destination after login") @RequestParam(required = false)
                    String returnTo,
            HttpServletRequest request) {
        var authSurface = AuthSurface.fromExternalName(surface);
        returnTargets.remember(request, authSurface, returnTo);
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create("/oauth2/authorization/" + authSurface.registrationId()))
                .cacheControl(CacheControl.noStore())
                .build();
    }
}
