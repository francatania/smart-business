package com.smartbusiness.identity;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface ExternalIdentityRepository extends JpaRepository<ExternalIdentityEntity, UUID> {

    Optional<ExternalIdentityEntity> findByIssuerAndSubject(String issuer, String subject);
}
