package com.smartbusiness.identity;

import com.smartbusiness.identity.api.AuthenticatedIdentity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "external_identity")
class ExternalIdentityEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "platform_user_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "external_identity_platform_user_fk"))
    private PlatformUserEntity platformUser;

    @Column(nullable = false, length = 512)
    private String issuer;

    @Column(nullable = false, length = 255)
    private String subject;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "last_authenticated_at", nullable = false)
    private Instant lastAuthenticatedAt;

    protected ExternalIdentityEntity() {}

    ExternalIdentityEntity(PlatformUserEntity platformUser, AuthenticatedIdentity identity, Instant now) {
        this.id = UUID.randomUUID();
        this.platformUser = platformUser;
        this.issuer = identity.issuer().toString();
        this.subject = identity.subject();
        this.createdAt = now;
        this.lastAuthenticatedAt = identity.authenticatedAt();
    }

    void recordAuthentication(Instant authenticatedAt) {
        lastAuthenticatedAt = authenticatedAt;
    }

    PlatformUserEntity platformUser() {
        return platformUser;
    }
}
