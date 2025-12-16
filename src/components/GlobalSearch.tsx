import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverAnchor } from "./ui/popover";
import { Command, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator } from "./ui/command";
import { Search, Users, Car, NotebookPen, Wrench, Loader2 } from "lucide-react";
import { customersAPI, vehiclesAPI, invoicesAPI, jobsAPI } from "../api/client";
import { formatInvoiceId, formatJobId } from "../utils/idFormatter";

interface SearchResult {
  type: 'customer' | 'vehicle' | 'invoice' | 'job';
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  navigationPath: string;
}

interface GlobalSearchProps {
  onNavigate: (page: string) => void;
}

export function GlobalSearch({ onNavigate }: GlobalSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If search query is empty, clear results
    if (!searchQuery.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    // Debounce search - wait 300ms after user stops typing
    setLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      await performSearch(searchQuery.trim());
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    if (!query) {
      setResults([]);
      setLoading(false);
      return;
    }

    try {
      const allResults: SearchResult[] = [];

      // Search customers
      try {
        const customersResponse = await customersAPI.getAll(query);
        if (customersResponse.success && customersResponse.data) {
          customersResponse.data.slice(0, 5).forEach((customer: any) => {
            allResults.push({
              type: 'customer',
              id: customer._id || customer.id,
              title: customer.name,
              subtitle: `${customer.phone || ''} ${customer.email ? `• ${customer.email}` : ''}`.trim(),
              icon: Users,
              navigationPath: `/customers`
            });
          });
        }
      } catch (err) {
        console.error("Error searching customers:", err);
      }

      // Search vehicles
      try {
        const vehiclesResponse = await vehiclesAPI.getAll(query);
        if (vehiclesResponse.success && vehiclesResponse.data) {
          vehiclesResponse.data.slice(0, 5).forEach((vehicle: any) => {
            const customerName = typeof vehicle.customer === 'object' ? vehicle.customer?.name : '';
            allResults.push({
              type: 'vehicle',
              id: vehicle._id || vehicle.id,
              title: `${vehicle.make} ${vehicle.model}${vehicle.year ? ` (${vehicle.year})` : ''}`,
              subtitle: `${vehicle.plateNo || ''} ${customerName ? `• ${customerName}` : ''}`.trim(),
              icon: Car,
              navigationPath: `/vehicles`
            });
          });
        }
      } catch (err) {
        console.error("Error searching vehicles:", err);
      }

      // Search invoices
      try {
        const invoicesResponse = await invoicesAPI.getAll(query);
        if (invoicesResponse.success && invoicesResponse.data) {
          invoicesResponse.data.slice(0, 5).forEach((invoice: any) => {
            const invoiceNumber = formatInvoiceId(invoice);
            const customerName = typeof invoice.customer === 'object' ? invoice.customer?.name : '';
            allResults.push({
              type: 'invoice',
              id: invoice._id || invoice.id,
              title: invoiceNumber,
              subtitle: `${customerName || ''} ${invoice.vehicle?.plateNo ? `• ${invoice.vehicle.plateNo}` : ''}`.trim(),
              icon: NotebookPen,
              navigationPath: `/invoices`
            });
          });
        }
      } catch (err) {
        console.error("Error searching invoices:", err);
      }

      // Search job cards
      try {
        const jobsResponse = await jobsAPI.getAll();
        if (jobsResponse.success && jobsResponse.data) {
          // Filter jobs client-side by title, customer name, or vehicle info
          const filteredJobs = jobsResponse.data.filter((job: any) => {
            const searchLower = query.toLowerCase();
            const title = (job.title || '').toLowerCase();
            const customerName = (typeof job.customer === 'object' ? job.customer?.name : '').toLowerCase();
            const vehicleMake = (job.vehicle?.make || '').toLowerCase();
            const vehicleModel = (job.vehicle?.model || '').toLowerCase();
            const jobId = (job._id || job.id).toLowerCase();

            return title.includes(searchLower) ||
                   customerName.includes(searchLower) ||
                   vehicleMake.includes(searchLower) ||
                   vehicleModel.includes(searchLower) ||
                   jobId.includes(searchLower);
          });

          filteredJobs.slice(0, 5).forEach((job: any) => {
            const customerName = typeof job.customer === 'object' ? job.customer?.name : '';
            allResults.push({
              type: 'job',
              id: job._id || job.id,
              title: job.title || formatJobId(job),
              subtitle: `${customerName || ''} ${job.vehicle ? `• ${job.vehicle.make} ${job.vehicle.model}` : ''}`.trim(),
              icon: Wrench,
              navigationPath: `/job-cards`
            });
          });
        }
      } catch (err) {
        console.error("Error searching jobs:", err);
      }

      setResults(allResults);
      setIsOpen(allResults.length > 0);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setSearchQuery("");
    setResults([]);
    setIsOpen(false);
    
    // Navigate directly to the item's detail/profile page using query params
    if (result.type === 'customer') {
      navigate(`/customers?id=${result.id}`);
    } else if (result.type === 'vehicle') {
      navigate(`/vehicles?id=${result.id}`);
    } else if (result.type === 'invoice') {
      navigate(`/invoices?id=${result.id}`);
    } else if (result.type === 'job') {
      navigate(`/job-cards?id=${result.id}`);
    }
  };

  const groupedResults = {
    customers: results.filter(r => r.type === 'customer'),
    vehicles: results.filter(r => r.type === 'vehicle'),
    invoices: results.filter(r => r.type === 'invoice'),
    jobs: results.filter(r => r.type === 'job'),
  };

  return (
    <div className="relative flex-1">
      <Popover open={isOpen && searchQuery.trim().length > 0 && results.length > 0} onOpenChange={(open) => {
        if (!open) {
          setIsOpen(false);
        }
      }}>
        <PopoverAnchor asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
            <Input
              ref={inputRef}
              placeholder="Search customers, vehicles, invoices..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim().length > 0) {
                  setIsOpen(true);
                  // Keep input focused so user can continue typing
                  setTimeout(() => inputRef.current?.focus(), 0);
                } else {
                  setIsOpen(false);
                  setResults([]);
                }
              }}
              onFocus={() => {
                if (results.length > 0 && searchQuery.trim().length > 0) {
                  setIsOpen(true);
                }
              }}
              onKeyDown={(e) => {
                // Prevent popover from closing when typing
                if (e.key !== 'Escape') {
                  e.stopPropagation();
                }
              }}
            />
          </div>
        </PopoverAnchor>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-500">Searching...</span>
              </div>
            ) : results.length === 0 && searchQuery.trim().length > 0 ? (
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-gray-500">
                  No results found for "{searchQuery}"
                </div>
              </CommandEmpty>
            ) : (
              <>
                {groupedResults.customers.length > 0 && (
                  <>
                    <CommandGroup heading="Customers">
                      {groupedResults.customers.map((result) => {
                        const Icon = result.icon;
                        return (
                          <CommandItem
                            key={`customer-${result.id}`}
                            onSelect={() => handleResultClick(result)}
                            className="cursor-pointer"
                          >
                            <Icon className="h-4 w-4 mr-2 text-blue-600" />
                            <div className="flex flex-col">
                              <span className="font-medium">{result.title}</span>
                              {result.subtitle && (
                                <span className="text-xs text-gray-500">{result.subtitle}</span>
                              )}
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                    {(groupedResults.vehicles.length > 0 || groupedResults.invoices.length > 0 || groupedResults.jobs.length > 0) && (
                      <CommandSeparator />
                    )}
                  </>
                )}

                {groupedResults.vehicles.length > 0 && (
                  <>
                    <CommandGroup heading="Vehicles">
                      {groupedResults.vehicles.map((result) => {
                        const Icon = result.icon;
                        return (
                          <CommandItem
                            key={`vehicle-${result.id}`}
                            onSelect={() => handleResultClick(result)}
                            className="cursor-pointer"
                          >
                            <Icon className="h-4 w-4 mr-2 text-green-600" />
                            <div className="flex flex-col">
                              <span className="font-medium">{result.title}</span>
                              {result.subtitle && (
                                <span className="text-xs text-gray-500">{result.subtitle}</span>
                              )}
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                    {(groupedResults.invoices.length > 0 || groupedResults.jobs.length > 0) && (
                      <CommandSeparator />
                    )}
                  </>
                )}

                {groupedResults.invoices.length > 0 && (
                  <>
                    <CommandGroup heading="Invoices">
                      {groupedResults.invoices.map((result) => {
                        const Icon = result.icon;
                        return (
                          <CommandItem
                            key={`invoice-${result.id}`}
                            onSelect={() => handleResultClick(result)}
                            className="cursor-pointer"
                          >
                            <Icon className="h-4 w-4 mr-2 text-purple-600" />
                            <div className="flex flex-col">
                              <span className="font-medium">{result.title}</span>
                              {result.subtitle && (
                                <span className="text-xs text-gray-500">{result.subtitle}</span>
                              )}
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                    {groupedResults.jobs.length > 0 && (
                      <CommandSeparator />
                    )}
                  </>
                )}

                {groupedResults.jobs.length > 0 && (
                  <CommandGroup heading="Job Cards">
                    {groupedResults.jobs.map((result) => {
                      const Icon = result.icon;
                      return (
                        <CommandItem
                          key={`job-${result.id}`}
                          onSelect={() => handleResultClick(result)}
                          className="cursor-pointer"
                        >
                          <Icon className="h-4 w-4 mr-2 text-orange-600" />
                          <div className="flex flex-col">
                            <span className="font-medium">{result.title}</span>
                            {result.subtitle && (
                              <span className="text-xs text-gray-500">{result.subtitle}</span>
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    </div>
  );
}
