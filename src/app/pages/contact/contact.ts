import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css'
})
export class ContactComponent {
  formData = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };

  isSubmitted = false;

  onSubmit(): void {
    if (this.formData.name && this.formData.email && this.formData.subject && this.formData.message) {
      console.log('Feedback submitted:', this.formData);
      this.isSubmitted = true;
      
      // Reset form after a few seconds
      setTimeout(() => {
        this.isSubmitted = false;
        this.formData = {
          name: '',
          email: '',
          subject: '',
          message: ''
        };
      }, 4000);
    }
  }
}
