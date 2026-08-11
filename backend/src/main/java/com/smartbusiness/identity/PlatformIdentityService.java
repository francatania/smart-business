package com.smartbusiness.identity;

import com.smartbusiness.identity.api.AuthenticatedIdentity;
import com.smartbusiness.identity.api.PlatformIdentity;
import com.smartbusiness.identity.api.PlatformIdentityDirectory;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
class PlatformIdentityService implements PlatformIdentityDirectory {

    private static final int MAXIMUM_PROVISIONING_ATTEMPTS = 3;

    private final PlatformUserRepository platformUsers;
    private final ExternalIdentityRepository externalIdentities;
    private final TransactionTemplate transactionTemplate;
    private final Clock clock;

    PlatformIdentityService(
            PlatformUserRepository platformUsers,
            ExternalIdentityRepository externalIdentities,
            TransactionTemplate transactionTemplate,
            Clock clock) {
        this.platformUsers = platformUsers;
        this.externalIdentities = externalIdentities;
        this.transactionTemplate = transactionTemplate;
        this.clock = clock;
    }

    @Override
    public PlatformIdentity resolve(AuthenticatedIdentity authenticatedIdentity) {
        DataIntegrityViolationException collision = null;
        for (var attempt = 0; attempt < MAXIMUM_PROVISIONING_ATTEMPTS; attempt++) {
            try {
                return transactionTemplate.execute(status -> resolveInTransaction(authenticatedIdentity));
            } catch (DataIntegrityViolationException exception) {
                if (!isExternalIdentityCollision(exception)) {
                    throw exception;
                }
                collision = exception;
            }
        }
        throw new IllegalStateException(
                "Could not resolve a concurrent external identity after %d attempts."
                        .formatted(MAXIMUM_PROVISIONING_ATTEMPTS),
                collision);
    }

    @Override
    public Optional<PlatformIdentity> findByUserId(UUID userId) {
        return platformUsers.findById(userId).map(PlatformUserEntity::toApi);
    }

    private PlatformIdentity resolveInTransaction(AuthenticatedIdentity identity) {
        var now = Instant.now(clock);
        var externalIdentity =
                externalIdentities.findByIssuerAndSubject(identity.issuer().toString(), identity.subject());
        if (externalIdentity.isPresent()) {
            var existing = externalIdentity.orElseThrow();
            existing.platformUser().refreshProfile(identity, now);
            existing.recordAuthentication(identity.authenticatedAt());
            return existing.platformUser().toApi();
        }

        var platformUser = platformUsers.save(PlatformUserEntity.create(identity, now));
        externalIdentities.saveAndFlush(new ExternalIdentityEntity(platformUser, identity, now));
        return platformUser.toApi();
    }

    private boolean isExternalIdentityCollision(DataIntegrityViolationException exception) {
        var rootCause = NestedExceptionUtils.getMostSpecificCause(exception);
        return rootCause instanceof java.sql.SQLException sqlException && "23505".equals(sqlException.getSQLState());
    }
}
