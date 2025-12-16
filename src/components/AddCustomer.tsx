'use client';


import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { X, ChevronRight } from "lucide-react";

interface AddCustomerProps {
  onClose?: () => void;
  onSubmit?: (data: FormData) => void;
  onSaveAndAddVehicle?: (data: FormData) => void;
}

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  street: string;
  area: string;
  city: string;
  state: string;
}

export function AddCustomer({ onClose, onSubmit, onSaveAndAddVehicle }: AddCustomerProps) {
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    street: "",
    area: "",
    city: "",
    state: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string) => {
    // Pakistani phone format: +92 3XX XXXXXXX or +92 XX XXXXXXX
    // Accepts: +92 300 1234567, +923001234567, 03001234567, etc.
    const cleaned = phone.replace(/\s/g, '');
    // Check if it starts with +92 or 0, then has 10 digits
    if (cleaned.startsWith('+92')) {
      return /^\+92\s?3\d{2}\s?\d{7}$/.test(cleaned);
    } else if (cleaned.startsWith('0')) {
      return /^03\d{2}\s?\d{7}$/.test(cleaned);
    } else if (cleaned.startsWith('92')) {
      return /^923\d{2}\s?\d{7}$/.test(cleaned);
    }
    return false;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePhoneChange = (value: string) => {
    // Auto-format phone number to Pakistani format: +92 3XX XXXXXXX
    let cleaned = value.replace(/\D/g, ''); // Remove all non-digits
    
    // If user types 0 at the start, convert to +92
    if (cleaned.startsWith('0') && cleaned.length > 1) {
      cleaned = '92' + cleaned.substring(1);
    }
    
    // If it doesn't start with 92, add it
    if (cleaned.length > 0 && !cleaned.startsWith('92')) {
      cleaned = '92' + cleaned;
    }
    
    // Limit to 12 digits (92 + 10 digits)
    if (cleaned.length > 12) {
      cleaned = cleaned.substring(0, 12);
    }
    
    let formatted = '';
    
    if (cleaned.length > 0) {
      formatted = '+92';
      
      if (cleaned.length > 2) {
        // Add space after +92
        formatted += ' ';
        // Add first 3 digits (mobile code)
        formatted += cleaned.substring(2, 5);
        
        if (cleaned.length > 5) {
          // Add space and remaining 7 digits
          formatted += ' ' + cleaned.substring(5, 12);
        }
      }
    }
    
    handleInputChange('phone', formatted);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.fullName) newErrors.fullName = "Full name is required";
    if (!formData.email) newErrors.email = "Email is required";
    else if (!validateEmail(formData.email)) newErrors.email = "Invalid email format";
    if (!formData.phone) newErrors.phone = "Phone number is required";
    else if (!validatePhone(formData.phone)) newErrors.phone = "Invalid phone format";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Save customer and show in list when Next is clicked
    // onSubmit saves the customer, refreshes the list, and closes the dialog
    if (onSubmit) {
      await onSubmit(formData);
    } else if (onSaveAndAddVehicle) {
      // Fallback: if only onSaveAndAddVehicle is provided, use it
      await onSaveAndAddVehicle(formData);
    }
    
    // Note: onClose is handled by onSubmit/onSaveAndAddVehicle callbacks
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full">
      {/* Header */}
      <div className="p-6 pb-4 flex items-center justify-between border-b">
        <h2 className="text-lg">Add New Customer</h2>
        {onClose && (
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* Content */}
      <form onSubmit={handleNext}>
        <div className="p-6 space-y-6">
          {/* First Row - Customer Information */}
          <div>
            <h4 className="text-xs uppercase text-gray-500 mb-4">Customer Information</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-xs">Full Name *</Label>
                <Input 
                  id="fullName" 
                  placeholder="John Doe" 
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className={`h-9 text-sm ${errors.fullName ? "border-red-500" : ""}`}
                />
                {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs">Email Address *</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="john@example.com" 
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`h-9 text-sm ${errors.email ? "border-red-500" : ""}`}
                />
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs">Phone Number *</Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  placeholder="+92 300 1234567" 
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  maxLength={16}
                  className={`h-9 text-sm ${errors.phone ? "border-red-500" : ""}`}
                />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>
            </div>
          </div>

          {/* Second Row - Address */}
          <div>
            <h4 className="text-xs uppercase text-gray-500 mb-4">Address</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="street" className="text-xs">Street Address</Label>
                <Input 
                  id="street" 
                  placeholder="123 Main St" 
                  value={formData.street}
                  onChange={(e) => handleInputChange('street', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="area" className="text-xs">Area / Neighborhood</Label>
                <Input 
                  id="area" 
                  placeholder="Soan Garden" 
                  value={formData.area}
                  onChange={(e) => handleInputChange('area', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="text-xs">City</Label>
                <Input 
                  id="city" 
                  placeholder="Islamabad" 
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="state" className="text-xs">State / Province</Label>
                <Input 
                  id="state" 
                  placeholder="Punjab" 
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-0 flex gap-3 justify-end">
          <Button 
            type="submit" 
            className="bg-[#c53032] hover:bg-[#a6212a]"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </form>
    </div>
  );
}
