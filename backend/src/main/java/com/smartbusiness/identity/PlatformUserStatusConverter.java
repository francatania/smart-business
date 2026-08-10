package com.smartbusiness.identity;

import com.smartbusiness.identity.api.PlatformUserStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
class PlatformUserStatusConverter implements AttributeConverter<PlatformUserStatus, String> {

    @Override
    public String convertToDatabaseColumn(PlatformUserStatus attribute) {
        return attribute == null ? null : attribute.name().toLowerCase();
    }

    @Override
    public PlatformUserStatus convertToEntityAttribute(String databaseValue) {
        return databaseValue == null ? null : PlatformUserStatus.valueOf(databaseValue.toUpperCase());
    }
}
