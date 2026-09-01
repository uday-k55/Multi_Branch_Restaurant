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

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'menu', component: MenuComponent },
  { path: 'qr/:qrCode', component: QrOrderComponent },
  { path: 'reservations', component: ReservationsComponent },
  { path: 'my-reservations', component: MyReservationsComponent },
  { path: 'cart', component: CheckoutComponent },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'payment/:paymentId', component: PaymentComponent },
  { path: 'order-success/:id', component: OrderSuccessComponent },
  { path: 'my-orders', component: MyOrdersComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'chef', component: ChefComponent, canActivate: [chefGuard] },
  { path: 'employee', component: EmployeeComponent, canActivate: [employeeGuard] },
  { path: 'about', component: AboutComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
  { path: '**', redirectTo: '' }
];
