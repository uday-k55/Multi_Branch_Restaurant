from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def test_customer_can_order_food():

    options = Options()
    options.add_argument("--start-maximized")

    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 30)

    try:

        # --------------------------------------------------
        # STEP 1: Customer Login
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

        email.send_keys("tony@gmail.com")
        password.send_keys("Tony@1")

        login_button = wait.until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, "button[type='submit']")
            )
        )

        login_button.click()

        print("Customer login submitted")

        wait.until(
            lambda d: "/login" not in d.current_url
        )

        print("Customer login successful")
        print("URL after login:", driver.current_url)


        # --------------------------------------------------
        # STEP 2: Open Menu
        # --------------------------------------------------

        driver.get("http://localhost:4200/menu")

        print("Menu page opened")

        menu_heading = wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//h1[contains(normalize-space(), 'Our Menu')]"
                )
            )
        )

        print("Menu heading:", menu_heading.text)

        assert "Our Menu" in menu_heading.text


        # --------------------------------------------------
        # STEP 3: Find Food
        # --------------------------------------------------

        add_to_cart_button = wait.until(
            EC.presence_of_element_located(
                (
                    By.XPATH,
                    "//button[contains(normalize-space(), 'Add to Cart')]"
                )
            )
        )

        print("Food item found")

        food_card = add_to_cart_button.find_element(
            By.XPATH,
            "./ancestor::div[contains(@class,'card')][1]"
        )

        food_name = food_card.find_element(
            By.CSS_SELECTOR,
            "h5.card-title"
        ).text

        print("Selected food:", food_name)


        # --------------------------------------------------
        # STEP 4: Add Food To Cart
        # --------------------------------------------------

        driver.execute_script(
            "arguments[0].scrollIntoView({block: 'center'});",
            add_to_cart_button
        )

        driver.execute_script(
            "arguments[0].click();",
            add_to_cart_button
        )

        print("Food added to cart")


        # --------------------------------------------------
        # STEP 5: Verify Food In Cart
        # --------------------------------------------------

        in_cart_text = wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//span[contains(normalize-space(), '1 in Cart')]"
                )
            )
        )

        assert "1 in Cart" in in_cart_text.text

        print("Food quantity confirmed in cart")


        # --------------------------------------------------
        # STEP 6: Click Cart From Navbar
        # --------------------------------------------------

        cart_button = wait.until(
            EC.element_to_be_clickable(
                (
                    By.CSS_SELECTOR,
                    "a[routerLink='/checkout']"
                )
            )
        )

        print("Cart button found")

        driver.execute_script(
            "arguments[0].scrollIntoView({block: 'center'});",
            cart_button
        )

        driver.execute_script(
            "arguments[0].click();",
            cart_button
        )

        print("Cart button clicked")


        # --------------------------------------------------
        # STEP 7: Verify Checkout Page
        # --------------------------------------------------

        wait.until(
            lambda d: "/checkout" in d.current_url
        )

        print("Checkout page opened")

        checkout_heading = wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//h1[contains(normalize-space(), 'Checkout & Order')]"
                )
            )
        )

        print("Checkout heading:", checkout_heading.text)

        assert "Checkout & Order" in checkout_heading.text


        # --------------------------------------------------
        # STEP 8: Verify Order Details
        # --------------------------------------------------

        order_details = wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//h5[contains(normalize-space(), 'Order Details')]"
                )
            )
        )

        print("Order details displayed")

        assert "Order Details" in order_details.text


        # --------------------------------------------------
        # STEP 9: Select Takeaway
        # --------------------------------------------------

        takeaway_button = wait.until(
            EC.presence_of_element_located(
                (
                    By.XPATH,
                    "//button[@type='button' "
                    "and .//i[contains(@class,'fa-shopping-bag')] "
                    "and contains(normalize-space(), 'Takeaway')]"
                )
            )
        )

        print("Takeaway option found")

        driver.execute_script(
            "arguments[0].scrollIntoView({block: 'center'});",
            takeaway_button
        )

        driver.execute_script(
            "arguments[0].click();",
            takeaway_button
        )

        print("Takeaway selected")


        # --------------------------------------------------
        # STEP 10: Verify Takeaway Information
        # --------------------------------------------------

        takeaway_info = wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//h6[contains(normalize-space(), "
                    "'Takeaway Information')]"
                )
            )
        )

        print("Takeaway information displayed")

        assert "Takeaway Information" in takeaway_info.text


        # --------------------------------------------------
        # STEP 11: Confirm & Place Order
        # --------------------------------------------------

        place_order_button = wait.until(
            EC.element_to_be_clickable(
                (
                    By.XPATH,
                    "//button[contains(normalize-space(), "
                    "'Confirm & Place Order')]"
                )
            )
        )

        print("Confirm & Place Order button found")

        driver.execute_script(
            "arguments[0].scrollIntoView({block: 'center'});",
            place_order_button
        )

        driver.execute_script(
            "arguments[0].click();",
            place_order_button
        )

        print("Order submitted")


        # --------------------------------------------------
        # STEP 12: Payment Page
        # --------------------------------------------------

        wait.until(
            lambda d: "/payment/" in d.current_url
        )

        print("Payment page opened")

        payment_heading = wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//h2[contains(normalize-space(), "
                    "'Complete Your Payment')]"
                )
            )
        )

        print("Payment heading:", payment_heading.text)

        assert "Complete Your Payment" in payment_heading.text


        # --------------------------------------------------
        # STEP 13: Simulate Payment Success
        # --------------------------------------------------

        pay_button = wait.until(
            EC.presence_of_element_located(
                (
                    By.XPATH,
                    "//button[contains(normalize-space(), "
                    "'Simulate Success')]"
                )
            )
        )

        print("Demo payment button found")

        driver.execute_script(
            "arguments[0].scrollIntoView({block: 'center'});",
            pay_button
        )

        driver.execute_script(
            "arguments[0].click();",
            pay_button
        )

        print("Demo payment submitted")


        # --------------------------------------------------
        # STEP 14: Verify Payment Successful
        # --------------------------------------------------

        payment_success = wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//h4[contains(normalize-space(), "
                    "'Payment Successful!')]"
                )
            )
        )

        print("Payment successful")

        assert "Payment Successful!" in payment_success.text


        # --------------------------------------------------
        # STEP 15: Verify Order Confirmation
        # --------------------------------------------------

        wait.until(
            lambda d: "/order-success/" in d.current_url
        )

        print("Order success page opened")

        order_confirmed = wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//h2[contains(normalize-space(), "
                    "'Order Confirmed!')]"
                )
            )
        )

        print("Order confirmed")

        assert "Order Confirmed!" in order_confirmed.text

        print("==========================================")
        print("CUSTOMER FOOD ORDER TEST PASSED")
        print("Food:", food_name)
        print("Order Type: Takeaway")
        print("Payment: Demo/Simulated Payment")
        print("==========================================")


    finally:

        driver.quit()