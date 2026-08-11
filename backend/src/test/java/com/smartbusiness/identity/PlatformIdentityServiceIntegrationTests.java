package com.smartbusiness.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.smartbusiness.identity.api.AuthenticatedIdentity;
import com.smartbusiness.identity.api.PlatformIdentityDirectory;
import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
@Tag("integration")
class PlatformIdentityServiceIntegrationTests {

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(DockerImageName.parse("postgres:18.4-bookworm"))
            .withDatabaseName("smart_business")
            .withUsername("smart_business")
            .withPassword("smart-business-test-password");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> POSTGRES.getJdbcUrl() + "&currentSchema=smart_business");
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private PlatformIdentityDirectory identities;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @AfterEach
    void clearIdentityData() {
        jdbcTemplate.execute("TRUNCATE external_identity, platform_user");
    }

    @Test
    void preservesTheStableMappingWhileRefreshingPermittedProfileClaims() {
        var first = identities.resolve(identity("subject-1", "First name", "first@example.test"));
        var repeated = identities.resolve(identity("subject-1", "Updated name", "updated@example.test"));

        assertThat(repeated.userId()).isEqualTo(first.userId());
        assertThat(repeated.displayName()).isEqualTo("Updated name");
        assertThat(repeated.verifiedEmail()).isEqualTo("updated@example.test");
        assertThat(count("platform_user")).isEqualTo(1);
        assertThat(count("external_identity")).isEqualTo(1);
    }

    @Test
    void doesNotLinkDistinctIdentitiesByTheirEmailAddress() {
        var first = identities.resolve(identity("subject-a", "First user", "shared@example.test"));
        var second = identities.resolve(identity("subject-b", "Second user", "shared@example.test"));

        assertThat(second.userId()).isNotEqualTo(first.userId());
        assertThat(count("platform_user")).isEqualTo(2);
        assertThat(count("external_identity")).isEqualTo(2);
    }

    @Test
    void concurrentFirstLoginsResolveToOnePlatformUser() throws Exception {
        var workers = 8;
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(workers)) {
            var futures = new ArrayList<java.util.concurrent.Future<java.util.UUID>>();
            for (var worker = 0; worker < workers; worker++) {
                futures.add(executor.submit(() -> {
                    start.await();
                    return identities
                            .resolve(identity("concurrent-subject", "Concurrent user", "user@example.test"))
                            .userId();
                }));
            }

            start.countDown();
            var userIds = new ArrayList<java.util.UUID>();
            for (var future : futures) {
                userIds.add(future.get());
            }

            assertThat(userIds).hasSize(workers).containsOnly(userIds.getFirst());
            assertThat(count("platform_user")).isEqualTo(1);
            assertThat(count("external_identity")).isEqualTo(1);
        }
    }

    private AuthenticatedIdentity identity(String subject, String displayName, String verifiedEmail) {
        return new AuthenticatedIdentity(
                URI.create("https://auth.example.test/realms/smart-business"),
                subject,
                displayName,
                verifiedEmail,
                Instant.parse("2026-08-10T12:00:00Z"));
    }

    private int count(String table) {
        return jdbcTemplate.queryForObject("SELECT count(*) FROM " + table, Integer.class);
    }
}
