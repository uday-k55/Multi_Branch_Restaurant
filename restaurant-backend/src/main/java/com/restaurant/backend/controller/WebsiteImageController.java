package com.restaurant.backend.controller;

import com.restaurant.backend.model.WebsiteImage;
import com.restaurant.backend.repository.WebsiteImageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/admin/website-images")
public class WebsiteImageController {

    @Autowired
    private WebsiteImageRepository websiteImageRepository;

    @GetMapping
    public ResponseEntity<List<WebsiteImage>> getAllImages() {
        List<WebsiteImage> images = websiteImageRepository.findAll();
        if (images.isEmpty()) {
            // Seed initial existing website attraction images for demonstration and immediate management
            List<WebsiteImage> initialList = new ArrayList<>();
            initialList.add(new WebsiteImage(null, "Home", "Hero / Carousel", "Main promotional image", "img/hero-food.png", "Main promotional food plate in hero banner"));
            initialList.add(new WebsiteImage(null, "Home", "Chef Section", "Chef image", "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400", "Master executive chef profile"));
            initialList.add(new WebsiteImage(null, "Home", "Food Section", "Food image", "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1400", "Special deal burger promotional showcase"));
            initialList.add(new WebsiteImage(null, "About", "Restaurant / Chef Section", "About image", "https://images.unsplash.com/photo-1544025162-d76694265947?w=600", "Artisan cooking story and restaurant kitchen"));
            initialList.add(new WebsiteImage(null, "Other", "Promotional Section", "Relevant image", "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600", "Fine dining interior and ambiance"));
            images = websiteImageRepository.saveAll(initialList);
        }
        return ResponseEntity.ok(images);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<WebsiteImage> addImage(@RequestBody WebsiteImage image) {
        if (image.getPage() == null || image.getPage().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page name is required");
        }
        if (image.getSection() == null || image.getSection().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Section name is required");
        }
        if (image.getImageUrl() == null || image.getImageUrl().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image URL or data is required");
        }
        if (image.getTitle() == null || image.getTitle().isBlank()) {
            image.setTitle("Promotional Image");
        }
        WebsiteImage saved = websiteImageRepository.save(image);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<WebsiteImage> updateImage(@PathVariable Long id, @RequestBody WebsiteImage request) {
        WebsiteImage existing = websiteImageRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Website image not found with ID: " + id));

        if (request.getPage() != null && !request.getPage().isBlank()) {
            existing.setPage(request.getPage());
        }
        if (request.getSection() != null && !request.getSection().isBlank()) {
            existing.setSection(request.getSection());
        }
        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            existing.setTitle(request.getTitle());
        }
        if (request.getImageUrl() != null && !request.getImageUrl().isBlank()) {
            existing.setImageUrl(request.getImageUrl());
        }
        if (request.getDescription() != null) {
            existing.setDescription(request.getDescription());
        }

        WebsiteImage saved = websiteImageRepository.save(existing);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteImage(@PathVariable Long id) {
        WebsiteImage existing = websiteImageRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Website image not found with ID: " + id));
        websiteImageRepository.delete(existing);
        return ResponseEntity.noContent().build();
    }
}
