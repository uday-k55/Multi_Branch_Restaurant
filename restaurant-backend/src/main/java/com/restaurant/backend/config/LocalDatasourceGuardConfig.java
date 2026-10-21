package com.restaurant.backend.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;

import javax.sql.DataSource;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Safety Guard configuration active ONLY when the 'local' profile is selected.
 *
 * Guarantees that:
 * 1. The local backend communicates exclusively with local WAMP MySQL (localhost or 127.0.0.1).
 * 2. Any unexpected remote datasource or cloud database (such as Aiven) in local mode causes
 *    an immediate, safe startup refusal before opening connections or executing queries.
 * 3. In production, this profile is inactive and this guard is omitted entirely.
 */
@Configuration
@Profile("local")
public class LocalDatasourceGuardConfig implements BeanPostProcessor {

    private static final Logger log = LoggerFactory.getLogger(LocalDatasourceGuardConfig.class);
    private static final Pattern JDBC_HOST_PATTERN = Pattern.compile("jdbc:mysql://([^:/\\?]+)");

    private final Environment environment;
    private boolean validated = false;

    public LocalDatasourceGuardConfig(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    public void validateOnStartup() {
        validateDatasourceSafety();
    }

    @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
        if (bean instanceof DataSource && !validated) {
            validateDatasourceSafety();
            validated = true;
        }
        return bean;
    }

    private void validateDatasourceSafety() {
        String url = environment.getProperty("spring.datasource.url");
        if (url == null || url.trim().isEmpty()) {
            throw new IllegalStateException(
                "[SAFETY REFUSAL] 'local' profile is active, but 'spring.datasource.url' is not configured."
            );
        }

        String normalizedUrl = url.trim().toLowerCase();

        // Check for known remote/cloud database identifiers (e.g. Aiven)
        if (normalizedUrl.contains("aivencloud.com") || normalizedUrl.contains("aiven")) {
            throw new IllegalStateException(
                "[SAFETY REFUSAL] Online Aiven MySQL host detected while running in 'local' profile! " +
                "Refusing startup immediately to prevent accidental remote database operations."
            );
        }

        // Extract and verify host from the JDBC URL
        Matcher matcher = JDBC_HOST_PATTERN.matcher(url);
        if (matcher.find()) {
            String host = matcher.group(1).trim().toLowerCase();
            boolean isAllowedLocalHost = host.equals("localhost") || host.equals("127.0.0.1");
            if (!isAllowedLocalHost) {
                throw new IllegalStateException(
                    "[SAFETY REFUSAL] 'local' profile is active, but datasource host '" + host + "' " +
                    "is not localhost or 127.0.0.1! Refusing startup to prevent unintended database connections."
                );
            }
        } else {
            // Fallback check if regex didn't match standard pattern
            boolean containsLocal = normalizedUrl.contains("//localhost") || normalizedUrl.contains("//127.0.0.1");
            if (!containsLocal) {
                throw new IllegalStateException(
                    "[SAFETY REFUSAL] 'local' profile is active, but datasource URL does not target localhost or 127.0.0.1! " +
                    "Refusing startup to protect remote databases."
                );
            }
        }

        log.info("[SAFETY GUARD] Local profile verified: Datasource strictly targets local MySQL ({})", url.split("\\?")[0]);
    }
}
