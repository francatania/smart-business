package com.smartbusiness.identity.persistence;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExternalIdentityRepository extends JpaRepository<ExternalIdentityEntity, UUID> {

    @EntityGraph(attributePaths = "platformUser")
    Optional<ExternalIdentityEntity> findByIssuerAndSubject(String issuer, String subject);
}
