from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def test_website_opens():

    options = Options()
    options.add_argument("--start-maximized")

    driver = webdriver.Chrome(options=options)

    try:
        driver.get("http://localhost:4200/")

        print("Page Title:", driver.title)
        print("Current URL:", driver.current_url)

        assert driver.current_url == "http://localhost:4200/"

    finally:
        driver.quit()


def test_valid_login():

    options = Options()
    options.add_argument("--start-maximized")

    driver = webdriver.Chrome(options=options)

    try:
        # Open login page
        driver.get("http://localhost:4200/login")

        # Wait until email field is visible
        wait = WebDriverWait(driver, 10)

        email = wait.until(
            EC.visibility_of_element_located((By.ID, "email"))
        )

        password = wait.until(
            EC.visibility_of_element_located((By.ID, "password"))
        )

        # Enter login credentials
        email.send_keys("admin2@gmail.com")
        password.send_keys("admin@2")

        # Click Login button
        login_button = wait.until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, "button[type='submit']")
            )
        )

        login_button.click()

        # Wait for navigation after login
        wait.until(
            lambda d: d.current_url != "http://localhost:4200/login"
        )

        print("Login successful")
        print("Current URL:", driver.current_url)

        # Verify that we are no longer on login page
        assert "/login" not in driver.current_url

    finally:
        driver.quit()