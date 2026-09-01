package com.restaurant.backend.repository;

import com.restaurant.backend.model.Branch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BranchRepository extends JpaRepository<Branch, Long> {
    List<Branch> findByActiveTrue();

    List<Branch> findByStateAndDistrictAndActiveTrue(String state, String district);

    List<Branch> findByStateAndActiveTrue(String state);

    List<Branch> findByStateAndDistrict(String state, String district);

    List<Branch> findByState(String state);

    @Query("SELECT DISTINCT b.state FROM Branch b WHERE b.active = true")
    List<String> findDistinctStates();

    @Query("SELECT DISTINCT b.district FROM Branch b WHERE b.state = :state AND b.active = true")
    List<String> findDistinctDistrictsByState(@Param("state") String state);
}
