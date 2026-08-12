package com.smartbusiness.identity;

import com.smartbusiness.identity.api.CurrentActor;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.NotNull;
import java.util.Optional;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class SessionController {

    private final CurrentActorService currentActors;

    SessionController(CurrentActorService currentActors) {
        this.currentActors = currentActors;
    }

    @GetMapping("/session")
    ResponseEntity<SessionResponse> session(Authentication authentication, HttpServletRequest request) {
        var actor = authenticatedActor(authentication, request);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(new SessionResponse(actor.isPresent(), actor.orElse(null)));
    }

    private Optional<CurrentActor> authenticatedActor(Authentication authentication, HttpServletRequest request) {
        if (!(authentication instanceof OAuth2AuthenticationToken oidcAuthentication)) {
            return Optional.empty();
        }
        return currentActors.resolve(oidcAuthentication, request.getSession());
    }

    record SessionResponse(@NotNull Boolean authenticated, CurrentActor actor) {}
}
