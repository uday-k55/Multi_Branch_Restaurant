import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

declare const L: any;

export interface LocationSelectedResult {
  lat: number;
  lng: number;
  address: string;
  state?: string;
  district?: string;
  pincode?: string;
}

@Component({
  selector: 'app-location-picker-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-picker-modal.html',
  styleUrl: './location-picker-modal.css'
})
export class LocationPickerModalComponent implements OnInit, OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() modalTitle = '🗺️ Choose Location from Map';
  @Input() initialLat: number | null | undefined = null;
  @Input() initialLng: number | null | undefined = null;
  @Input() initialAddress = '';

  @Output() confirmed = new EventEmitter<LocationSelectedResult>();
  @Output() cancelled = new EventEmitter<void>();

  searchQuery = '';
  searching = false;
  searchError = '';

  selectedLat: number = 10.0100;
  selectedLng: number = 76.3600;
  readableAddress = '';
  extractedState = '';
  extractedDistrict = '';
  extractedPincode = '';

  mapId = 'map-picker-' + Math.random().toString(36).substring(2, 9);
  private map: any = null;
  private marker: any = null;

  ngOnInit(): void {
    if (this.initialLat && !isNaN(this.initialLat)) this.selectedLat = this.initialLat;
    if (this.initialLng && !isNaN(this.initialLng)) this.selectedLng = this.initialLng;
    if (this.initialAddress) this.readableAddress = this.initialAddress;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      if (this.initialLat && !isNaN(this.initialLat)) this.selectedLat = this.initialLat;
      if (this.initialLng && !isNaN(this.initialLng)) this.selectedLng = this.initialLng;
      if (this.initialAddress) this.readableAddress = this.initialAddress;

      setTimeout(() => {
        this.initOrRefreshMap();
      }, 200);
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private initOrRefreshMap(): void {
    if (typeof L === 'undefined') {
      console.warn('Leaflet library is not yet loaded.');
      return;
    }

    const container = document.getElementById(this.mapId);
    if (!container) return;

    const customIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%, -100%);">
               <i class="fas fa-map-marker-alt text-danger" style="font-size:32px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.6));"></i>
               <span style="background:#212529;color:#ffc107;font-size:10px;font-weight:bold;padding:1px 6px;border-radius:4px;border:1px solid #ffc107;white-space:nowrap;margin-top:2px;">Selected Pin</span>
             </div>`,
      iconSize: [32, 42],
      iconAnchor: [16, 42]
    });

    if (!this.map) {
      this.map = L.map(container).setView([this.selectedLat, this.selectedLng], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.map);

      this.marker = L.marker([this.selectedLat, this.selectedLng], {
        draggable: true,
        icon: customIcon
      }).addTo(this.map);

      this.marker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        this.onLocationChanged(pos.lat, pos.lng);
      });

      this.map.on('click', (e: any) => {
        this.marker.setLatLng(e.latlng);
        this.onLocationChanged(e.latlng.lat, e.latlng.lng);
      });

      // If initial address is empty, reverse-geocode current coordinates
      if (!this.readableAddress) {
        this.onLocationChanged(this.selectedLat, this.selectedLng);
      }
    } else {
      this.map.invalidateSize();
      this.map.setView([this.selectedLat, this.selectedLng], 14);
      if (this.marker) {
        this.marker.setLatLng([this.selectedLat, this.selectedLng]);
      }
    }
  }

  searchResults: any[] = [];

  searchLocation(): void {
    const query = this.searchQuery.trim();
    if (!query) return;

    this.searching = true;
    this.searchError = '';
    this.searchResults = [];

    const isPincode = /^\d{5,6}$/.test(query);
    let url = '';
    if (isPincode) {
      url = `https://nominatim.openstreetmap.org/search?format=json&postalcode=${query}&countrycodes=in&addressdetails=1&limit=5`;
    } else {
      url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&addressdetails=1&limit=5`;
    }

    fetch(url)
      .then(res => res.json())
      .then((data: any[]) => {
        this.searching = false;
        if (data && data.length > 0) {
          this.searchResults = data;
          this.selectSearchResult(data[0]);
        } else {
          this.searchError = `No locations found for "${query}". Try searching for a nearby area, street, or landmark.`;
        }
      })
      .catch(() => {
        this.searching = false;
        this.searchError = 'Location search service is temporarily unavailable. You can click on the map to place the pin directly.';
      });
  }

  selectSearchResult(item: any): void {
    if (!item) return;
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    this.selectedLat = lat;
    this.selectedLng = lon;
    this.readableAddress = item.display_name || this.searchQuery;
    this.extractDetailsFromAddress(item.address);

    if (this.map && this.marker) {
      this.map.setView([lat, lon], 16);
      this.marker.setLatLng([lat, lon]);
    }
  }

  private onLocationChanged(lat: number, lng: number): void {
    this.selectedLat = lat;
    this.selectedLng = lng;

    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`)
      .then(res => res.json())
      .then(data => {
        if (data && data.display_name) {
          this.readableAddress = data.display_name;
          this.extractDetailsFromAddress(data.address);
        } else {
          this.readableAddress = `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        }
      })
      .catch(() => {
        this.readableAddress = `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      });
  }

  private extractDetailsFromAddress(addr: any): void {
    if (!addr) return;
    this.extractedState = addr.state || '';
    this.extractedDistrict = addr.state_district || addr.county || addr.city || addr.town || addr.district || '';
    this.extractedPincode = addr.postcode || '';
  }

  confirmLocation(): void {
    const finalAddress = this.readableAddress || `Location (${this.selectedLat.toFixed(4)}, ${this.selectedLng.toFixed(4)})`;
    this.confirmed.emit({
      lat: this.selectedLat,
      lng: this.selectedLng,
      address: finalAddress,
      state: this.extractedState,
      district: this.extractedDistrict,
      pincode: this.extractedPincode
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
