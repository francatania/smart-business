package com.smartbusiness;

import org.junit.jupiter.api.Test;

class SmartBusinessApplicationTests {

    @Test
    void exposesApplicationIdentity() {
        var controller = new SystemInfoController("smart-business", "0.1.0-SNAPSHOT");

        var response = controller.systemInfo();

        org.assertj.core.api.Assertions.assertThat(response.name()).isEqualTo("smart-business");
        org.assertj.core.api.Assertions.assertThat(response.version()).isEqualTo("0.1.0-SNAPSHOT");
    }
}
