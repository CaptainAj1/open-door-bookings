import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import odcLogo from "@/assets/open-door-logo.webp";
import { COUNTRY_OPTIONS, TIME_OPTIONS } from "@/lib/booking-options";

const ROOMS = [
  "Big Room",
  "Game Room",
  "Music Room",
  "Classroom",
  "Small room",
];

const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

type SubmittedBooking = {
  name: string;
  room: string;
  dateLabel: string;
};

const BookingForm = () => {
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("GE");
  const [mobile, setMobile] = useState("");
  const [room, setRoom] = useState("");
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loggedBy, setLoggedBy] = useState("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedBooking, setSubmittedBooking] = useState<SubmittedBooking | null>(null);
  const selectedCountry =
    COUNTRY_OPTIONS.find((option) => option.countryCode === countryCode) ?? COUNTRY_OPTIONS[0];
  const endTimeOptions = TIME_OPTIONS.filter((option) => !startTime || option.value > startTime);

  const resetForm = () => {
    setName("");
    setCountryCode("GE");
    setMobile("");
    setRoom("");
    setDate(undefined);
    setStartTime("");
    setEndTime("");
    setLoggedBy("");
    setIsDatePickerOpen(false);
  };

  const handleDateSelect = (selectedDate?: Date) => {
    setDate(selectedDate);
    if (selectedDate) {
      setIsDatePickerOpen(false);
    }
  };

  const handleStartTimeChange = (value: string) => {
    setStartTime(value);
    if (endTime && endTime <= value) {
      setEndTime("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile || !room || !date || !startTime || !endTime || !loggedBy) {
      toast.error("Please fill in all fields");
      return;
    }
    if (endTime <= startTime) {
      toast.error("End time must be later than start time");
      return;
    }

    if (!GOOGLE_SCRIPT_URL) {
      toast.error("Google Sheets connection is not configured yet");
      return;
    }

    const formattedMobileNumber = `${selectedCountry.dialCode} ${mobile}`.trim();
    const payload = {
      name,
      // Google Sheets can try to parse leading "+" values as formulas during append.
      mobileNumber: formattedMobileNumber.startsWith("+")
        ? `'${formattedMobileNumber}`
        : formattedMobileNumber,
      inventoryType: room,
      bookingDate: format(date, "yyyy-MM-dd"),
      bookingDateLabel: format(date, "PPP"),
      bookingTime: `${startTime} - ${endTime}`,
      bookingLoggedInBy: loggedBy,
      monthTabCandidates: [
        format(date, "MMMM yyyy"),
        format(date, "MMMM"),
      ],
    };

    setIsSubmitting(true);

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Failed to save booking");
      }

      setSubmittedBooking({
        name,
        room,
        dateLabel: format(date, "PPP"),
      });
      resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save booking";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="font-body text-sm font-medium">Name</Label>
          <Input
            id="name"
            placeholder="Enter full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl bg-card shadow-card border-input focus:ring-ring"
          />
        </div>

        {/* Mobile */}
        <div className="space-y-2">
          <Label className="font-body text-sm font-medium">Mobile Number</Label>
          <div className="flex gap-2">
            <Select value={countryCode} onValueChange={setCountryCode}>
              <SelectTrigger className="w-44 rounded-xl bg-card shadow-card">
                <SelectValue>
                  {selectedCountry.flag} {selectedCountry.dialCode}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {COUNTRY_OPTIONS.map((option) => (
                  <SelectItem key={option.countryCode} value={option.countryCode}>
                    {option.flag} {option.name} ({option.dialCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="5X XXX XXXX"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="flex-1 rounded-xl bg-card shadow-card"
            />
          </div>
        </div>

        {/* Room */}
        <div className="space-y-2">
          <Label className="font-body text-sm font-medium">Inventory Type</Label>
          <Select value={room} onValueChange={setRoom}>
            <SelectTrigger className="rounded-xl bg-card shadow-card">
              <SelectValue placeholder="Select a room" />
            </SelectTrigger>
            <SelectContent>
              {ROOMS.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label className="font-body text-sm font-medium">Booking Date</Label>
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal rounded-xl bg-card shadow-card",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Time */}
        <div className="space-y-2">
          <Label className="font-body text-sm font-medium">Booking Time</Label>
          <div className="flex gap-3 items-center">
            <div className="flex-1 space-y-1">
              <span className="text-xs text-muted-foreground font-body">Start Time</span>
              <Select value={startTime} onValueChange={handleStartTimeChange}>
                <SelectTrigger className="rounded-xl bg-card shadow-card">
                  <SelectValue placeholder="Select start time" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {TIME_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="mt-5 text-muted-foreground">to</span>
            <div className="flex-1 space-y-1">
              <span className="text-xs text-muted-foreground font-body">End Time</span>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger className="rounded-xl bg-card shadow-card">
                  <SelectValue placeholder="Select end time" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {endTimeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Logged by */}
        <div className="space-y-2">
          <Label htmlFor="loggedBy" className="font-body text-sm font-medium">Booking Logged In By</Label>
          <Input
            id="loggedBy"
            placeholder="Staff name"
            value={loggedBy}
            onChange={(e) => setLoggedBy(e.target.value)}
            className="rounded-xl bg-card shadow-card"
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl text-base font-body font-semibold h-12 shadow-card hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Submitting..." : "Submit Booking"}
        </Button>
      </form>

      {submittedBooking ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/70 p-4 backdrop-blur-sm">
          <Alert className="w-full max-w-sm border-emerald-200 bg-white text-emerald-900 shadow-2xl">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <AlertTitle>Booking submitted successfully.</AlertTitle>
            <AlertDescription>
              {submittedBooking.room} booked for {submittedBooking.name} on {submittedBooking.dateLabel}.
            </AlertDescription>
            <Button
              type="button"
              className="mt-4 w-full rounded-xl"
              onClick={() => setSubmittedBooking(null)}
            >
              Done
            </Button>
          </Alert>
        </div>
      ) : null}
    </div>
  );
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background font-body">
      <div className="mx-auto max-w-lg px-4 py-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <img src={odcLogo} alt="The Open Door Centre" className="h-20 mb-4 w-auto object-contain" />
          <h1 className="text-3xl font-heading font-light text-primary tracking-wide">
            Room Booking
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Reserve your space at The Open Door Centre</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-card p-6 md:p-8 border border-input">
          <BookingForm />
        </div>
      </div>
    </div>
  );
};

export default Index;
