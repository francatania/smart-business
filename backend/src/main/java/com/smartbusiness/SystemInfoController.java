package com.smartbusiness;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/system")
@Tag(name = "System")
class SystemInfoController {

    private final String applicationName;
    private final String buildVersion;

    SystemInfoController(
            @Value("${info.application.name}") String applicationName,
            @Value("${info.application.version}") String buildVersion) {
        this.applicationName = applicationName;
        this.buildVersion = buildVersion;
    }

    @GetMapping(value = "/info", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Get public application build information")
    SystemInfo systemInfo() {
        return new SystemInfo(applicationName, buildVersion);
    }

    record SystemInfo(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String name,

            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            String version) {}
}
