package com.smartbusiness;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;
import static org.assertj.core.api.Assertions.assertThat;

import com.tngtech.archunit.core.importer.ClassFileImporter;
import org.junit.jupiter.api.Test;

class ModuleEnforcementFixturesTests {

    @Test
    void rejectsCyclesAndAccessToInternalPackages() {
        var fixtureClasses = new ClassFileImporter().importPackages("org.example.invalidmodules");

        var cycleResult = slices().matching("org.example.invalidmodules.(*)..")
                .should()
                .beFreeOfCycles()
                .evaluate(fixtureClasses);
        var internalAccessResult = noClasses()
                .that()
                .resideOutsideOfPackage("..beta..")
                .should()
                .dependOnClassesThat()
                .resideInAPackage("..beta.internal..")
                .evaluate(fixtureClasses);

        assertThat(cycleResult.hasViolation()).isTrue();
        assertThat(internalAccessResult.hasViolation()).isTrue();
    }
}
