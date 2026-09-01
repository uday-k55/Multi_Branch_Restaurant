package com.restaurant.backend.util;

import com.restaurant.backend.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtils {

    private static final String SECRET_STRING = "RestaurantManagementSystemSecretKeyForJWTAuth256BitsLongMinimumLength!";
    private static final long EXPIRATION_MS = 86400000L; // 24 Hours

    private final SecretKey key = Keys.hmacShaKeyFor(SECRET_STRING.getBytes(StandardCharsets.UTF_8));

    public String generateToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + EXPIRATION_MS);

        var claims = Jwts.claims()
                .subject(user.getEmail())
                .add("id", user.getId())
                .add("email", user.getEmail())
                .add("role", user.getRole() != null ? user.getRole().name() : "CUSTOMER")
                .add("branchId", user.getBranch() != null ? user.getBranch().getId() : null)
                .build();

        return Jwts.builder()
                .claims(claims)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    public String getEmailFromToken(String token) {
        return getClaims(token).getSubject();
    }

    public String getRoleFromToken(String token) {
        return getClaims(token).get("role", String.class);
    }

    public Long getBranchIdFromToken(String token) {
        Object bId = getClaims(token).get("branchId");
        if (bId instanceof Number) {
            return ((Number) bId).longValue();
        }
        return null;
    }

    public boolean validateToken(String token) {
        try {
            Claims claims = getClaims(token);
            return !claims.getExpiration().before(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
