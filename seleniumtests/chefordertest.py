from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException


def test_chef_confirms_order():

    # ---------------------------------------
    # 1. Start Chrome
    # ---------------------------------------

    options = Options()
    options.add_argument("--start-maximized")

    driver = webdriver.Chrome(options=options)

    wait = WebDriverWait(driver, 15)

    try:

        # ---------------------------------------
        # 2. Open Login Page
        # ---------------------------------------

        driver.get("http://localhost:4200/login")

        print("Login page opened")

        # ---------------------------------------
        # 3. Enter Chef Login Credentials
        # ---------------------------------------

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

        # CHANGE THESE TO YOUR CHEF ACCOUNT
        email.send_keys("chef2@gmail.com")
        password.send_keys("chef@2")

        # ---------------------------------------
        # 4. Click Login
        # ---------------------------------------

        login_button = wait.until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, "button[type='submit']")
            )
        )

        login_button.click()

        print("Chef login submitted")

        # ---------------------------------------
        # 5. Wait for Login to Complete
        # ---------------------------------------

        wait.until(
            lambda d: "/login" not in d.current_url
        )

        print("Login successful")
        print("URL after login:", driver.current_url)

        # ---------------------------------------
        # 6. Open Chef Dashboard
        # ---------------------------------------

        driver.get("http://localhost:4200/chef")

        # ---------------------------------------
        # 7. Verify Chef Dashboard
        # ---------------------------------------

        heading = wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//h2[contains(., 'Kitchen Display System')]"
                )
            )
        )

        print("Chef dashboard opened")
        print("Heading:", heading.text)

        assert "Kitchen Display System" in heading.text

        # ---------------------------------------
        # 8. Find New Orders Section
        # ---------------------------------------

        new_orders = wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//span[contains(normalize-space(), 'New Orders')]"
                )
            )
        )

        print("New Orders section found")

        # ---------------------------------------
        # 9. Find Confirm Order Button
        # ---------------------------------------

        try:

            confirm_button = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable(
                    (
                        By.XPATH,
                        "//button[contains(normalize-space(), 'Confirm Order')]"
                    )
                )
            )

        except TimeoutException:

            print("No PLACED orders are currently available.")

            raise AssertionError(
                "Test cannot continue because there is no "
                "PLACED order for the chef to confirm."
            )

        # ---------------------------------------
        # 10. Get Order Information
        # ---------------------------------------

        order_card = confirm_button.find_element(
            By.XPATH,
            "./ancestor::div[contains(@class,'card-body')][1]"
        )

        order_text_before = order_card.text

        print("Order found:")
        print(order_text_before)

        # ---------------------------------------
        # 11. Click Confirm Order
        # ---------------------------------------

        confirm_button.click()

        print("Confirm Order button clicked")

        # ---------------------------------------
        # 12. Wait for Order Status Update
        # ---------------------------------------

        wait.until(
            EC.staleness_of(confirm_button)
        )

        # ---------------------------------------
        # 13. Verify Order Moved to Confirmed
        # ---------------------------------------

        confirmed_section = wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//span[contains(normalize-space(), 'Confirmed')]"
                )
            )
        )

        print("Confirmed section found")

        # Wait until at least one Start Preparing button appears
        start_preparing_button = wait.until(
            EC.presence_of_element_located(
                (
                    By.XPATH,
                    "//button[contains(normalize-space(), 'Start Preparing')]"
                )
            )
        )

        print("Order successfully moved to CONFIRMED")

        assert start_preparing_button.is_displayed()

        print("TEST PASSED: Chef confirmed the order")

    finally:

        # ---------------------------------------
        # 14. Close Browser
        # ---------------------------------------

        driver.quit()
        