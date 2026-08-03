package com.smartbusiness;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

class ApplicationModulesTests {

    @Test
    void verifiesTheProductionModuleGraph() {
        var modules = ApplicationModules.of(SmartBusinessApplication.class);

        modules.verify();
        assertThat(modules.stream().map(module -> module.getIdentifier().toString()))
                .containsExactlyInAnyOrder(
                        "identity",
                        "organization",
                        "scheduling",
                        "customer",
                        "servicerecord",
                        "media",
                        "notification",
                        "ai",
                        "reporting");
    }
}
