package com.smartbusiness.identity;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;

class AuthReturnTargetsTests {

    private final AuthReturnTargets returnTargets = new AuthReturnTargets();

    @Test
    void preservesOnlyRoutesOwnedByTheInitiatingApplication() {
        assertThat(returnTargets.validateOrDefault(AuthSurface.PORTAL, "/appointments?view=next"))
                .isEqualTo("/appointments?view=next");
        assertThat(returnTargets.validateOrDefault(AuthSurface.ADMIN, "/metrics"))
                .isEqualTo("/metrics");
        assertThat(returnTargets.validateOrDefault(AuthSurface.PORTAL, "/metrics"))
                .isEqualTo("/book");
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "https://attacker.example/path",
                "//attacker.example/path",
                "/\\attacker.example/path",
                "/appointments#fragment",
                "/%2f%2fattacker.example/path",
                "/%252f%252fattacker.example/path",
                "/appointments%0d%0aLocation:%20https://attacker.example",
                "/appointments?next=https%3A%2F%2Fattacker.example",
                "/unknown"
            })
    void replacesMalformedOrExternalTargetsWithTheSafeDefault(String candidate) {
        assertThat(returnTargets.validateOrDefault(AuthSurface.PORTAL, candidate))
                .isEqualTo("/book");
    }

    @Test
    void consumesTheSavedTargetOnlyOnce() {
        var request = new MockHttpServletRequest();
        returnTargets.remember(request, AuthSurface.ADMIN, "/customers");

        assertThat(returnTargets.consume(request, AuthSurface.ADMIN)).isEqualTo("/customers");
        assertThat(returnTargets.consume(request, AuthSurface.ADMIN)).isEqualTo("/calendar");
    }
}
