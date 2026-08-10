package com.smartbusiness.identity;

import com.smartbusiness.identity.api.AuthenticatedIdentity;
import com.smartbusiness.identity.api.PlatformIdentity;
import com.smartbusiness.identity.api.PlatformUserStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "platform_user")
class PlatformUserEntity {

    @Id
    private UUID id;

    @Convert(converter = PlatformUserStatusConverter.class)
    @Column(nullable = false, length = 16)
    private PlatformUserStatus status;

    @Column(name = "display_name", nullable = false, length = 200)
    private String displayName;

    @Column(name = "verified_email", length = 320)
    private String verifiedEmail;

    @Column(name = "verified_email_at")
    private Instant verifiedEmailAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "last_authenticated_at", nullable = false)
    private Instant lastAuthenticatedAt;

    @Column(name = "disabled_at")
    private Instant disabledAt;

    protected PlatformUserEntity() {}

    private PlatformUserEntity(AuthenticatedIdentity identity, Instant now) {
        this.id = UUID.randomUUID();
        this.status = PlatformUserStatus.ACTIVE;
        this.displayName = identity.displayName();
        this.verifiedEmail = identity.verifiedEmail();
        this.verifiedEmailAt = identity.verifiedEmail() == null ? null : now;
        this.createdAt = now;
        this.updatedAt = now;
        this.lastAuthenticatedAt = identity.authenticatedAt();
    }

    static PlatformUserEntity create(AuthenticatedIdentity identity, Instant now) {
        return new PlatformUserEntity(identity, now);
    }

    void refreshProfile(AuthenticatedIdentity identity, Instant now) {
        displayName = identity.displayName();
        if (identity.verifiedEmail() == null) {
            verifiedEmail = null;
            verifiedEmailAt = null;
        } else if (!identity.verifiedEmail().equals(verifiedEmail)) {
            verifiedEmail = identity.verifiedEmail();
            verifiedEmailAt = now;
        }
        updatedAt = now;
        lastAuthenticatedAt = identity.authenticatedAt();
    }

    PlatformIdentity toApi() {
        return new PlatformIdentity(id, status, displayName, verifiedEmail, lastAuthenticatedAt);
    }

    UUID id() {
        return id;
    }
}
