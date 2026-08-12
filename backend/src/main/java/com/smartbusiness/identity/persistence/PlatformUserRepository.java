package com.smartbusiness.identity.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlatformUserRepository extends JpaRepository<PlatformUserEntity, UUID> {}
