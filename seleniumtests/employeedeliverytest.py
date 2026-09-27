from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def test_employee_can_accept_delivery():

    options = Options()
    options.add_argument("--start-maximized")

    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 30)

    try:

        # --------------------------------------------------
        # STEP 1: EMPLOYEE LOGIN
        # --------------------------------------------------

        driver.get("http://localhost:4200/login")

        print("Login page opened")

        email = wait.until(
            EC.visibility_of_element_located(
                (By.ID, "email")
            )
        )

        password = wait.until(
            EC.visibility_of_element_located(
                (By.ID, "password")
            )
        )

        email.send_keys("emp2@gmail.com")
        password.send_keys("emp@1")

        login_button = wait.until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, "button[type='submit']")
            )
        )

        login_button.click()

        print("Employee login submitted")

        wait.until(
            lambda d: "/login" not in d.current_url
        )

        print("Employee login successful")
        print("URL after login:", driver.current_url)


        # --------------------------------------------------
        # STEP 2: OPEN EMPLOYEE PAGE
        # --------------------------------------------------

        driver.get("http://localhost:4200/employee")

        print("Employee delivery page opened")

        wait.until(
            lambda d: "/employee" in d.current_url
        )

        print("Employee page URL:", driver.current_url)


        # --------------------------------------------------
        # STEP 3: VERIFY EMPLOYEE PAGE
        # --------------------------------------------------

        page_heading = wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//*[contains(normalize-space(), "
                    "'Employee Delivery Operations') "
                    "or contains(normalize-space(), "
                    "'Delivery Operations') "
                    "or contains(normalize-space(), "
                    "'Deliveries')]"
                )
            )
        )

        print("Employee page loaded")
        print("Heading:", page_heading.text)


        # --------------------------------------------------
        # STEP 4: FIND AVAILABLE DELIVERIES
        # --------------------------------------------------

        available_section = wait.until(
            EC.presence_of_element_located(
                (
                    By.XPATH,
                    "//*[contains(normalize-space(), "
                    "'Available Deliveries')]"
                )
            )
        )

        print("Available Deliveries section found")

        assert "Available Deliveries" in available_section.text


        # --------------------------------------------------
        # STEP 5: CHECK FOR DELIVERY
        # --------------------------------------------------

        accept_buttons = driver.find_elements(
            By.XPATH,
            "//button[contains(normalize-space(), "
            "'Accept Delivery')]"
        )


        # --------------------------------------------------
        # NO DELIVERY AVAILABLE
        # --------------------------------------------------

        if not accept_buttons:

            print()
            print("==========================================")
            print("NO DELIVERY AVAILABLE")
            print("==========================================")
            print(
                "There is nothing to deliver at the moment."
            )
            print(
                "No delivery is currently available "
                "for this employee."
            )
            print("==========================================")

            return


        # --------------------------------------------------
        # STEP 6: DELIVERY AVAILABLE
        # --------------------------------------------------

        print("Delivery available")

        accept_button = accept_buttons[0]

        print("Accept Delivery button found")


        # --------------------------------------------------
        # STEP 7: DISPLAY DELIVERY DETAILS
        # --------------------------------------------------

        try:

            delivery_card = accept_button.find_element(
                By.XPATH,
                "./ancestor::div[contains(@class, 'card')][1]"
            )

            print()
            print("Delivery Details:")
            print("------------------------------------------")
            print(delivery_card.text)
            print("------------------------------------------")

        except Exception:

            print("Could not read delivery details.")


        # --------------------------------------------------
        # STEP 8: ACCEPT DELIVERY
        # --------------------------------------------------

        driver.execute_script(
            "arguments[0].scrollIntoView({block: 'center'});",
            accept_button
        )

        driver.execute_script(
            "arguments[0].click();",
            accept_button
        )

        print("Accept Delivery button clicked")


        # --------------------------------------------------
        # STEP 9: VERIFY ACTIVE DELIVERY
        # --------------------------------------------------

        wait.until(
            EC.presence_of_element_located(
                (
                    By.XPATH,
                    "//*[contains(normalize-space(), "
                    "'My Active Deliveries')]"
                )
            )
        )

        print("My Active Deliveries section found")


        # --------------------------------------------------
        # STEP 10: VERIFY DELIVERY ACCEPTED
        # --------------------------------------------------

        wait.until(
            lambda d: len(
                d.find_elements(
                    By.XPATH,
                    "//button[contains(normalize-space(), "
                    "'Accept Delivery')]"
                )
            ) == 0
        )

        print("Delivery successfully accepted")


        # --------------------------------------------------
        # FINAL RESULT
        # --------------------------------------------------

        print()
        print("==========================================")
        print("EMPLOYEE DELIVERY TEST PASSED")
        print("==========================================")
        print("Delivery was available and accepted.")
        print("==========================================")


    finally:

        driver.quit()