import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarouselComponent } from '../../components/carousel/carousel';
import { AccordionComponent } from '../../components/accordion/accordion';

interface StateData {
  [stateName: string]: {
    [districtName: string]: string[];
  };
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, CarouselComponent, AccordionComponent],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent {}
