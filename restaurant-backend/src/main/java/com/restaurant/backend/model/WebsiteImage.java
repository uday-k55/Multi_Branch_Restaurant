package com.restaurant.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "website_images")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WebsiteImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "page", nullable = false)
    private String page;

    @Column(name = "section", nullable = false)
    private String section;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "image_url", nullable = false, columnDefinition = "LONGTEXT")
    private String imageUrl;

    @Column(name = "description")
    private String description;
}
