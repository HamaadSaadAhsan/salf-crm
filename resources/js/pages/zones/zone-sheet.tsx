import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { AlertCircle, Check, CheckCircle2, ChevronsUpDown, Globe2, MapPin, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Zone } from './index';

interface ZoneSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    zone?: Zone | null;
}

interface Country {
    id: number;
    name: string;
    code: string;
    iso2: string;
}

interface Province {
    id: number;
    name: string;
    code: string;
    country_id: number;
}

interface City {
    id: number;
    name: string;
    code: string;
    province_id: number;
}

export function ZoneSheet({ open, onOpenChange, zone }: ZoneSheetProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [createMore, setCreateMore] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        country_code: '',
        is_active: true,
    });

    // Location data
    const [countries, setCountries] = useState<Country[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
    const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);
    const [selectedCityIds, setSelectedCityIds] = useState<number[]>([]);
    const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [countryOpen, setCountryOpen] = useState(false);
    const [provinceOpen, setProvinceOpen] = useState(false);
    const [citySearchQuery, setCitySearchQuery] = useState('');
    const [isInitializing, setIsInitializing] = useState(false);

    // New City Dialog
    const [showNewCityDialog, setShowNewCityDialog] = useState(false);
    const [newCityName, setNewCityName] = useState('');
    const [newCityCode, setNewCityCode] = useState('');
    const [isCreatingCity, setIsCreatingCity] = useState(false);
    const [newCityError, setNewCityError] = useState<string | null>(null);

    // Fetch countries on mount
    useEffect(() => {
        fetchCountries();
    }, []);

    // Fetch provinces when country changes
    useEffect(() => {
        if (selectedCountryId) {
            fetchProvinces(selectedCountryId);
        } else {
            setProvinces([]);
            setCities([]);
            if (!isInitializing) {
                setSelectedProvinceId(null);
                setSelectedCityIds([]);
            }
        }
    }, [selectedCountryId]);

    // Fetch cities when province changes
    useEffect(() => {
        if (selectedProvinceId) {
            fetchCities(selectedProvinceId);
        } else {
            setCities([]);
            if (!isInitializing) {
                setSelectedCityIds([]);
            }
        }
    }, [selectedProvinceId]);

    useEffect(() => {
        if (zone && open) {
            setIsInitializing(true);

            setFormData({
                name: zone.name || '',
                code: zone.code || '',
                description: zone.description || '',
                country_code: zone.country_code || '',
                is_active: zone.is_active ?? true,
            });

            if (zone.city_ids && zone.city_ids.length > 0) {
                setSelectedCityIds(zone.city_ids);
            } else {
                setSelectedCityIds([]);
            }

            if (zone.country_id) {
                setSelectedCountryId(zone.country_id);
            }
            if (zone.province_id) {
                setSelectedProvinceId(zone.province_id);
            }

            setTimeout(() => setIsInitializing(false), 100);
        } else if (!zone && open) {
            setFormData({
                name: '',
                code: '',
                description: '',
                country_code: '',
                is_active: true,
            });
            setSelectedCountryId(null);
            setSelectedProvinceId(null);
            setSelectedCityIds([]);
            setIsInitializing(false);
        }
        setError(null);
        setSuccess(null);
    }, [zone, open]);

    const fetchCountries = async () => {
        try {
            const response = await axios.get('/api/countries');
            setCountries(response.data.countries || []);
        } catch (error) {
            console.error('Error fetching countries:', error);
        }
    };

    const fetchProvinces = async (countryId: number) => {
        setIsLoadingProvinces(true);
        try {
            const response = await axios.get(`/api/provinces?country_id=${countryId}`);
            setProvinces(response.data.provinces || []);
        } catch (error) {
            console.error('Error fetching provinces:', error);
            setProvinces([]);
        } finally {
            setIsLoadingProvinces(false);
        }
    };

    const fetchCities = async (provinceId: number) => {
        setIsLoadingCities(true);
        try {
            const response = await axios.get(`/api/cities?province_id=${provinceId}`);
            setCities(response.data.cities || []);
        } catch (error) {
            console.error('Error fetching cities:', error);
            setCities([]);
        } finally {
            setIsLoadingCities(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        const url = zone ? `/zones/${zone.id}` : '/zones';
        const method = zone ? 'patch' : 'post';

        const submitData = {
            ...formData,
            city_ids: selectedCityIds,
        };

        router[method](url, submitData, {
            onSuccess: () => {
                const message = zone ? 'Zone updated successfully!' : 'Zone created successfully!';
                setSuccess(message);

                if (!zone && createMore) {
                    // Reset form but keep country/province selection
                    setFormData({
                        name: '',
                        code: '',
                        description: '',
                        country_code: formData.country_code,
                        is_active: true,
                    });
                    setSelectedCityIds([]);
                    setSuccess(null);
                    setIsLoading(false);
                } else {
                    setTimeout(() => {
                        onOpenChange(false);
                        setSuccess(null);
                        router.reload({ only: ['zones'] });
                    }, 1500);
                }
            },
            onError: (errors: any) => {
                console.error('Zone save error:', errors);
                const errorMessage = errors?.message || errors?.name?.[0] || errors?.code?.[0] || 'Failed to save zone. Please try again.';
                setError(errorMessage);
            },
            onFinish: () => {
                if (!createMore) {
                    setIsLoading(false);
                }
            },
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleCountryChange = (value: string) => {
        const countryId = parseInt(value);
        setIsInitializing(false);
        setSelectedCountryId(countryId);
        setSelectedProvinceId(null);
        setSelectedCityIds([]);
        setCitySearchQuery('');

        const country = countries.find((c) => c.id === countryId);
        if (country) {
            setFormData((prev) => ({
                ...prev,
                country_code: country.iso2,
            }));
        }
    };

    const handleProvinceChange = (value: string) => {
        const provinceId = parseInt(value);
        setIsInitializing(false);
        setSelectedProvinceId(provinceId);
        setSelectedCityIds([]);
        setCitySearchQuery('');
    };

    const handleCityToggle = (cityId: number) => {
        setSelectedCityIds((prev) => (prev.includes(cityId) ? prev.filter((id) => id !== cityId) : [...prev, cityId]));
    };

    const handleSelectAllCities = () => {
        const filteredCities = getFilteredCities();
        const filteredCityIds = filteredCities.map((city) => city.id);
        const allFilteredSelected = filteredCityIds.every((id) => selectedCityIds.includes(id));

        if (allFilteredSelected) {
            setSelectedCityIds((prev) => prev.filter((id) => !filteredCityIds.includes(id)));
        } else {
            setSelectedCityIds((prev) => [...prev.filter((id) => !filteredCityIds.includes(id)), ...filteredCityIds]);
        }
    };

    const getFilteredCities = () => {
        if (!citySearchQuery.trim()) return cities;
        const query = citySearchQuery.toLowerCase().trim();
        return cities.filter((city) => city.name.toLowerCase().includes(query));
    };

    const handleCreateCity = async () => {
        if (!newCityName.trim() || !selectedProvinceId) return;

        setIsCreatingCity(true);
        setNewCityError(null);

        try {
            const response = await axios.post('/cities', {
                name: newCityName.trim(),
                code: newCityCode.trim() || null,
                province_id: selectedProvinceId,
                is_active: true,
            });

            const newCity = response.data.city;

            // Add to cities list and auto-select
            setCities((prev) => [...prev, { id: newCity.id, name: newCity.name, code: newCity.code, province_id: newCity.province_id }]);
            setSelectedCityIds((prev) => [...prev, newCity.id]);

            // Reset dialog
            setNewCityName('');
            setNewCityCode('');
            setShowNewCityDialog(false);
        } catch (error: any) {
            console.error('Error creating city:', error);
            setNewCityError(error.response?.data?.message || error.response?.data?.errors?.name?.[0] || 'Failed to create city');
        } finally {
            setIsCreatingCity(false);
        }
    };

    const handleCancel = () => {
        onOpenChange(false);
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="inset-5 start-auto h-auto rounded-lg p-0 sm:w-[600px] sm:max-w-none [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
                    <SheetHeader className="border-b border-border px-5 py-3.5">
                        <SheetTitle className="flex items-center gap-2.5">
                            <Globe2 className="size-4 text-primary" />
                            {zone ? 'Edit Zone' : 'New Zone'}
                        </SheetTitle>
                        <SheetDescription>
                            {zone ? 'Update the zone details and city assignments.' : 'Create a new zone to organize geographic territories.'}
                        </SheetDescription>
                    </SheetHeader>

                    <SheetBody className="p-0">
                        <ScrollArea className="me-1 h-[calc(100dvh-11.75rem)] pe-2 ps-3">
                            <form id="zone-form" onSubmit={handleSubmit} className="space-y-5 px-2 py-4">
                                {success && (
                                    <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <AlertDescription className="text-green-800 dark:text-green-300">{success}</AlertDescription>
                                    </Alert>
                                )}

                                {error && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}

                                {/* Zone Name & Code */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2 space-y-2">
                                        <Label htmlFor="name">Zone Name</Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            placeholder="e.g., Lahore Zone"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="code">Code</Label>
                                        <Input
                                            id="code"
                                            name="code"
                                            placeholder="e.g., LHR"
                                            value={formData.code}
                                            onChange={handleChange}
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        name="description"
                                        placeholder="Describe this zone's coverage area..."
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows={2}
                                        disabled={isLoading}
                                    />
                                </div>

                                {/* Country & Province */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Country</Label>
                                        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={countryOpen}
                                                    disabled={isLoading}
                                                    className="w-full justify-between font-normal"
                                                >
                                                    {selectedCountryId
                                                        ? countries.find((country) => country.id === selectedCountryId)?.name
                                                        : 'Select country...'}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="z-[150] w-full p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Search country..." />
                                                    <CommandList>
                                                        <CommandEmpty>No country found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {countries.map((country) => (
                                                                <CommandItem
                                                                    key={country.id}
                                                                    value={country.name}
                                                                    onSelect={() => {
                                                                        handleCountryChange(country.id.toString());
                                                                        setCountryOpen(false);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            'mr-2 h-4 w-4',
                                                                            selectedCountryId === country.id ? 'opacity-100' : 'opacity-0',
                                                                        )}
                                                                    />
                                                                    {country.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Province/State</Label>
                                        <Popover open={provinceOpen} onOpenChange={setProvinceOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={provinceOpen}
                                                    disabled={isLoading || !selectedCountryId || isLoadingProvinces}
                                                    className="w-full justify-between font-normal"
                                                >
                                                    {selectedProvinceId
                                                        ? provinces.find((province) => province.id === selectedProvinceId)?.name
                                                        : isLoadingProvinces
                                                          ? 'Loading...'
                                                          : 'Select province...'}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="z-[150] w-full p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Search province..." />
                                                    <CommandList>
                                                        <CommandEmpty>No province found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {provinces.map((province) => (
                                                                <CommandItem
                                                                    key={province.id}
                                                                    value={province.name}
                                                                    onSelect={() => {
                                                                        handleProvinceChange(province.id.toString());
                                                                        setProvinceOpen(false);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            'mr-2 h-4 w-4',
                                                                            selectedProvinceId === province.id ? 'opacity-100' : 'opacity-0',
                                                                        )}
                                                                    />
                                                                    {province.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                {/* Cities Selection */}
                                {selectedProvinceId && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="flex items-center gap-2">
                                                <MapPin className="size-4 text-muted-foreground" />
                                                Cities
                                                {cities.length > 0 && (
                                                    <span className="text-xs text-muted-foreground">({cities.length} available)</span>
                                                )}
                                            </Label>
                                            <div className="flex items-center gap-3">
                                                {cities.length > 0 && (
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id="select-all"
                                                            checked={
                                                                getFilteredCities().length > 0 &&
                                                                getFilteredCities().every((city) => selectedCityIds.includes(city.id))
                                                            }
                                                            onCheckedChange={handleSelectAllCities}
                                                            disabled={isLoading || isLoadingCities}
                                                        />
                                                        <label
                                                            htmlFor="select-all"
                                                            className="cursor-pointer text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                        >
                                                            Select All
                                                        </label>
                                                    </div>
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setShowNewCityDialog(true)}
                                                    disabled={isLoading}
                                                    className="h-7 gap-1 text-xs"
                                                >
                                                    <Plus className="size-3" />
                                                    Add City
                                                </Button>
                                            </div>
                                        </div>

                                        {isLoadingCities ? (
                                            <div className="flex items-center justify-center rounded-lg border border-dashed py-8">
                                                <div className="text-sm text-muted-foreground">Loading cities...</div>
                                            </div>
                                        ) : cities.length > 0 ? (
                                            <>
                                                <div className="relative">
                                                    <Input
                                                        type="text"
                                                        placeholder="Search cities..."
                                                        value={citySearchQuery}
                                                        onChange={(e) => setCitySearchQuery(e.target.value)}
                                                        className="pl-9"
                                                        disabled={isLoading}
                                                    />
                                                    <svg
                                                        className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                                        />
                                                    </svg>
                                                </div>

                                                {selectedCityIds.length > 0 && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                                                            {selectedCityIds.length}
                                                        </div>
                                                        <span className="text-muted-foreground">
                                                            {selectedCityIds.length === 1 ? 'city' : 'cities'} selected
                                                        </span>
                                                    </div>
                                                )}

                                                {getFilteredCities().length > 0 ? (
                                                    <div className="grid max-h-[280px] grid-cols-3 gap-2 overflow-y-auto rounded-lg border bg-muted/30 p-3">
                                                        {getFilteredCities().map((city) => (
                                                            <div
                                                                key={city.id}
                                                                className={cn(
                                                                    'flex cursor-pointer items-center gap-2 rounded-md border bg-background px-2.5 py-2 transition-colors hover:bg-accent',
                                                                    selectedCityIds.includes(city.id) && 'border-primary bg-primary/5',
                                                                )}
                                                                onClick={() => !isLoading && handleCityToggle(city.id)}
                                                            >
                                                                <Checkbox
                                                                    id={`city-${city.id}`}
                                                                    checked={selectedCityIds.includes(city.id)}
                                                                    onCheckedChange={() => handleCityToggle(city.id)}
                                                                    disabled={isLoading}
                                                                    className="pointer-events-none"
                                                                />
                                                                <label
                                                                    className="cursor-pointer truncate text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                                    title={city.name}
                                                                >
                                                                    {city.name}
                                                                </label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                                                        No cities found matching "{citySearchQuery}"
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-8">
                                                <MapPin className="size-8 text-muted-foreground/50" />
                                                <div className="text-center">
                                                    <p className="text-sm font-medium">No cities found</p>
                                                    <p className="text-xs text-muted-foreground">Add cities to this province first</p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setShowNewCityDialog(true)}
                                                    className="gap-1"
                                                >
                                                    <Plus className="size-3" />
                                                    Add First City
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Active Status */}
                                <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="is_active" className="cursor-pointer">
                                            Active Zone
                                        </Label>
                                        <p className="text-xs text-muted-foreground">Enable this zone for lead assignments</p>
                                    </div>
                                    <Switch
                                        id="is_active"
                                        checked={formData.is_active}
                                        onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                                        disabled={isLoading}
                                    />
                                </div>
                            </form>
                        </ScrollArea>
                    </SheetBody>

                    <SheetFooter className="flex items-center justify-between border-t border-border px-5 py-3.5">
                        {!zone && (
                            <div className="flex items-center space-x-2">
                                <Switch id="create-more" size="sm" checked={createMore} onCheckedChange={setCreateMore} />
                                <Label htmlFor="create-more" className="text-xs text-secondary-foreground">
                                    Create more
                                </Label>
                            </div>
                        )}
                        {zone && <div />}

                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button type="submit" form="zone-form" disabled={isLoading}>
                                {isLoading ? 'Saving...' : zone ? 'Save Changes' : 'Create Zone'}
                            </Button>
                        </div>
                    </SheetFooter>
                </SheetContent>

                {/* New City Dialog - nested inside Sheet for proper z-index stacking */}
                <Dialog open={showNewCityDialog} onOpenChange={setShowNewCityDialog}>
                    <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <MapPin className="size-4 text-primary" />
                                Add New City
                            </DialogTitle>
                            <DialogDescription>
                                Add a new city to{' '}
                                <span className="font-medium">{provinces.find((p) => p.id === selectedProvinceId)?.name || 'this province'}</span>. It will
                                be automatically selected for this zone.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            {newCityError && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{newCityError}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="new-city-name">City Name</Label>
                                <Input
                                    id="new-city-name"
                                    placeholder="e.g., Lahore"
                                    value={newCityName}
                                    onChange={(e) => setNewCityName(e.target.value)}
                                    disabled={isCreatingCity}
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="new-city-code">
                                    City Code <span className="text-xs text-muted-foreground">(optional)</span>
                                </Label>
                                <Input
                                    id="new-city-code"
                                    placeholder="e.g., LHR"
                                    value={newCityCode}
                                    onChange={(e) => setNewCityCode(e.target.value)}
                                    disabled={isCreatingCity}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowNewCityDialog(false)} disabled={isCreatingCity}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreateCity} disabled={isCreatingCity || !newCityName.trim()}>
                                {isCreatingCity ? 'Creating...' : 'Add City'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </Sheet>
    );
}
