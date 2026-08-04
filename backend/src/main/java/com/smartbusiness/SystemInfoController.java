package com.smartbusiness;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/system")
class SystemInfoController {

    private final String applicationName;
    private final String buildVersion;

    SystemInfoController(
            @Value("${info.application.name}") String applicationName,
            @Value("${info.application.version}") String buildVersion) {
        this.applicationName = applicationName;
        this.buildVersion = buildVersion;
    }

    @GetMapping("/info")
    SystemInfo systemInfo() {
        return new SystemInfo(applicationName, buildVersion);
    }

    record SystemInfo(String name, String version) {}
}
