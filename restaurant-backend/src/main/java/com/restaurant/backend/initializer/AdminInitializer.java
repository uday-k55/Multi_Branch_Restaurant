package com.restaurant.backend.initializer;

import com.restaurant.backend.model.User;
import com.restaurant.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    public AdminInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder, org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        try {
            jdbcTemplate.execute("ALTER TABLE notifications MODIFY notification_type VARCHAR(100) NOT NULL");
        } catch (Exception e) {
            try {
                jdbcTemplate.execute("ALTER TABLE notifications MODIFY COLUMN notification_type VARCHAR(100) NOT NULL");
            } catch (Exception ignored) {}
        }
        try {
            jdbcTemplate.execute("ALTER TABLE payments MODIFY COLUMN payment_method ENUM('CARD','UPI','CASH','NET_BANKING','WALLET','DEMO') NOT NULL");
        } catch (Exception e) {
            try {
                jdbcTemplate.execute("ALTER TABLE payments MODIFY COLUMN payment_method VARCHAR(50) NOT NULL");
            } catch (Exception ignored) {}
        }
        try {
            jdbcTemplate.execute("ALTER TABLE orders MODIFY COLUMN status ENUM('PLACED','CONFIRMED','PREPARING','READY','AVAILABLE_FOR_DELIVERY','ACCEPTED','PICKED_UP','OUT_FOR_DELIVERY','DELIVERED','COMPLETED','CANCELLED') NOT NULL");
        } catch (Exception e) {
            try {
                jdbcTemplate.execute("ALTER TABLE orders MODIFY COLUMN status VARCHAR(50) NOT NULL");
            } catch (Exception ignored) {}
        }
        userRepository.findByEmail("admin1@gmail.com").ifPresentOrElse(admin -> {
            if (admin.getRole() == null || admin.getRole() != com.restaurant.backend.model.Role.ADMIN) {
                admin.setRole(com.restaurant.backend.model.Role.ADMIN);
                userRepository.save(admin);
            }
        }, () -> {
            User admin1 = new User();
            admin1.setFirstName("Admin");
            admin1.setLastName("One");
            admin1.setEmail("admin1@gmail.com");
            admin1.setPassword(passwordEncoder.encode("admin@1"));
            admin1.setGender("male");
            admin1.setPhoneNumber("1234567890");
            admin1.setRole(com.restaurant.backend.model.Role.ADMIN);
            userRepository.save(admin1);
            System.out.println("Default Admin User 1 (admin1@gmail.com) created.");
        });

        userRepository.findByEmail("admin2@gmail.com").ifPresentOrElse(admin -> {
            if (admin.getRole() == null || admin.getRole() != com.restaurant.backend.model.Role.ADMIN) {
                admin.setRole(com.restaurant.backend.model.Role.ADMIN);
                userRepository.save(admin);
            }
        }, () -> {
            User admin2 = new User();
            admin2.setFirstName("Admin");
            admin2.setLastName("Two");
            admin2.setEmail("admin2@gmail.com");
            admin2.setPassword(passwordEncoder.encode("admin@2"));
            admin2.setGender("female");
            admin2.setPhoneNumber("0987654321");
            admin2.setRole(com.restaurant.backend.model.Role.ADMIN);
            userRepository.save(admin2);
            System.out.println("Default Admin User 2 (admin2@gmail.com) created.");
        });
    }
}
