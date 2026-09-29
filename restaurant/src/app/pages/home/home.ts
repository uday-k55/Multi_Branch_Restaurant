import { Component, signal, ViewChild, ElementRef, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CarouselComponent } from '../../components/carousel/carousel';
import { AccordionComponent } from '../../components/accordion/accordion';
import { OrderService } from '../../services/order.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CarouselComponent, AccordionComponent],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnDestroy {
  private router = inject(Router);
  private orderService = inject(OrderService);
  private cartService = inject(CartService);

  @ViewChild('scannerVideo') videoRef?: ElementRef<HTMLVideoElement>;

  // QR Scanner Modal State
  isScannerOpen = signal<boolean>(false);
  isCameraLoading = signal<boolean>(false);
  cameraError = signal<string>('');
  permissionDenied = signal<boolean>(false);
  validationError = signal<string>('');
  validatingQr = signal<boolean>(false);
  successMsg = signal<string>('');

  // Fallback manual code input
  manualQrCode = signal<string>('');

  private mediaStream: MediaStream | null = null;
  private scanIntervalId: any = null;

  ngOnDestroy(): void {
    this.stopCamera();
  }

  openQrScanner(): void {
    this.isScannerOpen.set(true);
    this.cameraError.set('');
    this.validationError.set('');
    this.permissionDenied.set(false);
    this.successMsg.set('');
    this.validatingQr.set(false);
    this.manualQrCode.set('');

    this.startCamera();
  }

  closeQrScanner(): void {
    this.stopCamera();
    this.isScannerOpen.set(false);
  }

  async startCamera(): Promise<void> {
    this.isCameraLoading.set(true);
    this.cameraError.set('');
    this.permissionDenied.set(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.isCameraLoading.set(false);
      this.cameraError.set('Camera access is not supported on this browser or connection. You can enter or upload the QR code below.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.isCameraLoading.set(false);

      setTimeout(() => {
        if (this.videoRef && this.videoRef.nativeElement) {
          const video = this.videoRef.nativeElement;
          video.srcObject = this.mediaStream;
          video.play().then(() => {
            this.beginScanningLoop();
          }).catch(() => {
            this.beginScanningLoop();
          });
        }
      }, 300);

    } catch (err: any) {
      this.isCameraLoading.set(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.permissionDenied.set(true);
        this.cameraError.set('Camera permission is required for QR scanning. Please enable camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        this.cameraError.set('No camera found on your device. Please use the manual QR code entry below.');
      } else {
        this.cameraError.set(`Unable to access camera: ${err.message || 'Unknown error'}. You can enter the QR code below.`);
      }
    }
  }

  private stopCamera(): void {
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  private beginScanningLoop(): void {
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
    }

    // Check for native BarcodeDetector API in modern browsers
    const hasBarcodeDetector = 'BarcodeDetector' in window;
    let detector: any = null;
    if (hasBarcodeDetector) {
      try {
        detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) {
        detector = null;
      }
    }

    this.scanIntervalId = setInterval(async () => {
      if (!this.videoRef || !this.videoRef.nativeElement || this.validatingQr()) {
        return;
      }

      const video = this.videoRef.nativeElement;
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return;
      }

      if (detector) {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue) {
              this.handleScannedQr(rawValue);
            }
          }
        } catch (e) {
          // Fall through
        }
      }
    }, 400);
  }

  // Handle uploaded image for QR code
  onImageUploaded(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    const reader = new FileReader();
    reader.onload = async (e) => {
      const img = new Image();
      img.onload = async () => {
        if ('BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(img);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              this.handleScannedQr(barcodes[0].rawValue);
              return;
            }
          } catch (err) {
            // fallback
          }
        }
        // If image detection could not detect automatically, suggest manual entry
        this.validationError.set('Could not detect a restaurant QR code in the uploaded image. Please enter the QR code text.');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  submitManualQr(): void {
    const code = this.manualQrCode().trim();
    if (!code) {
      this.validationError.set('Please enter a valid restaurant QR code.');
      return;
    }
    this.handleScannedQr(code);
  }

  handleScannedQr(rawQr: string): void {
    if (this.validatingQr()) return;

    this.validatingQr.set(true);
    this.validationError.set('');
    this.cameraError.set('');

    let cleanCode = rawQr.trim();
    if (cleanCode.includes('/qr/')) {
      cleanCode = cleanCode.substring(cleanCode.lastIndexOf('/qr/') + 4);
    }

    this.orderService.getTableByQrCode(cleanCode).subscribe({
      next: (tableData) => {
        if (!tableData) {
          this.validatingQr.set(false);
          this.validationError.set('Invalid QR code. This code does not belong to any restaurant table.');
          return;
        }

        // Fetch corresponding branch
        this.orderService.getBranches().subscribe({
          next: (branches) => {
            const matchedBranch = branches.find(b => b.id === tableData.branchId);
            if (matchedBranch) {
              this.stopCamera();
              this.cartService.setBranch(matchedBranch);
              this.cartService.setTable(tableData.id, tableData.tableNumber);
              this.cartService.setOrderType('DINE_IN');

              this.successMsg.set(`Table #${tableData.tableNumber} verified for ${matchedBranch.name}! Redirecting to menu...`);

              setTimeout(() => {
                this.isScannerOpen.set(false);
                this.validatingQr.set(false);
                this.router.navigate(['/menu'], {
                  queryParams: { branchId: matchedBranch.id, qr: 'true' }
                });
              }, 1200);
            } else {
              this.validatingQr.set(false);
              this.validationError.set('Restaurant branch associated with this QR code was not found.');
            }
          },
          error: () => {
            this.validatingQr.set(false);
            this.validationError.set('Unable to verify restaurant branch. Please try again.');
          }
        });
      },
      error: (err) => {
        this.validatingQr.set(false);
        this.validationError.set(err.error?.message || 'Invalid or unrecognized restaurant QR code. Please scan a valid table QR.');
      }
    });
  }
}
