import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { AboutComponent } from './pages/about/about';
import { ContactComponent } from './pages/contact/contact';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { AdminComponent } from './pages/admin/admin';
import { MenuComponent } from './pages/menu/menu';
import { CheckoutComponent } from './pages/checkout/checkout';
import { OrderSuccessComponent } from './pages/order-success/order-success';
import { MyOrdersComponent } from './pages/my-orders/my-orders';
import { ChefComponent } from './pages/chef/chef';
import { EmployeeComponent } from './pages/employee/employee';
import { QrOrderComponent } from './pages/qr-order/qr-order';
import { ReservationsComponent } from './pages/reservations/reservations';
import { PaymentComponent } from './pages/payment/payment';
import { ProfileComponent } from './pages/profile/profile';
import { MyReservationsComponent } from './pages/my-reservations/my-reservations';
import { adminGuard } from './guards/admin.guard';
import { chefGuard } from './guards/chef.guard';
import { employeeGuard } from './guards/employee.guard';
import { customerGuard } from './guards/customer.guard';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent, canActivate: [customerGuard] },
  { path: 'menu', component: MenuComponent, canActivate: [customerGuard] },
  { path: 'qr/:qrCode', component: QrOrderComponent, canActivate: [customerGuard] },
  { path: 'reservations', component: ReservationsComponent, canActivate: [customerGuard] },
  { path: 'my-reservations', component: MyReservationsComponent, canActivate: [customerGuard, authGuard] },
  { path: 'cart', component: CheckoutComponent, canActivate: [customerGuard] },
  { path: 'checkout', component: CheckoutComponent, canActivate: [customerGuard] },
  { path: 'payment/:paymentId', component: PaymentComponent, canActivate: [customerGuard] },
  { path: 'order-success/:id', component: OrderSuccessComponent, canActivate: [customerGuard] },
  { path: 'my-orders', component: MyOrdersComponent, canActivate: [customerGuard, authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [customerGuard, authGuard] },
  { path: 'chef', component: ChefComponent, canActivate: [chefGuard] },
  { path: 'employee', component: EmployeeComponent, canActivate: [employeeGuard] },
  { path: 'about', component: AboutComponent, canActivate: [customerGuard] },
  { path: 'contact', component: ContactComponent, canActivate: [customerGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
  { path: '**', redirectTo: '' }
];
