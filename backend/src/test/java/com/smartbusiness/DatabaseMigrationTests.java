package com.smartbusiness;

import static org.assertj.core.api.Assertions.assertThat;

import io.micrometer.core.instrument.MeterRegistry;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
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

    @Test
    void migratesAndValidatesTheSchemaRepeatedly() {
        flyway.validate();
        assertThat(flyway.migrate().migrationsExecuted).isZero();

        var sessionTables = jdbcTemplate.queryForObject("""
                SELECT count(*)
                FROM information_schema.tables
                WHERE table_schema = 'smart_business'
                  AND table_name IN ('spring_session', 'spring_session_attributes')
                """, Integer.class);

        assertThat(sessionTables).isEqualTo(2);
        assertThat(environment.getProperty("spring.jpa.hibernate.ddl-auto")).isEqualTo("validate");
        assertThat(environment.getProperty("spring.session.jdbc.initialize-schema"))
                .isEqualTo("never");
        assertThat(meterRegistry.find("jvm.memory.used").meter()).isNotNull();
        assertThat(meterRegistry.find("jdbc.connections.max").meter()).isNotNull();
        assertThat(meterRegistry.find("hikaricp.connections").meter()).isNotNull();
    }
}
