/**
 * Utility functions to format IDs with prefixes and incremental numbers
 */

/**
 * Generate a consistent number from an ObjectId string
 * Converts the ObjectId to a number and takes modulo to get a reasonable range
 */
const getIdNumber = (id: string, max: number = 999999): number => {
  if (!id) return 0;
  // Convert ObjectId hex string to a number
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Return a positive number in the range 1-max
  return Math.abs(hash % max) + 1;
};

/**
 * Format customer ID as CUST-001, CUST-002, etc.
 * Uses a hash-based approach to generate consistent numbers from ObjectId
 */
export const formatCustomerId = (customer: any, index?: number): string => {
  // If customer has a customerNumber field, use it
  if (customer?.customerNumber) {
    return `CUST-${String(customer.customerNumber).padStart(6, '0')}`;
  }
  
  // If index is provided, use it (for list displays)
  if (index !== undefined) {
    return `CUST-${String(index + 1).padStart(6, '0')}`;
  }
  
  // Generate a consistent number from ObjectId
  const id = customer?._id || customer?.id || '';
  if (id) {
    const num = getIdNumber(id.toString(), 999999);
    return `CUST-${String(num).padStart(6, '0')}`;
  }
  
  return 'CUST-000000';
};

/**
 * Format vehicle ID as VEH-001, VEH-002, etc.
 */
export const formatVehicleId = (vehicle: any, index?: number): string => {
  if (vehicle?.vehicleNumber) {
    return `VEH-${String(vehicle.vehicleNumber).padStart(6, '0')}`;
  }
  
  if (index !== undefined) {
    return `VEH-${String(index + 1).padStart(6, '0')}`;
  }
  
  const id = vehicle?._id || vehicle?.id || '';
  if (id) {
    const num = getIdNumber(id.toString(), 999999);
    return `VEH-${String(num).padStart(6, '0')}`;
  }
  
  return 'VEH-000000';
};

/**
 * Format job ID as JOB-001, JOB-002, etc.
 */
export const formatJobId = (job: any, index?: number): string => {
  if (job?.jobNumber) {
    return `JOB-${String(job.jobNumber).padStart(6, '0')}`;
  }
  
  if (index !== undefined) {
    return `JOB-${String(index + 1).padStart(6, '0')}`;
  }
  
  const id = job?._id || job?.id || '';
  if (id) {
    const num = getIdNumber(id.toString(), 999999);
    return `JOB-${String(num).padStart(6, '0')}`;
  }
  
  return 'JOB-000000';
};

/**
 * Format invoice ID as [PLATE]-[INITIALS] (e.g., NS-160-SK)
 * Falls back to INV-001 format if plate or customer name is not available
 */
export const formatInvoiceId = (invoice: any, index?: number): string => {
  // Try to generate invoice ID from plate number and customer initials
  const plateNo = invoice?.plate || invoice?.vehicle?.plateNo || invoice?.vehicle?.plate || '';
  const customerName = invoice?.customer?.name || invoice?.customer || '';
  
  if (plateNo && customerName) {
    const initials = customerName.split(' ').map((n: string) => n[0]?.toUpperCase() || '').join('').slice(0, 2);
    if (initials) {
      return `${plateNo}-${initials}`;
    }
  }
  
  // Fallback to old format if plate/customer not available
  if (invoice?.invoiceNumber) {
    return invoice.invoiceNumber;
  }
  
  if (invoice?.invoiceNo) {
    return invoice.invoiceNo;
  }
  
  if (index !== undefined) {
    return `INV-${String(index + 1).padStart(6, '0')}`;
  }
  
  const id = invoice?._id || invoice?.id || '';
  if (id) {
    const num = getIdNumber(id.toString(), 999999);
    return `INV-${String(num).padStart(6, '0')}`;
  }
  
  return 'INV-000000';
};

