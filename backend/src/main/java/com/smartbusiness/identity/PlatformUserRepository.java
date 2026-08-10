package com.smartbusiness.identity;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface PlatformUserRepository extends JpaRepository<PlatformUserEntity, UUID> {}
