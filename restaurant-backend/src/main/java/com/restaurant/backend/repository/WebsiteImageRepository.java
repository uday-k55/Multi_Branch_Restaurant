package com.restaurant.backend.repository;

import com.restaurant.backend.model.WebsiteImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WebsiteImageRepository extends JpaRepository<WebsiteImage, Long> {
    List<WebsiteImage> findByPage(String page);
}
