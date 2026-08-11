package com.smartbusiness;

import static org.assertj.core.api.Assertions.assertThat;

import io.micrometer.core.instrument.MeterRegistry;
import java.time.Duration;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;
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
class DatabaseMigrationTests {

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
    private Flyway flyway;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private Environment environment;

    @Autowired
    private MeterRegistry meterRegistry;

    @Autowired
    @SuppressWarnings("rawtypes")
    private SessionRepository sessionRepository;

    @Test
    void migratesAndValidatesTheSchemaRepeatedly() {
        flyway.validate();
        assertThat(flyway.migrate().migrationsExecuted).isZero();

        var tables = jdbcTemplate.queryForObject("""
                SELECT count(*)
                FROM information_schema.tables
                WHERE table_schema = 'smart_business'
                  AND table_name IN (
                    'spring_session',
                    'spring_session_attributes',
                    'platform_user',
                    'external_identity'
                  )
                """, Integer.class);

        assertThat(tables).isEqualTo(4);
        assertThat(environment.getProperty("spring.jpa.hibernate.ddl-auto")).isEqualTo("validate");
        assertThat(environment.getProperty("spring.session.jdbc.initialize-schema"))
                .isEqualTo("never");
        assertThat(meterRegistry.find("jvm.memory.used").meter()).isNotNull();
        assertThat(meterRegistry.find("jdbc.connections.max").meter()).isNotNull();
        assertThat(meterRegistry.find("hikaricp.connections").meter()).isNotNull();
    }

    @Test
    void persistsSessionStateInPostgresqlForAnotherBackendInstanceToRead() {
        Session session = sessionRepository.createSession();
        session.setAttribute("authenticated-user", "platform-user-id");
        sessionRepository.save(session);

        var restored = sessionRepository.findById(session.getId());

        assertThat(restored).isNotNull();
        assertThat((String) restored.getAttribute("authenticated-user")).isEqualTo("platform-user-id");
        assertThat(restored.getMaxInactiveInterval()).isEqualTo(Duration.ofDays(30));
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM spring_session", Integer.class))
                .isEqualTo(1);
    }
}
