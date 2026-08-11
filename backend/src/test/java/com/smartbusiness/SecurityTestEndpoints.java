package com.smartbusiness;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SecurityTestEndpoints {

    @GetMapping("/api/public/booking-placeholder")
    public String publicEndpoint() {
        return "public";
    }

    @GetMapping("/api/private/test")
    public String privateEndpoint() {
        return "private";
    }

    @PostMapping("/api/private/test")
    public String stateChangingPrivateEndpoint() {
        return "updated";
    }
}
