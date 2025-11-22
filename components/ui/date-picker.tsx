"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { ChangeEvent, ChangeEventHandler } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
      Popover,
      PopoverContent,
      PopoverTrigger,
} from "@/components/ui/popover";
import {
      Select,
      SelectContent,
      SelectItem,
      SelectTrigger,
      SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DatePickerProps {
      date?: Date;
      onDateChange?: (date: Date | undefined) => void;
      placeholder?: string;
      className?: string;
}

export function DatePicker({
      date,
      onDateChange,
      placeholder = "Pick a date",
      className,
}: DatePickerProps) {
      const [month, setMonth] = useState<Date>(date || new Date());

      const handleCalendarChange = (
            value: string | number,
            event: ChangeEventHandler<HTMLSelectElement>
      ) => {
            const newEvent = {
                  target: {
                        value: String(value),
                  },
            } as ChangeEvent<HTMLSelectElement>;
            event(newEvent);
      };

      return (
            <Popover>
                  <PopoverTrigger asChild>
                        <Button
                              className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !date && "text-muted-foreground",
                                    className
                              )}
                              variant="outline"
                        >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {date ? format(date, "PPP") : <span>{placeholder}</span>}
                        </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                        <Calendar
                              captionLayout="dropdown"
                              components={{
                                    MonthCaption: (props: any) => props.children,
                                    DropdownNav: (props: any) => (
                                          <div className="flex w-full items-center gap-2">
                                                {props.children}
                                          </div>
                                    ),
                                    Dropdown: (props: any) => (
                                          <Select
                                                onValueChange={(value) => {
                                                      if (props.onChange) {
                                                            handleCalendarChange(value, props.onChange);
                                                      }
                                                }}
                                                value={String(props.value)}
                                          >
                                                <SelectTrigger className="first:flex-1 last:shrink-0">
                                                      <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                      {props.options?.map((option: any) => (
                                                            <SelectItem
                                                                  disabled={option.disabled}
                                                                  key={option.value}
                                                                  value={String(option.value)}
                                                            >
                                                                  {option.label}
                                                            </SelectItem>
                                                      ))}
                                                </SelectContent>
                                          </Select>
                                    ),
                              }}
                              disabled={{ before: new Date() }}
                              startMonth={new Date()}
                              endMonth={new Date(new Date().setFullYear(new Date().getFullYear() + 10))}
                              hideNavigation
                              mode="single"
                              month={month}
                              onMonthChange={setMonth}
                              onSelect={onDateChange}
                              selected={date}
                        />
                  </PopoverContent>
            </Popover>
      );
}
